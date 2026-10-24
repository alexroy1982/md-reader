import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createApp } from 'vue'
import SearchBar from './SearchBar.vue'

const src = readFileSync('src/components/SearchBar.vue', 'utf-8')
const markdownCss = readFileSync('src/styles/markdown.css', 'utf-8')
const cleanups: Array<() => void> = []

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
})

function mountSearchBar(props: { initial?: string; count?: number; current?: number } = {}) {
  const onQuery = vi.fn()
  const onNext = vi.fn()
  const onPrev = vi.fn()
  const onClose = vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(SearchBar, {
    initial: 'foo',
    count: 2,
    current: 1,
    ...props,
    onQuery,
    onNext,
    onPrev,
    onClose,
  })
  const proxy = app.mount(container) as unknown as { refocus: () => void }
  const input = container.querySelector('input') as HTMLInputElement
  const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
  cleanups.push(() => {
    app.unmount()
    container.remove()
  })
  return { app, container, proxy, input, buttons, onQuery, onNext, onPrev, onClose }
}

function dispatchKey(target: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

describe('SearchBar 结构回归', () => {
  it('键位接线：Enter 下一个 / Shift+Enter 上一个 / Esc 关闭', () => {
    expect(src).toContain("e.key === 'Enter'")
    expect(src).toContain("e.shiftKey ? 'prev' : 'next'")
    expect(src).toContain("e.key === 'Escape'")
    expect(src).toContain('e.isComposing') // 输入法确认候选的 Enter 不能触发跳转
  })

  it('计数显示：有命中 n/m，无命中 0/0 且输入框标红', () => {
    expect(src).toContain("'0/0'")
    expect(src).toContain('no-hit')
  })

  it('挂载即聚焦并全选预填词，暴露 refocus 供重复 Ctrl+F', () => {
    expect(src).toContain('refocus')
    expect(src).toContain('inputRef.value?.focus()')
    expect(src).toContain('.select()')
  })

  it('样式只用主题 CSS 变量（亮暗自适应，无硬编码颜色）', () => {
    const style = src.slice(src.indexOf('<style'))
    expect(style).toContain('var(--bg-sidebar)')
    expect(style).toContain('var(--control-border)')
    expect(style).toContain('.search-input:focus-visible')
    expect(style).toContain('outline: 2px solid var(--accent)')
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})

describe('预览搜索全局样式', () => {
  it('mark 两级高亮及打印隐藏搜索条', () => {
    expect(markdownCss).toContain('mark.pv-search-hit {')
    expect(markdownCss).toContain('mark.pv-search-hit-current {')
    expect(markdownCss).toMatch(
      /@media print[\s\S]*\.search-bar,\s*\.editor-pane\s*\{\s*display:\s*none\s*!important;/,
    )
  })
})

describe('SearchBar 真实行为', () => {
  it('输入发 query，并正确显示无命中及当前命中计数', () => {
    const noHit = mountSearchBar({ count: 0, current: 0 })
    expect(noHit.container.querySelector('.search-count')?.textContent).toBe('0/0')
    expect(noHit.input.classList.contains('no-hit')).toBe(true)

    noHit.input.value = 'bar'
    noHit.input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(noHit.onQuery).toHaveBeenCalledTimes(1)
    expect(noHit.onQuery).toHaveBeenCalledWith('bar')

    const hit = mountSearchBar({ count: 2, current: 1 })
    expect(hit.container.querySelector('.search-count')?.textContent).toBe('2/2')
    expect(hit.input.classList.contains('no-hit')).toBe(false)
  })

  it.each([0, 1, 2])('按钮 %i 聚焦时，Enter/Shift+Enter/Escape 各只触发对应操作', (index) => {
    const { buttons, onNext, onPrev, onClose } = mountSearchBar()
    const button = buttons[index]
    button.focus()
    expect(document.activeElement).toBe(button)

    const enter = dispatchKey(button, 'Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    const shiftEnter = dispatchKey(button, 'Enter', { shiftKey: true })
    expect(shiftEnter.defaultPrevented).toBe(true)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()

    const escape = dispatchKey(button, 'Escape')
    expect(escape.defaultPrevented).toBe(true)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('输入法 composing 的 Enter/Escape 不触发跳转或关闭', () => {
    const { input, onNext, onClose } = mountSearchBar()
    dispatchKey(input, 'Enter', { isComposing: true })
    dispatchKey(input, 'Escape', { isComposing: true })
    expect(onNext).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('挂载及 expose refocus 均聚焦并全选 initial', () => {
    const { proxy, input } = mountSearchBar({ initial: 'foo' })
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(3)

    input.blur()
    expect(document.activeElement).not.toBe(input)
    expect(proxy.refocus).toBeTypeOf('function')
    proxy.refocus()
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(3)
  })

  it('三个按钮实际 click 分别只发 prev/next/close', () => {
    const { buttons, onNext, onPrev, onClose } = mountSearchBar()
    buttons[0].click()
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    buttons[1].click()
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()

    buttons[2].click()
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('提供搜索语义、可访问名称及实时计数状态', () => {
    const { container, input, buttons } = mountSearchBar()
    const root = container.querySelector('.search-bar') as HTMLElement
    const status = container.querySelector('.search-count') as HTMLElement
    expect(root.getAttribute('role')).toBe('search')
    expect(root.getAttribute('aria-label')).toBe('预览搜索')
    expect(input.getAttribute('aria-label')).toBe('搜索预览文本')
    expect(status.getAttribute('role')).toBe('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.getAttribute('aria-atomic')).toBe('true')
    expect(buttons.map((button) => button.type)).toEqual(['button', 'button', 'button'])
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      '上一个命中',
      '下一个命中',
      '关闭搜索',
    ])
  })
})
