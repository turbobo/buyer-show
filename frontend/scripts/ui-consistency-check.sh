#!/usr/bin/env bash
# 前端一致性静态检查（U32 防漂移 + U36 工具化）
# 用法：bash scripts/ui-consistency-check.sh   （或 npm run check:ui）
# 退出码：0 无 error；1 存在 error（可用于 CI / pre-commit）
set -u
cd "$(dirname "$0")/.." || exit 1
SRC="src"
errors=0
warns=0

section() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
fail() { printf "  \033[31m[ERROR]\033[0m %s\n" "$1"; errors=$((errors + 1)); }
warn() { printf "  \033[33m[WARN]\033[0m  %s\n" "$1"; warns=$((warns + 1)); }

section "1. 裸色值（禁止 bg-[#..]/text-[#..] 等）"
hits=$(grep -rn --include="*.tsx" --include="*.ts" -E "(bg|text|border|shadow|from|to|via)-\[#" "$SRC" | grep -v "node_modules" || true)
if [ -n "$hits" ]; then echo "$hits" | sed 's/^/    /'; fail "发现 $(echo "$hits" | wc -l | tr -d ' ') 处裸色值（改用 DESIGN_THEME token）"; else echo "  未发现 ✓"; fi

section "2. emoji 充当图标（UI 字符串）"
hits=$(find "$SRC" -name "*.tsx" -not -path "*/node_modules/*" -exec perl -ne 'print "$ARGV:$.: $_" if /[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]/ && !m{^\s*(//|\*)}' {} + || true)
if [ -n "$hits" ]; then echo "$hits" | head -10 | sed 's/^/    /'; warns=$((warns + 1)); warn "疑似 emoji 出现（确认非 UI 文案后忽略）"; else echo "  未发现 ✓"; fi

section "3. z-index 越界（仅允许 50 / 55 / 60 / 70 / 100 / 9999）"
hits=$(grep -rn --include="*.tsx" -oE "z-\[[0-9]+\]" "$SRC" | grep -vE "z-\[(50|55|60|70|100|9999)\]" || true)
if [ -n "$hits" ]; then echo "$hits" | sed 's/^/    /'; warn "存在非约定 z-index 值（对照 DESIGN_THEME §4）"; else echo "  未发现 ✓"; fi

section "4. 任意像素值（p-[..px] 等，记 warn；components/ui 原语豁免）"
hits=$(grep -rn --include="*.tsx" -E "(p|px|py|m|mx|my|gap|top|left|right|bottom|w|h)-\[[0-9]+px\]" "$SRC" | grep -v "components/ui/" | grep -v "node_modules" || true)
if [ -n "$hits" ]; then echo "$hits" | head -8 | sed 's/^/    /'; warn "发现 $(echo "$hits" | wc -l | tr -d ' ') 处任意像素值（图片/极特殊尺寸可豁免）"; else echo "  未发现 ✓"; fi

section "5. 自撸遮罩弹窗（新代码应走 ConfirmDialog / Dialog）"
hits=$(grep -rn --include="*.tsx" "fixed inset-0 z-\[60\]" "$SRC" | grep -v "components/ui/" || true)
if [ -n "$hits" ]; then echo "$hits" | sed 's/^/    /'; warn "存在自撸模态 $(echo "$hits" | wc -l | tr -d ' ') 处（存量按迭代替换为 Dialog/ConfirmDialog）"; else echo "  未发现 ✓"; fi

section "6. 图标按钮 aria-label（Button size=\"icon\" 同行缺 aria）"
hits=$(grep -rn --include="*.tsx" 'size="icon"' "$SRC" | grep -v "aria-label" | grep -v "components/ui/" || true)
if [ -n "$hits" ]; then echo "$hits" | head -8 | sed 's/^/    /'; warn "疑似缺少 aria-label 的图标按钮 $(echo "$hits" | wc -l | tr -d ' ') 处（跨行写法请人工确认）"; else echo "  未发现 ✓"; fi

printf "\n\033[1m== 汇总 ==\033[0m\n  error: %s   warn: %s\n" "$errors" "$warns"
if [ "$errors" -gt 0 ]; then echo "  \033[31m存在 ERROR，请修复后重试\033[0m"; exit 1; fi
echo "  通过 ✓"
