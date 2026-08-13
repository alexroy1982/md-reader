# MD Reader

本地优先、双击即开的 Markdown 阅读/轻编辑桌面应用（Tauri 2 + Vue 3）。

## 开发

前置：Node 24+、Rust（rustup）、Windows 11（WebView2 已内置）。

```bash
npm install
npm run tauri dev      # 桌面窗口开发模式
npm run dev            # 纯浏览器开发（文件功能不可用）
npm run test           # Vitest 单元测试
```

## 构建

```bash
npm run tauri build    # 产出 NSIS 安装包（src-tauri/target/release/bundle/）
```

## 功能

分屏实时预览 + 同步滚动、目录大纲、明暗主题、GFM、代码高亮、KaTeX 公式、Mermaid 图、
文档内搜索、导出 HTML/PDF、最近文件、多标签、双击 .md 关联打开。
