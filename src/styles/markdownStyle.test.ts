import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const markdownCss = readFileSync('src/styles/markdown.css', 'utf-8')
const themeCss = readFileSync('src/styles/theme.css', 'utf-8')

describe('Markdown 表格视觉样式', () => {
  it('覆盖 github-markdown-css 并提供完整表格结构样式', () => {
    expect(markdownCss).toContain('html[data-theme] .markdown-body table')
    expect(markdownCss).toContain('border-collapse: separate')
    expect(markdownCss).toContain('border-radius: 9px')
    expect(markdownCss).toContain('table-layout: fixed')
    expect(markdownCss).toContain(':nth-child(4):last-child')
    expect(markdownCss).toContain('html[data-theme] .markdown-body table tbody tr:nth-child(even)')
    expect(markdownCss).toContain('html[data-theme] .markdown-body table tbody tr:hover')
  })

  it('亮暗主题均定义表格语义变量', () => {
    expect(themeCss.match(/--table-header-bg:/g)).toHaveLength(2)
    expect(themeCss.match(/--table-border:/g)).toHaveLength(2)
    expect(themeCss.match(/--table-hover-bg:/g)).toHaveLength(2)
  })

  it('窄窗口支持横向滚动降级', () => {
    expect(markdownCss).toContain('@media (max-width: 760px)')
    expect(markdownCss).toContain('overflow-x: auto')
  })
})

describe('A4 纸张阅读视图', () => {
  it('滚动职责在 .preview-scroll 包装层，纸张本体不自滚动', () => {
    expect(markdownCss).toContain('.preview-scroll')
    expect(markdownCss).toContain('.preview-scroll {')
  })

  it('阅读模式渲染 210mm 纸张卡片，15mm 内边距对应打印页边距', () => {
    expect(markdownCss).toContain('210mm')
    expect(markdownCss).toMatch(/padding:\s*15mm/)
    expect(markdownCss).toContain('var(--bg-paper)')
    expect(markdownCss).toContain('var(--paper-shadow)')
  })

  it('纸张外围是更深的背景色（backdrop）', () => {
    expect(markdownCss).toContain('var(--bg-backdrop)')
  })

  it('打印走 @page A4 + 15mm 页边距，纸张褪卡片化保证所见即打印', () => {
    expect(markdownCss).toContain('size: A4')
    expect(markdownCss).toMatch(/@page[^}]*margin:\s*15mm/)
    const printBlock = markdownCss.slice(markdownCss.indexOf('@media print'))
    expect(printBlock).toContain('box-shadow: none')
    expect(printBlock).toContain('border-radius: 0')
  })

  it('亮暗主题均定义纸张与背景令牌', () => {
    expect(themeCss.match(/--bg-backdrop:/g)).toHaveLength(2)
    expect(themeCss.match(/--bg-paper:/g)).toHaveLength(2)
    expect(themeCss.match(/--paper-shadow:/g)).toHaveLength(2)
  })
})

describe('密集文档排版呼吸感', () => {
  it('正文行距放宽并两端对齐', () => {
    expect(markdownCss).toContain('line-height: 1.72')
    expect(markdownCss).toContain('text-align: justify')
  })

  it('段距拉开、列表项间距增加，列表内段落保持紧凑不被撑爆', () => {
    expect(markdownCss).toMatch(/\.markdown-body p \{[^}]*margin-bottom: 1\.25em/)
    expect(markdownCss).toMatch(/li \+ li \{[^}]*margin-top: \.35em/)
    expect(markdownCss).toMatch(/li > p \{[^}]*margin-bottom: \.45em/)
  })

  it('标题分区间距加大', () => {
    expect(markdownCss).toMatch(/h2,\s*html\[data-theme\] \.markdown-body h3/)
    expect(markdownCss).toContain('margin-top: 1.8em')
  })

  it('行内代码降噪走专用令牌，且不影响代码块内代码', () => {
    expect(markdownCss).toContain(':not(pre) > code')
    expect(markdownCss).toContain('var(--inline-code-bg)')
    expect(themeCss.match(/--inline-code-bg:/g)).toHaveLength(2)
  })

  it('预览内容任何模式下都不超过 A4 宽度（4K 分屏防拉宽），居中显示', () => {
    expect(markdownCss).toMatch(/\.markdown-body \{[^}]*max-width: 210mm/)
    expect(markdownCss).toMatch(/\.markdown-body \{[^}]*margin: 0 auto/)
  })
})
