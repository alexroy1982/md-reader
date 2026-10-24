import { describe, it, expect } from 'vitest'
import { findMatches } from './previewSearch'

// jsdom 全局生效（vite.config.ts: environment: 'jsdom'），直接建 DOM
function setup(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('findMatches', () => {
  it('找出所有命中，大小写不敏感，跨多个节点按文档序返回', () => {
    const root = setup('<p>Foo bar</p><p>bar foo FOO</p>')
    const matches = findMatches(root, 'foo')
    expect(matches).toHaveLength(3)
    expect(matches[0].node.data).toBe('Foo bar')
    expect(matches[0].start).toBe(0)
    expect(matches[0].end).toBe(3)
    expect(matches[1].start).toBe(4) // 第二个 <p> 里的小写 'foo'
    expect(matches[1].end).toBe(7)
    expect(matches[2].start).toBe(8) // 第二个 <p> 里的 'FOO'
    expect(matches[2].end).toBe(11)
    root.remove()
  })

  it('同一文本节点内多命中，位置不重叠', () => {
    const root = setup('<p>ab cd ab</p>')
    const matches = findMatches(root, 'ab')
    expect(matches).toHaveLength(2)
    expect(matches[0].node).toBe(matches[1].node)
    expect(matches[0].start).toBe(0)
    expect(matches[0].end).toBe(2)
    expect(matches[1].start).toBe(6)
    expect(matches[1].end).toBe(8)
    root.remove()
  })

  it('重叠候选只保留从当前位置开始的非重叠命中', () => {
    const root = setup('<p>ababa</p>')
    const matches = findMatches(root, 'aba')
    expect(matches).toHaveLength(1)
    expect(matches[0].start).toBe(0)
    expect(matches[0].end).toBe(3)
    root.remove()
  })

  it('跳过 svg / script / style 子树', () => {
    const root = setup('<p>hit</p><svg><text>hit</text></svg><script>hit</script><style>.hit { color: red; }</style>')
    expect(findMatches(root, 'hit')).toHaveLength(1)
    root.remove()
  })

  it('空查询返回空数组', () => {
    const root = setup('<p>foo</p>')
    expect(findMatches(root, '')).toHaveLength(0)
    root.remove()
  })
})
