#!/usr/bin/env bash
# 一键构建 + 推送 + 部署到 Cloudflare Pages
#
# 在仓库根目录放 .env（不要提交），或事先 export 同名变量：
#   GITHUB_TOKEN=...
#   CLOUDFLARE_API_TOKEN=...
#   CLOUDFLARE_ACCOUNT_ID=...
# 然后：bash tools/deploy.sh
#
# 依赖：git, python3；直传 Pages 还要 node/npx（wrangler）
set -euo pipefail

REPO_SLUG="${REPO_SLUG:-EltonQ3/fe-guide-wanlvqiansi}"
CF_PROJECT="${CF_PROJECT:-fe-guide}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 本机 Node 装在用户目录时，非交互 shell 也要找得到 npx。
if [ -d "$HOME/.local/lib/node/bin" ]; then
  export PATH="$HOME/.local/lib/node/bin:$PATH"
fi

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

echo "==> 凭证"
if [ -n "${GITHUB_TOKEN:-}" ]; then echo "   GITHUB_TOKEN          已设置"; else echo "   GITHUB_TOKEN          未设置（将跳过 git push）"; fi
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then echo "   CLOUDFLARE_API_TOKEN  已设置"; else echo "   CLOUDFLARE_API_TOKEN  未设置"; fi
if [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then echo "   CLOUDFLARE_ACCOUNT_ID 已设置"; else echo "   CLOUDFLARE_ACCOUNT_ID 未设置"; fi

# ---------- 0) 沙箱里 github / cloudflare 偶发被解析到 198.18.x.x。本机写不了 hosts 就跳过。----------
fix_hosts() {
  local marker="# --- fe-guide auto hosts ---"
  if grep -q "$marker" /etc/hosts 2>/dev/null; then
    return 0
  fi
  {
    echo "$marker"
    echo "20.205.243.168   api.github.com"
    echo "20.205.243.166   github.com"
    echo "20.205.243.166   codeload.github.com"
    echo "185.199.108.133  raw.githubusercontent.com"
    echo "104.19.192.177   api.cloudflare.com"
    echo "$marker"
  } >> /etc/hosts 2>/dev/null || echo "!! 跳过 /etc/hosts（本机不需要，或没有写权限）"
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
  pushed=0
  for i in 1 2 3 4 5; do
    if git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git" HEAD:main; then
      echo "   推送成功（第 $i 次尝试）"
      pushed=1
      break
    fi
    echo "   第 $i 次失败，重试…"; sleep 4
  done
  if [ "$pushed" -ne 1 ]; then
    echo "!! GitHub 推送失败" >&2
    exit 1
  fi
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
