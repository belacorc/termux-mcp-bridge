#!/data/data/com.termux/files/usr/bin/bash
pkill -f "termux-mcp-bridge/watchdog.sh"; pkill -f "node bridge.mjs"; pkill -f "cloudflared tunnel"; termux-wake-unlock 2>/dev/null
echo "Bridge stopped 👋"
