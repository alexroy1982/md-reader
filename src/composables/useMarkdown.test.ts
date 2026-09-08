import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './useMarkdown'

describe('renderMarkdown GFM', () => {
  it('渲染表格', async () => {
    const { html } = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })
  it('渲染删除线', async () => {
    const { html } = await renderMarkdown('~~gone~~')
    expect(html).toContain('<s>gone</s>')
  })
  it('自动链接', async () => {
    const { html } = await renderMarkdown('see https://example.com now')
    expect(html).toContain('href="https://example.com"')
  })
  it('转义原始 HTML（安全）', async () => {
    const { html } = await renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
  })
})

describe('renderMarkdown 代码高亮', () => {
  it('js 代码块带 hljs class', async () => {
    const { html } = await renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('hljs')
  })
})

describe('renderMarkdown TOC', () => {
  it('返回 toc 数组', async () => {
    const { toc } = await renderMarkdown('# 标题一\n## 小节')
    expect(toc).toEqual([
      { level: 1, text: '标题一', slug: '标题一' },
      { level: 2, text: '小节', slug: '小节' },
    ])
  })
})
