# KaTeX 公式 + Mermaid 图表并入 v1 — 设计文档

> **日期**：2026-08-13
> **状态**：已获用户批准
> **上游文档**：《PRD-Markdown阅读器.md》v1.0（本设计为其范围扩展）
> **方案**：经对比选定「方案 A：markdown-it 插件链 + Mermaid 异步后渲染」

---

## 1. 背景与范围

原 PRD 将数学公式与 Mermaid 图表列为 v2 展望 / v1 非目标。经与用户确认：

- 两项功能**直接并入 v1**，与原有 11 项功能同期开发交付。
- 公式定界符：行内 `$...$`、块级 `$$...$$`（Typora / VS Code / Obsidian 相同约定）；不支持 `\(\)` `\[\]`。
- Mermaid 渲染失败时：显示错误提示条（含 mermaid 报错信息）+ 保留源码。
- 渲染管线从第一天就按可扩展插件链设计，避免后期改造。

## 2. 渲染管线架构

```
Markdown 源码
  └─ markdown-it 核心（GFM：表格 / 删除线 / 任务列表 / 自动链接）
      ├─ KaTeX 插件（$...$ 行内 / $$...$$ 块级规则）
      │     → 解析期同步渲染为 HTML（katex.renderToString）
      ├─ 自定义 mermaid fence 规则
      │     → ```mermaid 块 → 占位 <div class="mermaid-block">（携带原文）
      ├─ highlight.js（普通代码块高亮；mermaid 块跳过高亮）
      └─ anchor + TOC 插件（H1-H3 锚点 id）
            ↓ HTML 字符串
  Preview.vue（v-html）
            ↓ nextTick
  Mermaid 后渲染：异步替换占位符为 SVG（动态 import('mermaid') 懒加载）
```

**职责划分原则**：

- **KaTeX 走解析期**：同步渲染、无闪烁；公式进入 HTML 字符串，导出 HTML / 打印 PDF 链路零改动。
- **Mermaid 走挂载后**：库体积大（~2MB）必须懒加载；渲染结果为 SVG 留在 DOM 中，导出 HTML 同样天然兼容。

## 3. 模块改动清单

| 模块 | 改动 |
|------|------|
| `src/composables/useMarkdown.ts` | 注册 KaTeX 规则 + mermaid fence 规则 |
| `src/composables/useMermaid.ts`（新增） | 懒加载、渲染、SVG 缓存、取消令牌、主题重渲染、错误处理 |
| `src/components/Preview.vue` | 渲染后调用 useMermaid；与 150ms 输入防抖协调 |
| `src/styles/markdown.css` | 公式显示样式、mermaid 容器样式、错误条样式 |
| `package.json` 新增依赖 | `katex`（含本地 woff2 字体，~300KB）、markdown-it 的 katex 插件、`mermaid`（仅动态 import，不进主包） |
| `src-tauri/` | 零改动 |

**公式插件选型**：首选维护良好的现成 markdown-it katex 插件（已处理 `\$` 转义、货币 `$` 误匹配等边界）；评估质量不达标时自写规则（~100 行，直接调 `katex.renderToString`）。

**编辑区行为**：公式与 mermaid 在 CodeMirror 编辑区内保持纯文本（原生 markdown 高亮），仅预览区渲染。

## 4. 关键数据流

### 4.1 输入 → 预览

输入 → 150ms 防抖 → markdown-it render → v-html 更新 → nextTick → mermaid 渲染。

### 4.2 渲染取消（renderToken）

每次触发 mermaid 渲染生成递增 token；异步渲染完成时若 token 已过期（期间有新输入），丢弃结果。避免快速编辑时过期 SVG 覆盖新内容、或重复渲染大图卡顿。

### 4.3 SVG 缓存

每个 mermaid 块按「块内容 hash + 当前主题」为 key 缓存渲染结果 SVG。每次输入防抖触发的全量重渲染中，内容未变的图直接复用缓存 SVG，不重复调用 mermaid。**此为必须项**，否则每次击键都重渲染全部图。

### 4.4 主题联动

切换明暗主题 → `mermaid.initialize({ theme: 'default' | 'dark' })` → 全量重渲染（缓存 key 含主题，自动失效）。

### 4.5 并发限制

单文档含多个 mermaid 图时，渲染并发上限 2，避免打开大文档时主线程拥堵。

## 5. 错误处理

| 场景 | 行为 |
|------|------|
| 公式语法错误 | `katex.renderToString` 使用 `throwOnError: false`，渲染为红色错误文本，不打断其他内容 |
| Mermaid 语法错误 | 占位符替换为错误提示条（含 mermaid 报错信息）+ 保留源码，其余内容不受影响 |
| mermaid chunk 加载失败 | 占位符降级为普通代码块显示 |
| 渲染管线整体异常 | render 用 try/catch 包裹，失败时保留上一帧预览内容，绝不白屏 |

## 6. PRD 变更

- 「1.3 非目标」移除：数学公式、Mermaid 图表。
- 「4. 功能需求」新增：
  - **F12 数学公式（✅）**：行内 `$...$`、块级 `$$...$$`，KaTeX 渲染；语法错误红色提示不崩溃。
  - **F13 Mermaid 图表（✅）**：` ```mermaid ` 代码块渲染为 SVG 图；语法错误显示错误条 + 源码；主题跟随应用明暗。
- 「8. v2 展望」移除：数学公式（KaTeX）、Mermaid 图表。
- 「9. 验收标准」追加：
  11. ✅ 文档含 `$` / `$$` 公式 → 正确渲染；公式语法错误显示红色提示且不崩溃。
  12. ✅ ` ```mermaid ` 代码块 → 渲染为图；语法错误显示错误条 + 保留源码。
  13. ✅ 明暗主题切换 → mermaid 图主题跟随。
  14. ✅ 导出的 HTML 中公式与 mermaid 图正确显示。
  15. ✅ 不含 mermaid 的文档不加载 mermaid chunk（DevTools 网络面板验证），保障 <15MB 安装包与 <2s 冷启动指标不被侵蚀。
- 非功能指标（<15MB 安装包、<2s 冷启动、<100ms 渲染）**不变**，由懒加载与 SVG 缓存保障。

## 7. 测试策略

- **Vitest 单测**：
  - useMarkdown 插件链输出：公式 HTML、mermaid 占位符、GFM 特性不回归；
  - TOC 生成不受公式/mermaid 块影响；
  - SVG 缓存 hash 逻辑（内容变 → 重渲染；仅主题变 → 重渲染；都不变 → 复用）；
  - mermaid 错误处理（mock mermaid 库，不真渲染）。
- **手动验收**：按 PRD 第 9 节原 10 条 + 本设计追加的 5 条逐项过。

## 8. 明确不做（本次范围外）

- `\(\)` / `\[\]` LaTeX 原生定界符
- Mermaid 图的缩放 / 全屏查看 / 导出 PNG 等交互增强
- 编辑区内公式 / mermaid 的实时内嵌渲染（CodeMirror 装饰）
- KaTeX 扩展宏配置 UI
