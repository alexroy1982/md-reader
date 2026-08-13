import type { Theme } from '@/types'

export interface ExportData {
  title: string
  bodyHtml: string
  theme: Theme
  githubCss: string
  katexCss: string
  markdownCss: string
  themeCss: string
  katexFonts: Record<string, string> // 文件名 → data URI
}

export function inlineKatexFonts(css: string, fonts: Record<string, string>): string {
  return css.replace(/url\((['"]?)fonts\/([^'")]+)\1\)/g, (match, _q: string, file: string) => {
    const data = fonts[file]
    return data ? `url(${data})` : match
  })
}

function escapeTitle(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildStandaloneHtml(data: ExportData): string {
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${data.theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeTitle(data.title)}</title>
<style>${data.githubCss}</style>
<style>${inlineKatexFonts(data.katexCss, data.katexFonts)}</style>
<style>${data.themeCss}</style>
<style>${data.markdownCss}</style>
</head>
<body>
<main class="markdown-body" style="max-width:900px;margin:0 auto;padding:24px 32px;">
${data.bodyHtml}
</main>
</body>
</html>`
}
