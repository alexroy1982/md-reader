import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerShortcuts } from './useShortcuts'

function key(init: KeyboardEventInit): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { cancelable: true, ...init, bubbles: true })
  window.dispatchEvent(e)
  return e
}

describe('registerShortcuts', () => {
  const handlers = {
    save: vi.fn(), open: vi.fn(), newTab: vi.fn(), print: vi.fn(),
    search: vi.fn(), nextTab: vi.fn(), prevTab: vi.fn(),
  }
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup?.()
    cleanup = registerShortcuts(handlers)
  })

  it('Ctrl+S 触发 save 并阻止默认', () => {
    const e = key({ ctrlKey: true, key: 's' })
    expect(handlers.save).toHaveBeenCalled()
    expect(e.defaultPrevented).toBe(true)
  })
  it('Ctrl+O 触发 open', () => {
    key({ ctrlKey: true, key: 'o' })
    expect(handlers.open).toHaveBeenCalled()
  })
  it('Ctrl+N 触发 newTab', () => {
    key({ ctrlKey: true, key: 'n' })
    expect(handlers.newTab).toHaveBeenCalled()
  })
  it('Ctrl+P 触发 print', () => {
    key({ ctrlKey: true, key: 'p' })
    expect(handlers.print).toHaveBeenCalled()
  })
  it('Ctrl+F 触发 search', () => {
    key({ ctrlKey: true, key: 'f' })
    expect(handlers.search).toHaveBeenCalled()
  })
  it('Alt+← / Alt+→ 切换标签', () => {
    key({ altKey: true, key: 'ArrowLeft' })
    expect(handlers.prevTab).toHaveBeenCalled()
    key({ altKey: true, key: 'ArrowRight' })
    expect(handlers.nextTab).toHaveBeenCalled()
  })
  it('无修饰键不触发', () => {
    key({ key: 's' })
    expect(handlers.save).not.toHaveBeenCalled()
  })
  it('cleanup 后不再响应', () => {
    cleanup()
    key({ ctrlKey: true, key: 's' })
    expect(handlers.save).not.toHaveBeenCalled()
  })
})
