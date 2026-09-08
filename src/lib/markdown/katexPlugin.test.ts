import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/composables/useMarkdown'

describe('katexPlugin 行内公式', () => {
  it('$E=mc^2$ 渲染为 span.math-inline', async () => {
    const { html } = await renderMarkdown('质能方程 $E=mc^2$ 著名')
    expect(html).toContain('class="math math-inline"')
    expect(html).toContain('katex')
  })
  it('货币 $5 和 $6 不误判（$ 后/前是空格）', async () => {
    const { html } = await renderMarkdown('苹果 $5 和香蕉 $6 各一斤')
    expect(html).not.toContain('math-inline')
  })
  it('转义 \\$ 不触发公式', async () => {
    const { html } = await renderMarkdown('价格 \\$100 元')
    expect(html).not.toContain('math-inline')
  })
  it('公式语法错误渲染红色错误而非崩溃', async () => {
    const { html } = await renderMarkdown('$\\frac{1$')
    expect(html).toContain('katex-error')
  })
})

describe('katexPlugin 块级公式', () => {
  it('多行 $$ 块渲染为 div.math-block', async () => {
    const { html } = await renderMarkdown('$$\nE = mc^2\n$$')
    expect(html).toContain('class="math math-block"')
  })
  it('独占一行的 $$x^2$$ 渲染为块级', async () => {
    const { html } = await renderMarkdown('$$x^2 + y^2 = z^2$$')
    expect(html).toContain('math-block')
  })
  it('空块级公式 $$$$ 不渲染', async () => {
    const { html } = await renderMarkdown('$$$$')
    expect(html).not.toContain('math-block')
  })
  it('空多行块级公式不渲染', async () => {
    const { html } = await renderMarkdown('$$\n\n$$')
    expect(html).not.toContain('math-block')
  })
})
