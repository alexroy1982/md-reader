import type MarkdownIt from 'markdown-it'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type { TocItem } from '@/types'

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

export function tocPlugin(md: MarkdownIt): void {
  md.core.ruler.push('toc_collect', (state: StateCore) => {
    const env = state.env as { toc?: TocItem[] }
    const toc: TocItem[] = []
    const seen = new Map<string, number>()
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type !== 'heading_open') continue
      if (t.tag !== 'h1' && t.tag !== 'h2' && t.tag !== 'h3') continue
      const inline = tokens[i + 1]
      const text = inline && inline.type === 'inline' ? inline.content : ''
      const base = slugify(text) || 'section'
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      const slug = n === 0 ? base : `${base}-${n}`
      t.attrSet('id', slug)
      toc.push({ level: Number(t.tag[1]) as 1 | 2 | 3, text, slug })
    }
    env.toc = toc
    return false
  })
}
