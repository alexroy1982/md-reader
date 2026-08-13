import lightCss from 'github-markdown-css/github-markdown-light.css?raw'
import darkCss from 'github-markdown-css/github-markdown-dark.css?raw'
import type { Theme } from '@/types'

const STYLE_ID = 'gh-markdown-theme'

/**
 * 按应用主题注入 github-markdown-css 的 light/dark 变体。
 * 不能用全局 import 的自动版 github-markdown.css：它的 [data-theme='dark']
 * 变量嵌在 @media (prefers-color-scheme: dark) 内，跟随 OS 而非应用主题，
 * OS 浅色 + 应用暗色时正文调色板错乱。
 */
export function applyMarkdownTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = theme === 'dark' ? darkCss : lightCss
}
