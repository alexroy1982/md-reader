import { describe, it, expect } from 'vitest'
import { inlineKatexFonts, buildStandaloneHtml } from './exportHtml'

describe('inlineKatexFonts', () => {
  it('替换已知字体为 data URI', () => {
    const css = '@font-face{src:url(fonts/KaTeX_Main-Regular.woff2)}'
    const out = inlineKatexFonts(css, { 'KaTeX_Main-Regular.woff2': 'data:font/woff2;base64,AAAA' })
    expect(out).toContain('url(data:font/woff2;base64,AAAA)')
    expect(out).not.toContain('fonts/KaTeX_Main-Regular.woff2')
  })
  it('未知字体保留原引用', () => {
    const css = 'src:url(fonts/Other.woff2)'
    expect(inlineKatexFonts(css, {})).toBe(css)
  })
})

describe('buildStandaloneHtml', () => {
  const html = buildStandaloneHtml({
    title: '笔记 <测试>',
    bodyHtml: '<h1 id="a">A</h1>',
    theme: 'dark',
    githubCss: '.markdown-body{color:#000}',
    katexCss: '.katex{font-size:1em}',
    markdownCss: '.math-block{padding:8px}',
    themeCss: ':root{--bg-preview:#fff}',
    katexFonts: {},
  })
  it('包含转义后的标题', () => {
    expect(html).toContain('<title>笔记 &lt;测试&gt;</title>')
  })
  it('内联三份 CSS 与正文', () => {
    expect(html).toContain('.markdown-body{color:#000}')
    expect(html).toContain('.katex{font-size:1em}')
    expect(html).toContain('<h1 id="a">A</h1>')
  })
  it('内联 theme.css 的 CSS 变量', () => {
    expect(html).toContain(':root{--bg-preview:#fff}')
  })
  it('带 data-theme 属性', () => {
    expect(html).toContain('data-theme="dark"')
  })
  it('是完整 HTML 文档', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
  })
})
