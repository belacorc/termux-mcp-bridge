#!/data/data/com.termux/files/usr/bin/bash
# One-line installer:
#   curl -fsSL https://raw.githubusercontent.com/belacorc/termux-mcp-bridge/main/install.sh | bash
set -e
REPO="https://raw.githubusercontent.com/belacorc/termux-mcp-bridge/main"
DIR=~/termux-mcp-bridge
echo "📦 Installing packages (nodejs, cloudflared, termux-api)..."
export DEBIAN_FRONTEND=noninteractive
pkg update -y >/dev/null 2>&1 || true
pkg install -y -o Dpkg::Options::=--force-confnew nodejs cloudflared termux-api curl >/dev/null 2>&1 || true
for p in node cloudflared curl; do command -v $p >/dev/null || { echo "❌ $p failed to install. Try: termux-change-repo, then run the installer again."; exit 1; }; done
echo "📁 Downloading files..."
mkdir -p "$DIR"
for f in bridge.mjs up.sh watchdog.sh start.sh stop.sh boot.sh; do curl -fsSL "$REPO/$f" -o "$DIR/$f"; done
chmod +x "$DIR"/*.sh
if [ ! -s ~/.bridge_topic ]; then
  echo "pb-$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)" > ~/.bridge_topic
  chmod 600 ~/.bridge_topic
fi
mkdir -p ~/.termux/boot && cp "$DIR/boot.sh" ~/.termux/boot/start-termux-mcp-bridge && chmod +x ~/.termux/boot/start-termux-mcp-bridge
echo; echo "✅ Installed. Your private ntfy topic: $(cat ~/.bridge_topic)"
echo "   (give it to your AI client so it can always find the current link)"
command -v termux-battery-status >/dev/null || true
pm list packages 2>/dev/null | grep -q com.termux.api || echo "ℹ️  Install the Termux:API app (F-Droid) for notifications, battery, location, clipboard, TTS."
pm list packages 2>/dev/null | grep -q com.termux.boot || echo "ℹ️  Install Termux:Boot (F-Droid) and open it once for autostart after reboot."
echo; bash "$DIR/start.sh"
