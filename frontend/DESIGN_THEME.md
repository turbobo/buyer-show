# Buyer Show · 前端设计契约（DESIGN_THEME）

> **定位**：前端工程的**机器可读设计契约**与防漂移规则；视觉唯一事实源为 `../UI设计规范文档.md`（v1.3），本文件仅做工具向摘要 + 硬规则声明，冲突时以 UI 设计规范为准并回写本文档。
> **校验**：`npm run check:ui`（裸值/emoji/z-index 静态检查）；提交前与 CI 应通过。

---

## 1. 色彩（唯一来源：`src/index.css` `@theme`）

| Token | 值 | 用途 |
|-------|-----|------|
| `coral` | `#FF6B35` | 品牌主色 / CTA / 选中态 |
| `coral-light` | `#FFF0E8` | 高亮底 / 选中底色 |
| `coral-dark` | `#E55A2B` | 按压 / hover 加深 |
| `coral-contrast` | `#9A3412` | **coral-light 底上的文字**（对比 ≥4.5:1） |
| `warm-bg / warm-100..300` | — | 页面底 / 浅底 / 分隔线 |

语义色走 shadcn 变量：`background / foreground / muted-foreground / card / border / destructive`。
图表色板 `chart-1..5`：珊瑚橙 / 青绿 / 蓝 / 紫 / 暖黄（light/dark 各一档亮度，定义于 index.css）。
**硬规则**：组件内**禁止**裸色值（`bg-[#..]`、`text-[rgb(..)]`、行内 hex 样式色）；状态色使用既有语义/状态 token。

## 2. 间距 / 圆角 / 阴影 / 字体

- 间距：4px 基准（`p-1..p-8`）；**禁止**任意像素值（`p-[13px]` 等，`check:ui` 记 warn，除图片尺寸等确需场景）。
- 圆角：`sm 8 / md 12 / lg 16 / xl 24(rounded-2xl) / full`；阴影：`shadow-sm|md|lg|shadow-coral`。
- 字体：见 UI 规范 §2.3（H1 20/700 … Tiny 10/500）；数字用 `DIN Alternate` 栈。

## 3. 组件原语（必须走 `src/components/ui/`）

| 场景 | 原语 |
|------|------|
| 按钮 | `Button`（variants：default/outline/secondary/ghost/destructive/link；icon 尺寸 `size-11`=44 热区） |
| 确认弹窗 | `ConfirmDialog`（统一遮罩/Esc/焦点；破坏性操作必须使用） |
| 通用弹层 | `Dialog`（标题 + children + 底部操作） |
| 空态 / 加载 / 错误 | `EmptyState` / `LoadingState` / `ErrorState` |
| 反馈 | `useToast()`（全局 `ToastProvider` 已挂载于 main.tsx）；**禁止** window.alert |

**硬规则**：新代码禁止自撸 `fixed inset-0` 遮罩弹窗与自绘空/错/载态；存量按迭代替换。

## 4. 层叠（强制梯度）

页面吸顶 `z-50` < 全局 Header `z-[55]` < 模态 `z-[60]`（ConfirmDialog/Dialog 内置）< 图片预览 `z-[9999]`。**禁止**其他裸值（`check:ui` 扫描 `z-[数字]` 越界项）。

## 5. 图标 / 文案 / 触控

- 图标统一 `lucide-react`；**禁止 emoji 充当图标**（`check:ui` 扫描 UI 字符串）。
- 触控基线：主操作 ≥44（TabBar/导航/CTA/模态按钮）；次级 ≥36–40（chips/排序钮）。
- 图标按钮必须有 `aria-label`；图片必须有 `alt`。

## 6. 动效

微交互 150–300ms；**仅 opacity/transform**；页面容器禁 transform（红线）；`prefers-reduced-motion` 降级已内置。

---

*版本：v1.0 | 2026-09-17 | 随 UI 设计规范文档版本同步（当前对接 v1.3）*
