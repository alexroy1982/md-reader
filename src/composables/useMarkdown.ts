import { tocPlugin } from '@/lib/markdown/tocPlugin'
import { taskListsPlugin } from '@/lib/markdown/taskListsPlugin'
import { mermaidPlugin } from '@/lib/markdown/mermaidPlugin'
import type { RenderResult, TocItem } from '@/types'
import type MarkdownIt from 'markdown-it'

// highlight.js 按需注册：全量引入会把语言库打进主包，冷启动多付几百 KB 解析成本
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import diff from 'highlight.js/lib/languages/diff'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('diff', diff)

// 超大文档跳过高亮：逐块高亮的成本远高于解析本身，是卡顿的主要来源
const HIGHLIGHT_LIMIT = 512 * 1024
let highlightEnabled = true

// markdown-it + katex 懒加载：主包不含渲染管线，首个文件打开时才拉起
let mdPromise: Promise<MarkdownIt> | null = null

async function ensureMarkdownIt(): Promise<MarkdownIt> {
  if (!mdPromise) {
    mdPromise = (async () => {
      const [{ default: MarkdownIt }, { katexPlugin }] = await Promise.all([
        import('markdown-it'),
        import('@/lib/markdown/katexPlugin'),
      ])
      const md: MarkdownIt = new MarkdownIt({
        html: false, // 安全：不渲染原始 HTML
        linkify: true,
        breaks: false,
        highlight(str: string, lang: string): string {
          if (!highlightEnabled) return ''
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
      return md
    })()
  }
  return mdPromise
}

export async function renderMarkdown(src: string): Promise<RenderResult> {
  highlightEnabled = src.length <= HIGHLIGHT_LIMIT
  const md = await ensureMarkdownIt()
  const env: { toc?: TocItem[] } = {}
  const html = md.render(src, env)
  return { html, toc: env.toc ?? [] }
}
