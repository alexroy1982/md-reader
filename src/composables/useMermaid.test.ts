import { describe, it, expect, vi, beforeEach } from 'vitest'

// 注意：vitest 要求 vi.mock 工厂引用的外部变量以 mock 开头
const mockMermaidRender = vi.fn()

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: (...args: unknown[]) => mockMermaidRender(...args),
  },
}))

import { renderMermaidBlocks, resetMermaidForTests } from './useMermaid'

function makeRoot(sources: string[]): HTMLElement {
  const root = document.createElement('div')
  for (const src of sources) {
    const div = document.createElement('div')
    div.className = 'mermaid-placeholder'
    const pre = document.createElement('pre')
    pre.className = 'mermaid-source'
    pre.textContent = src
    div.appendChild(pre)
    root.appendChild(div)
  }
  document.body.appendChild(root) // isConnected 为 true 才会写入 DOM
  return root
}

beforeEach(() => {
  resetMermaidForTests()
  mockMermaidRender.mockReset()
  document.body.innerHTML = ''
})

describe('renderMermaidBlocks', () => {
  it('渲染成功：占位符替换为 SVG（源码保留在隐藏 pre 中）', async () => {
    mockMermaidRender.mockResolvedValue({ svg: '<svg>ok</svg>' })
    const root = makeRoot(['graph TD\nA-->B'])
    await renderMermaidBlocks(root, 'light')
    expect(root.querySelector('.mermaid-diagram')?.innerHTML).toContain('<svg>')
    expect(root.querySelector('.mermaid-diagram')?.textContent).toContain('ok')
    expect(root.querySelector('.mermaid-placeholder')?.classList.contains('mermaid-rendered')).toBe(true)
    // 源码必须保留（主题切换重渲染依赖它）
    expect(root.querySelector('.mermaid-source')?.textContent).toBe('graph TD\nA-->B')
  })

  it('渲染失败：错误条 + 保留源码', async () => {
    mockMermaidRender.mockRejectedValue(new Error('Parse error on line 2'))
    const root = makeRoot(['not a diagram'])
    await renderMermaidBlocks(root, 'light')
    const bar = root.querySelector('.mermaid-error-bar')
    expect(bar?.textContent).toContain('Parse error on line 2')
    expect(root.querySelector('.mermaid-source-visible')?.textContent).toBe('not a diagram')
  })

  it('相同内容+主题命中缓存，不重复调用 render', async () => {
    mockMermaidRender.mockResolvedValue({ svg: '<svg>x</svg>' })
    const root1 = makeRoot(['graph TD\nA-->B'])
    await renderMermaidBlocks(root1, 'light')
    const root2 = makeRoot(['graph TD\nA-->B'])
    await renderMermaidBlocks(root2, 'light')
    expect(mockMermaidRender).toHaveBeenCalledTimes(1)
  })

  it('主题不同则缓存 key 不同，会重新渲染', async () => {
    mockMermaidRender.mockResolvedValue({ svg: '<svg>x</svg>' })
    await renderMermaidBlocks(makeRoot(['graph TD\nA-->B']), 'light')
    await renderMermaidBlocks(makeRoot(['graph TD\nA-->B']), 'dark')
    expect(mockMermaidRender).toHaveBeenCalledTimes(2)
  })

  it('过期 token 的结果不写入 DOM（但仍入缓存）', async () => {
    let resolveFirst!: (v: { svg: string }) => void
    mockMermaidRender.mockImplementationOnce(
      () => new Promise((r) => { resolveFirst = r })
    )
    mockMermaidRender.mockResolvedValue({ svg: '<svg>new</svg>' })

    const root1 = makeRoot(['graph TD\nA-->B'])
    const p1 = renderMermaidBlocks(root1, 'light')
    const root2 = makeRoot(['graph TD\nC-->D'])
    const p2 = renderMermaidBlocks(root2, 'light')
    // 等待懒加载 mermaid 完成、两个 render 都进入执行，再释放第一个
    await new Promise((r) => setTimeout(r, 0))
    resolveFirst({ svg: '<svg>stale</svg>' })
    await Promise.all([p1, p2])

    expect(root1.innerHTML).not.toContain('stale')
    expect(root2.innerHTML).toContain('new')
  })

  it('并发上限为 2', async () => {
    let inFlight = 0
    let maxInFlight = 0
    mockMermaidRender.mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 10))
      inFlight--
      return { svg: '<svg/>' }
    })
    const root = makeRoot(['a', 'b', 'c', 'd', 'e'].map((s) => `graph TD\n${s}-->x`))
    await renderMermaidBlocks(root, 'light')
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })
})
