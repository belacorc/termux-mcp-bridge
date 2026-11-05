#!/bin/bash
# Call a bridge tool from any machine. Finds the current link via your ntfy topic automatically.
#   export BRIDGE_TOPIC=pb-xxxxxxxx
#   ./phone.sh phone_status
#   ./phone.sh shell '{"command":"uname -a"}'
set -u
TOPIC="${BRIDGE_TOPIC:?set BRIDGE_TOPIC to your ntfy topic}"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/termux-mcp-bridge.url"
mkdir -p "$(dirname "$CACHE")"
fetch() { curl -s -m 15 "https://ntfy.sh/$TOPIC/json?poll=1&since=24h" | tail -n 1 | python3 -c "import sys,json;print(json.load(sys.stdin).get('message',''))" 2>/dev/null; }
call() { curl -s -m 70 -X POST "$(cat "$CACHE" 2>/dev/null)" -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":${2:-{\}}}}"; }
[ -s "$CACHE" ] || fetch > "$CACHE"
R=$(call "$1" "${2:-}")
if ! echo "$R" | grep -q '"result"'; then fetch > "$CACHE"; R=$(call "$1" "${2:-}"); fi
echo "$R" | python3 -c "import sys,json;r=json.load(sys.stdin);[print(c.get('text','')) for c in r['result']['content']]" 2>/dev/null || { echo "No connection to the phone: ${R:0:300}"; exit 1; }
