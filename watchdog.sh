#!/data/data/com.termux/files/usr/bin/bash
# Watches the bridge: restarts it after 2 failed health checks; re-publishes the link every 6 h.
cd ~/termux-mcp-bridge || exit 1
fails=0; n=0
while true; do
  sleep 60; n=$((n+1))
  LINK=$(cat ~/.bridge_link 2>/dev/null)
  if [ -n "$LINK" ] && curl -s -m 20 -X POST "$LINK" -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"ping"}' | grep -q '"result"'; then
    fails=0
    [ $((n % 360)) -eq 0 ] && [ -s ~/.bridge_topic ] && curl -s -m 15 -d "$LINK" "https://ntfy.sh/$(cat ~/.bridge_topic)" > /dev/null
  else
    fails=$((fails+1))
    if [ $fails -ge 2 ]; then echo "$(date '+%F %T') restart" >> watchdog.log; ./up.sh; fails=0; fi
  fi
  [ -f watchdog.log ] && [ $(wc -l < watchdog.log) -gt 500 ] && tail -n 200 watchdog.log > w.tmp && mv w.tmp watchdog.log
done
