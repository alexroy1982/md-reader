import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { markdownHighlightSpec, markdownHighlightStyle } from './highlight'

const themeCss = readFileSync('src/styles/theme.css', 'utf-8')
const editorSource = readFileSync('src/components/Editor.vue', 'utf-8')

// 只扫样式值字符串（跳过 tag——Tag 对象内部有循环引用）
function collectVars(spec: ReadonlyArray<Record<string, unknown>>): string[] {
  return spec.flatMap((entry) =>
    Object.entries(entry)
      .filter(([k, v]) => k !== 'tag' && typeof v === 'string')
      .flatMap(([, v]) => [...(v as string).matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]))
  )
}

describe('编辑器主题化语法高亮', () => {
  it('自定义高亮样式已定义（可被编辑器挂载）', () => {
    expect(markdownHighlightStyle).toBeTruthy()
  })

  it('配色覆盖 Markdown 主要语法元素（标题/强调/链接/代码/引用/标记）', () => {
    const vars = collectVars(markdownHighlightSpec)
    expect(vars.length).toBeGreaterThanOrEqual(8)
  })

  it('颜色全部引用 --syntax-* 变量，无硬编码色值（切主题自动换配色）', () => {
    const colorValues = markdownHighlightSpec
      .filter((e) => 'color' in e)
      .map((e) => String(e.color))
    expect(colorValues.length).toBeGreaterThanOrEqual(6)
    for (const v of colorValues) {
      expect(v.startsWith('var(--syntax-')).toBe(true)
    }
  })

  it('引用的每个 --syntax-* 变量在亮暗主题均有定义', () => {
    const vars = [...new Set(collectVars(markdownHighlightSpec))]
    expect(vars.length).toBeGreaterThanOrEqual(6)
    for (const v of vars) {
      expect(themeCss.match(new RegExp(`${v}:`, 'g')), `${v} 应在亮暗各定义一次`).toHaveLength(2)
    }
  })

  it('theme.css 提供成套 --syntax-* 调色板', () => {
    const count = [...themeCss.matchAll(/--syntax-[a-z-]+:/g)].length
    expect(count).toBeGreaterThanOrEqual(20) // ≥10 个变量 × 亮暗两套
  })

  it('Editor.vue 挂载自定义高亮并启用围栏代码语言高亮', () => {
    expect(editorSource).not.toContain('defaultHighlightStyle')
    expect(editorSource).toContain('markdownHighlightStyle')
    expect(editorSource).toContain('codeLanguages')
  })
})
