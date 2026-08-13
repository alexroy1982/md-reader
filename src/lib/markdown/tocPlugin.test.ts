import { describe, it, expect } from 'vitest'
import MarkdownIt from 'markdown-it'
import { tocPlugin, slugify } from './tocPlugin'
import type { TocItem } from '@/types'

function parse(src: string): { html: string; toc: TocItem[] } {
  const md = new MarkdownIt()
  md.use(tocPlugin)
  const env: { toc?: TocItem[] } = {}
  const html = md.render(src, env)
  return { html, toc: env.toc ?? [] }
}

describe('slugify', () => {
  it('转小写、空格转连字符', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('保留中文', () => {
    expect(slugify('第二章 快速上手')).toBe('第二章-快速上手')
  })
  it('去掉标点符号', () => {
    expect(slugify('What is this?')).toBe('what-is-this')
  })
})

describe('tocPlugin', () => {
  it('收集 H1-H3，忽略 H4', () => {
    const { toc } = parse('# A\n## B\n### C\n#### D')
    expect(toc.map((t) => t.text)).toEqual(['A', 'B', 'C'])
    expect(toc.map((t) => t.level)).toEqual([1, 2, 3])
  })
  it('给标题注入 id 锚点', () => {
    const { html } = parse('# Hello World')
    expect(html).toContain('<h1 id="hello-world">')
  })
  it('重复标题 slug 去重加后缀', () => {
    const { toc } = parse('# Intro\n# Intro')
    expect(toc[0].slug).toBe('intro')
    expect(toc[1].slug).toBe('intro-1')
  })
})
