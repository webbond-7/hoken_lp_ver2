#!/usr/bin/env bash
# ローカルプレビュー（静的ファイル配信）
cd "$(dirname "$0")"
PORT="${PORT:-8765}"
echo "→ http://localhost:${PORT}/"
echo "   停止: Ctrl+C"
exec python3 -m http.server "$PORT"
