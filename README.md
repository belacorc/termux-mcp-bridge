# 📱 termux-mcp-bridge

**Give your AI assistant hands on your Android phone.**
A tiny, zero-dependency [MCP](https://modelcontextprotocol.io) server that runs in [Termux](https://termux.dev) and lets AI clients like Claude, ChatGPT or Notion AI run commands, open apps, send notifications, read battery and location, and more. No root, no ADB, no PC needed.

```
AI client ──HTTPS──▶ Cloudflare quick tunnel ──▶ 127.0.0.1:8765 (Termux) ──▶ your phone
                         (secret URL path)
```

## ✨ Features

- **One-line install.** Nothing to configure and no accounts to create.
- **No port forwarding.** Uses a free Cloudflare quick tunnel, so it works on mobile data and any Wi-Fi.
- **Self-healing.** A watchdog restarts the server and tunnel when the connection drops.
- **Never copy links again.** Each new tunnel URL is published to your private [ntfy](https://ntfy.sh) topic, so your AI client always finds the current one.
- **Autostart after reboot** via Termux:Boot.
- **Zero npm dependencies.** About 120 lines of plain Node.js.

## 🛠 Tools

| Tool | What it does |
|---|---|
| `shell` | Run any shell command in Termux |
| `list_apps` | List installed apps (with filter) |
| `open_app` | Launch an app by package name |
| `open_url` | Open a link in the browser or a matching app |
| `notify` | Show a notification |
| `phone_status` | Battery, charging, temperature, Wi-Fi, volume |
| `location` | GPS / network location |
| `clipboard` | Read or write the clipboard |
| `speak` | Text-to-speech out loud |

## 🚀 Install

1. Install from **F-Droid** (not Google Play):
   - [Termux](https://f-droid.org/packages/com.termux/)
   - [Termux:API](https://f-droid.org/packages/com.termux.api/): needed for notify, battery, location, clipboard, TTS
   - [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) *(optional)*: autostart. Open it once after installing.
2. In Termux run:

```bash
curl -fsSL https://raw.githubusercontent.com/belacorc/termux-mcp-bridge/main/install.sh | bash
```

The installer prints your **MCP link** and your **private ntfy topic**.

3. Add the link to your AI client as a remote MCP server (Streamable HTTP), for example:

```json
{ "mcpServers": { "phone": { "url": "https://xxxx.trycloudflare.com/mcp/<token>" } } }
```

## 🔁 Daily use

```bash
~/termux-mcp-bridge/start.sh   # start (also runs automatically on boot)
~/termux-mcp-bridge/stop.sh    # stop
```

Quick tunnel URLs change on every restart. To always get the current one:

```bash
curl -s "https://ntfy.sh/<your-topic>/json?poll=1&since=24h" | tail -n 1
```

Or use the helper from [`client/phone.sh`](client/phone.sh):

```bash
export BRIDGE_TOPIC=pb-xxxxxxxx
./client/phone.sh phone_status
./client/phone.sh shell '{"command":"uname -a"}'
```

## 🔒 Security

> ⚠️ **The MCP link = full shell access to your Termux.** Treat it like a password.

- The server listens on `127.0.0.1` only. The outside world reaches it only through the tunnel, and only on the secret path `/mcp/<random 144-bit token>`. Every other path returns 404.
- The token is stored in `~/.bridge_token`. Delete that file and restart to rotate it.
- The ntfy topic name is random and acts as a secret too. Anyone who knows it can read your current link, so don't share it.
- Run `stop.sh` when you don't need the bridge.

## 🧩 Files

| File | Purpose |
|---|---|
| `bridge.mjs` | The MCP server (JSON-RPC over HTTP) |
| `up.sh` | Starts server + tunnel, publishes link |
| `watchdog.sh` | Health check every 60 s, auto-restart |
| `start.sh` / `stop.sh` | Start / stop everything |
| `boot.sh` | Termux:Boot autostart script |
| `install.sh` | One-line installer |
| `client/phone.sh` | Call tools from any machine via ntfy lookup |

## 📄 License

MIT © belacorc
