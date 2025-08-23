#!/bin/bash
set -e

echo "🔎 Checking status…"
git status

echo "💾 Adding changes…"
git add -A

# If you want to pass your own message, run: ./deploy.sh "my commit msg"
msg=${1:-"Deploy: $(date '+%Y-%m-%d %H:%M:%S')"}
echo "📝 Commit message: $msg"

git commit -m "$msg" || echo "⚠️ Nothing to commit"

echo "⬆️ Pushing to main…"
git push origin main

echo "✅ Done — Vercel will build & deploy shortly."
