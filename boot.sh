#!/data/data/com.termux/files/usr/bin/bash
# Autostart via Termux:Boot (copied to ~/.termux/boot/ by install.sh)
termux-wake-lock
sleep 30
bash ~/termux-mcp-bridge/start.sh > ~/termux-mcp-bridge/boot.log 2>&1
