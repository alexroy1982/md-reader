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
