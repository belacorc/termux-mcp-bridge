#!/data/data/com.termux/files/usr/bin/bash
# Internal: (re)starts the server + tunnel and publishes the new link to your private ntfy topic.
cd ~/termux-mcp-bridge || exit 1
pkill -f "node bridge.mjs" 2>/dev/null; pkill -f "cloudflared tunnel" 2>/dev/null
nohup node bridge.mjs > bridge.log 2>&1 &
for i in $(seq 1 20); do [ -s ~/.bridge_token ] && break; sleep 0.5; done
rm -f tunnel.log
nohup cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8765 > tunnel.log 2>&1 &
URL=""
for i in $(seq 1 60); do URL=$(grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log 2>/dev/null | head -n 1); [ -n "$URL" ] && break; sleep 1; done
[ -z "$URL" ] && exit 1
LINK="$URL/mcp/$(cat ~/.bridge_token)"
echo "$LINK" > ~/.bridge_link
[ -s ~/.bridge_topic ] && curl -s -m 15 -d "$LINK" "https://ntfy.sh/$(cat ~/.bridge_topic)" > /dev/null
echo "$(date '+%F %T') up $URL" >> watchdog.log
exit 0
