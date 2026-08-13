import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/composables/useMarkdown'

describe('taskListsPlugin', () => {
  it('- [ ] 渲染未勾选 checkbox', () => {
    const { html } = renderMarkdown('- [ ] 待办事项')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('task-list-item')
    expect(html).not.toContain('checked')
  })
  it('- [x] 渲染已勾选 checkbox', () => {
    const { html } = renderMarkdown('- [x] 已完成')
    expect(html).toContain('checked')
  })
  it('普通列表不受影响', () => {
    const { html } = renderMarkdown('- 普通项目')
    expect(html).not.toContain('checkbox')
  })
})

describe('mermaidPlugin', () => {
  it('```mermaid 块输出占位符并携带转义源码', () => {
    const { html } = renderMarkdown('```mermaid\ngraph TD\n  A-->B\n```')
    expect(html).toContain('class="mermaid-placeholder"')
    expect(html).toContain('class="mermaid-source"')
    expect(html).toContain('A--&gt;B')
  })
  it('普通代码块仍走 highlight.js', () => {
    const { html } = renderMarkdown('```js\nlet x = 1\n```')
    expect(html).toContain('hljs')
    expect(html).not.toContain('mermaid-placeholder')
  })
  it('源码中的 < 被转义', () => {
    const { html } = renderMarkdown('```mermaid\ngraph TD\n  A["<b>hi</b>"]\n```')
    expect(html).toContain('&lt;b&gt;')
    expect(html).not.toContain('<b>hi</b>')
  })
})
