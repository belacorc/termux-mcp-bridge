#!/usr/bin/env node
// termux-mcp-bridge: an MCP server that gives an AI assistant access to your Android phone via Termux.
// Zero dependencies. Listens on 127.0.0.1 only; exposed through a cloudflared tunnel on a secret path.
import http from 'node:http';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';

const PORT = +process.env.PORT || 8765;
const HOME = os.homedir();
const tokFile = HOME + '/.bridge_token';
let TOKEN = fs.existsSync(tokFile) ? fs.readFileSync(tokFile, 'utf8').trim() : '';
if (!TOKEN) { TOKEN = crypto.randomBytes(18).toString('base64url'); fs.writeFileSync(tokFile, TOKEN, { mode: 0o600 }); }
const PATH = '/mcp/' + TOKEN;
const SH = process.env.PREFIX ? process.env.PREFIX + '/bin/sh' : '/bin/sh';
const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
const cut = s => (s.length > 20000 ? s.slice(0, 20000) + '\n…[truncated]' : s);

function run(cmd, timeout = 60000) {
  return new Promise(res => exec(cmd, { timeout, maxBuffer: 8 << 20, cwd: HOME, shell: SH }, (err, stdout, stderr) =>
    res({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: String(stdout), err: String(stderr) + (err && err.killed ? '\n[timeout]' : '') })));
}
const fmt = r => cut([r.out.trim(), r.err.trim() && 'stderr: ' + r.err.trim(), r.code ? 'exit code: ' + r.code : ''].filter(Boolean).join('\n') || '(empty, ok)');

const TOOLS = [
  { name: 'shell', description: 'Run an sh command in Termux on the user\'s Android phone. Working dir is the Termux home; shared storage is ~/storage/shared (after termux-setup-storage). pkg, termux-* commands, am and pm are available.',
    inputSchema: { type: 'object', properties: { command: { type: 'string' }, timeout_ms: { type: 'number', description: 'default 60000' } }, required: ['command'] } },
  { name: 'list_apps', description: 'List installed apps (package names). filter = part of the name, e.g. "tele" or "spotify".',
    inputSchema: { type: 'object', properties: { filter: { type: 'string' } } } },
  { name: 'open_app', description: 'Open an app by package name (e.g. org.telegram.messenger). Find names with list_apps.',
    inputSchema: { type: 'object', properties: { package: { type: 'string' } }, required: ['package'] } },
  { name: 'open_url', description: 'Open a URL on the phone (browser or a matching app such as YouTube).',
    inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'notify', description: 'Show a notification on the phone (needs the Termux:API app).',
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } }, required: ['text'] } },
  { name: 'phone_status', description: 'Phone status: battery (level, charging, temperature), Wi-Fi connection, volume.',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'location', description: 'Current phone location (GPS/network): latitude, longitude, accuracy in meters.',
    inputSchema: { type: 'object', properties: { provider: { type: 'string', enum: ['gps', 'network', 'passive'], description: 'default network (faster)' } } } },
  { name: 'clipboard', description: 'Phone clipboard: without text = read, with text = write.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } } } },
  { name: 'speak', description: 'Speak text out loud on the phone (TTS).',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, language: { type: 'string', description: 'e.g. en, ru, cs' } }, required: ['text'] } },
];

async function callTool(name, a) {
  if (name === 'shell') return fmt(await run(String(a.command), Math.min(+a.timeout_ms || 60000, 300000)));
  if (name === 'list_apps') {
    const r = await run('pm list packages -3 2>/dev/null || cmd package list packages -3');
    let list = r.out.split('\n').map(s => s.replace(/^package:/, '').trim()).filter(Boolean).sort();
    if (a.filter) list = list.filter(p => p.toLowerCase().includes(String(a.filter).toLowerCase()));
    return list.length ? list.join('\n') : 'Nothing found. ' + fmt(r);
  }
  if (name === 'open_app') {
    const p = String(a.package);
    if (!/^[A-Za-z0-9._]+$/.test(p)) throw new Error('invalid package name');
    const res = await run(`cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ${p} 2>/dev/null | tail -n 1`);
    const comp = res.out.trim();
    let r = comp.includes('/') ? await run(`am start -n ${q(comp)}`) : { code: 1, out: '', err: '' };
    if (r.code || /Error/i.test(r.out + r.err)) r = await run(`am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p ${p}`);
    return 'Launch ' + p + ':\n' + fmt(r);
  }
  if (name === 'open_url') {
    const u = String(a.url);
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) throw new Error('need a full URL, e.g. https://...');
    return fmt(await run(`termux-open-url ${q(u)}`));
  }
  if (name === 'notify') return fmt(await run(`termux-notification --title ${q(a.title || 'Notion AI')} --content ${q(a.text)}`));
  if (name === 'phone_status') {
    const [b, w, v] = await Promise.all([run('timeout 15 termux-battery-status'), run('timeout 15 termux-wifi-connectioninfo'), run('timeout 15 termux-volume')]);
    return cut('Battery:\n' + fmt(b) + '\n\nWi-Fi:\n' + fmt(w) + '\n\nVolume:\n' + fmt(v));
  }
  if (name === 'location') {
    const p = ['gps', 'network', 'passive'].includes(a.provider) ? a.provider : 'network';
    return fmt(await run(`timeout 60 termux-location -p ${p} -r once`, 70000));
  }
  if (name === 'clipboard') {
    if (a.text === undefined) return fmt(await run('timeout 15 termux-clipboard-get'));
    return fmt(await run(`printf %s ${q(a.text)} | timeout 15 termux-clipboard-set`));
  }
  if (name === 'speak') {
    const l = /^[a-z]{2}(-[A-Z]{2})?$/.test(a.language || '') ? ` -l ${a.language}` : '';
    return fmt(await run(`timeout 60 termux-tts-speak${l} ${q(a.text)}`, 70000));
  }
  throw new Error('unknown tool: ' + name);
}

const VERS = ['2024-11-05', '2025-03-26', '2025-06-18'];
async function handle(m) {
  const { id, method, params } = m || {};
  const ok = result => ({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') return ok({ protocolVersion: VERS.includes(params?.protocolVersion) ? params.protocolVersion : '2025-03-26',
    capabilities: { tools: {} }, serverInfo: { name: 'termux-mcp-bridge', version: '1.1.0' },
    instructions: 'Access to the user\'s Android phone via Termux: shell, apps, URLs, notifications, battery/Wi-Fi, location, clipboard, text-to-speech.' });
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: TOOLS });
  if (method === 'tools/call') {
    console.log(new Date().toISOString(), 'call', params?.name);
    try { return ok({ content: [{ type: 'text', text: await callTool(params?.name, params?.arguments || {}) }] }); }
    catch (e) { return ok({ content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true }); }
  }
  if (id === undefined || id === null) return null;
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== PATH) { res.writeHead(404); return res.end('not found'); }
  if (req.method === 'DELETE') { res.writeHead(200); return res.end(); }
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }); return res.end(); }
  let body = ''; for await (const c of req) body += c;
  let msg; try { msg = JSON.parse(body); } catch { res.writeHead(400); return res.end('bad json'); }
  const batch = Array.isArray(msg);
  const out = (await Promise.all((batch ? msg : [msg]).map(handle))).filter(Boolean);
  if (!out.length) { res.writeHead(202); return res.end(); }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(batch ? out : out[0]));
}).listen(PORT, '127.0.0.1', () => console.log('bridge ready on 127.0.0.1:' + PORT));
