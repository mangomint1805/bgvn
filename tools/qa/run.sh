#!/usr/bin/env bash
# Chạy máy chủ tĩnh + máy chủ phòng chơi cục bộ rồi chạy qa.mjs. Dùng: bash tools/qa/run.sh [game…]
cd "$(dirname "$0")/../.." || exit 1
python3 -m http.server 8811 >/dev/null 2>&1 & WEB=$!
(cd server && npx wrangler dev --port 8787 >/tmp/bgvn-wrangler.log 2>&1) & CFP=$!
trap 'kill $WEB $CFP 2>/dev/null; pkill -f "wrangler dev --port 8787" 2>/dev/null' EXIT
for i in $(seq 60); do curl -s localhost:8787/presence >/dev/null && break; sleep 1; done
node tools/qa/qa.mjs "$@"
