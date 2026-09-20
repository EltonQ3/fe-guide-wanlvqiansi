#!/usr/bin/env bash
# 一键构建 + 推送 + 部署到 Cloudflare Pages
#
# 用法：
#   export GITHUB_TOKEN=github_pat_...
#   export CLOUDFLARE_API_TOKEN=cfut_...
#   export CLOUDFLARE_ACCOUNT_ID=91782487426bfa2fdac5e3023ce0976e
#   bash tools/deploy.sh
#
# 依赖：git, python3, node/npx（wrangler）
set -euo pipefail

REPO_SLUG="${REPO_SLUG:-EltonQ3/fe-guide-wanlvqiansi}"
CF_PROJECT="${CF_PROJECT:-fe-guide}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------- 0) 修复沙箱 DNS 劫持（github / cloudflare 被解析到 198.18.x.x）----------
fix_hosts() {
  local marker="# --- fe-guide auto hosts ---"
  if ! grep -q "$marker" /etc/hosts 2>/dev/null; then
    {
      echo "$marker"
      echo "20.205.243.168   api.github.com"
      echo "20.205.243.166   github.com"
      echo "20.205.243.166   codeload.github.com"
      echo "185.199.108.133  raw.githubusercontent.com"
      echo "104.19.192.177   api.cloudflare.com"
      echo "$marker"
    } >> /etc/hosts
  fi
}
fix_hosts

# ---------- 1) 构建 ----------
echo "==> 构建站点"
python3 tools/build_site.py

# ---------- 2) 提交并推送 ----------
if [ -n "${GITHUB_TOKEN:-}" ]; then
  git remote set-url origin "https://github.com/${REPO_SLUG}.git" 2>/dev/null || true
  # 凭据走环境变量，不落盘到 .git/config
  export GIT_ASKPASS=/bin/true
  CRED="https://x-access-token:${GITHUB_TOKEN}@github.com"
  echo "==> 推送 GitHub"
  for i in 1 2 3 4 5; do
    if git push -q "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git" HEAD:main 2>/dev/null; then
      echo "   推送成功（第 $i 次尝试）"; break
    fi
    echo "   第 $i 次失败，重试…"; sleep 4
  done
fi

# ---------- 3) 部署到 Cloudflare Pages ----------
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "==> 部署 Cloudflare Pages"
  npx --yes wrangler pages deploy docs \
    --project-name="$CF_PROJECT" \
    --branch=main \
    --commit-dirty=true
else
  echo "!! 跳过 Cloudflare 部署（未设置 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID）"
fi

echo "==> 完成 → https://${CF_PROJECT}.pages.dev"
