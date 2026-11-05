#!/data/data/com.termux/files/usr/bin/bash
# Start the bridge. Stop it with: ~/termux-mcp-bridge/stop.sh
cd ~/termux-mcp-bridge || exit 1
termux-wake-lock 2>/dev/null
pkill -f "termux-mcp-bridge/watchdog.sh" 2>/dev/null
echo "Starting bridge..."
if ! ./up.sh; then echo "Tunnel did not come up (see tunnel.log). The watchdog will keep retrying."; fi
nohup bash ~/termux-mcp-bridge/watchdog.sh > /dev/null 2>&1 &
LINK=$(cat ~/.bridge_link 2>/dev/null)
echo; echo "✅ Bridge is running. MCP link:"; echo; echo "$LINK"; echo
[ -s ~/.bridge_topic ] && echo "Link also published to ntfy topic: $(cat ~/.bridge_topic)"
echo "Watchdog is on. Keep this link secret: it gives full shell access to your phone."
