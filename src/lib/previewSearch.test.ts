import { describe, it, expect } from 'vitest'
import { findMatches, applyHighlights } from './previewSearch'

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

  it('按原文 UTF-16 偏移处理 Unicode simple case folding', () => {
    const root = setup('<p>İ foo</p>')
    const unicodeMatches = findMatches(root, 'İ')
    expect(unicodeMatches).toHaveLength(1)
    expect(unicodeMatches[0].start).toBe(0)
    expect(unicodeMatches[0].end).toBe(1)
    const applied = applyHighlights(unicodeMatches)
    expect(applied.marks).toHaveLength(1)
    expect(applied.marks[0].textContent).toBe('İ')
    applied.cleanup()

    const fooMatches = findMatches(root, 'foo')
    expect(fooMatches).toHaveLength(1)
    expect(fooMatches[0].start).toBe(2)
    expect(fooMatches[0].end).toBe(5)
    root.remove()
  })

  it('正则元字符仍按字面文本搜索', () => {
    const root = setup('<p>a.b aXb</p>')
    const matches = findMatches(root, 'a.b')
    expect(matches).toHaveLength(1)
    expect(matches[0].start).toBe(0)
    expect(matches[0].end).toBe(3)
    root.remove()
  })

  it('跳过默认隐藏的 Mermaid 源码但包含显式可见源码', () => {
    const root = setup('<p>hit</p><pre class="mermaid-source">hit</pre><pre class="mermaid-source mermaid-source-visible">hit</pre>')
    const matches = findMatches(root, 'hit')
    expect(matches).toHaveLength(2)
    expect(matches[0].node.parentElement?.tagName).toBe('P')
    expect(matches[1].node.parentElement?.classList.contains('mermaid-source-visible')).toBe(true)
    root.remove()
  })
})

describe('applyHighlights', () => {
  it('命中区间包上 mark.pv-search-hit，按文档序返回', () => {
    const root = setup('<p>ab cd</p><p>zzab</p>')
    const { marks, cleanup } = applyHighlights(findMatches(root, 'ab'))
    expect(marks.map((m) => m.textContent)).toEqual(['ab', 'ab'])
    expect(marks.every((m) => m.className === 'pv-search-hit')).toBe(true)
    // 文档序：第一个 mark 在第一个 p 里
    expect(marks[0].closest('p')).toBe(root.querySelectorAll('p')[0])
    cleanup()
    root.remove()
  })

  it('同节点多命中全部高亮且周围文本不丢', () => {
    const root = setup('<p>xabABx</p>')
    const { marks, cleanup } = applyHighlights(findMatches(root, 'ab'))
    expect(marks).toHaveLength(2)
    expect(marks.map((m) => m.textContent)).toEqual(['ab', 'AB'])
    expect(root.querySelector('p')!.textContent).toBe('xabABx')
    expect(root.querySelector('p')!.innerHTML).toBe('x<mark class="pv-search-hit">ab</mark><mark class="pv-search-hit">AB</mark>x')
    cleanup()
    root.remove()
  })

  it('cleanup 完全恢复原 DOM：文本内容不变且相邻文本节点 normalize 合并', () => {
    const root = setup('<p>xabxabx</p>')
    const before = root.querySelector('p')!.childNodes.length // 1 个文本节点
    const { cleanup } = applyHighlights(findMatches(root, 'ab'))
    cleanup()
    const p = root.querySelector('p')!
    expect(p.textContent).toBe('xabxabx')
    expect(p.childNodes.length).toBe(before)
    root.remove()
  })

  it('cleanup 保留嵌套元素且可重复调用', () => {
    const root = setup('<p>before <strong>ab</strong> after</p>')
    const before = root.innerHTML
    const strong = root.querySelector('strong')
    const { cleanup } = applyHighlights(findMatches(root, 'ab'))
    cleanup()
    expect(root.innerHTML).toBe(before)
    expect(root.querySelector('strong')).toBe(strong)
    expect(() => cleanup()).not.toThrow()
    expect(root.innerHTML).toBe(before)
    root.remove()
  })

  it('cleanup 对已脱离文档的 mark 不抛错（v-html 重渲染后旧引用）', () => {
    const root = setup('<p>ab</p>')
    const { cleanup } = applyHighlights(findMatches(root, 'ab'))
    root.innerHTML = '' // 模拟 v-html 重渲染：旧 mark 全部脱离文档
    expect(() => cleanup()).not.toThrow()
    root.remove()
  })
})
