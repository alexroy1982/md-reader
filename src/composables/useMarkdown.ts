import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import { tocPlugin } from '@/lib/markdown/tocPlugin'
import { katexPlugin } from '@/lib/markdown/katexPlugin'
import { taskListsPlugin } from '@/lib/markdown/taskListsPlugin'
import { mermaidPlugin } from '@/lib/markdown/mermaidPlugin'
import type { RenderResult, TocItem } from '@/types'

const md: MarkdownIt = new MarkdownIt({
  html: false, // 安全：不渲染原始 HTML
  linkify: true,
  breaks: false,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {
        // fall through：高亮失败时按纯文本转义输出
      }
    }
    return ''
  },
})

md.use(katexPlugin)
md.use(taskListsPlugin)
md.use(mermaidPlugin)
md.use(tocPlugin)

export function renderMarkdown(src: string): RenderResult {
  const env: { toc?: TocItem[] } = {}
  const html = md.render(src, env)
  return { html, toc: env.toc ?? [] }
}
