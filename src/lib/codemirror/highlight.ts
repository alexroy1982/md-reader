import { tags as t } from '@lezer/highlight'
import { HighlightStyle } from '@codemirror/language'

/**
 * 主题化 Markdown 语法高亮：颜色全部引用 theme.css 的 --syntax-* 变量，
 * 亮/暗主题切换时配色自动跟随（纯 CSS 变量解析，无需 JS 重建编辑器）。
 * 标签映射对应 @lezer/markdown 的 styleTags：
 * processingInstruction = 各类标记符（#、**、-、>、```），labelName = 围栏语言名/链接标签。
 */
export const markdownHighlightSpec = [
  { tag: t.heading, color: 'var(--syntax-heading)', fontWeight: '700' },
  { tag: t.strong, color: 'var(--syntax-strong)', fontWeight: '700' },
  { tag: t.emphasis, color: 'var(--syntax-emphasis)', fontStyle: 'italic' },
  { tag: t.strikethrough, color: 'var(--syntax-separator)', textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--syntax-link)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--syntax-url)' },
  { tag: t.monospace, color: 'var(--syntax-code)' },
  { tag: t.quote, color: 'var(--syntax-quote)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--syntax-list)' },
  { tag: t.contentSeparator, color: 'var(--syntax-separator)', fontWeight: '700' },
  { tag: t.processingInstruction, color: 'var(--syntax-marker)' },
  { tag: t.labelName, color: 'var(--syntax-label)' },
  { tag: t.escape, color: 'var(--syntax-escape)' },
  { tag: t.character, color: 'var(--syntax-escape)' },
]

export const markdownHighlightStyle = HighlightStyle.define(markdownHighlightSpec)
