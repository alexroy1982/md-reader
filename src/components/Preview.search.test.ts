import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp, nextTick, type App } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import Preview from './Preview.vue'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import { renderMermaidBlocks } from '@/composables/useMermaid'

vi.mock('@/composables/useMarkdown', () => ({
  renderMarkdown: vi.fn(async (content: string) => ({ html: `<p>${content}</p>`, toc: [] })),
}))
vi.mock('@/composables/useMermaid', () => ({
  renderMermaidBlocks: vi.fn(async () => {}),
}))

interface PreviewExposed {
  openSearch: () => void
  bodyHtml: () => string
}

let app: App | null = null
let container: HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
  // jsdom 不实现滚动；本组测试只验证搜索编排，不验证视觉滚动
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: vi.fn(), writable: true, configurable: true,
  })
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  app?.unmount()
  app = null
  container.remove()
  vi.clearAllMocks()
  vi.useRealTimers()
})

async function mountPreview(content: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const tabs = useTabsStore()
  const tab = tabs.newTab()
  tabs.updateContent(tab.id, content)
  const settings = useSettingsStore()
  app = createApp(Preview)
  app.use(pinia)
  const vm = app.mount(container) as unknown as PreviewExposed
  await vi.runAllTimersAsync()
  await nextTick()
  return { vm, tabs, settings, tab }
}

function marks(): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('mark.pv-search-hit'))
}

function currentMark(): HTMLElement | undefined {
  return marks().find((m) => m.classList.contains('pv-search-hit-current'))
}

async function typeQuery(value: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>('.search-input')!
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await vi.advanceTimersByTimeAsync(150)
  await nextTick()
}

function key(target: Element, key: string, shiftKey = false): void {
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key, shiftKey, bubbles: true, cancelable: true,
  }))
}

describe('Preview 搜索编排', () => {
  it('搜索高亮、键位跳转与导出净化，且导出不改变屏幕高亮', async () => {
    const { vm } = await mountPreview('Foo foo')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')
    expect(marks()).toHaveLength(2)
    expect(currentMark()?.textContent).toBe('Foo')
    const input = container.querySelector('.search-input')!
    key(input, 'Enter')
    expect(currentMark()?.textContent).toBe('foo')
    key(input, 'Enter', true)
    expect(currentMark()?.textContent).toBe('Foo')
    expect(vm.bodyHtml()).toBe('<p>Foo foo</p>')
    expect(marks()).toHaveLength(2)
  })

  it('Esc 关闭会取消未触发的 debounce，不会事后重出高亮', async () => {
    const { vm } = await mountPreview('foo')
    vm.openSearch()
    await nextTick()
    const input = container.querySelector('.search-input')!
    input.value = 'foo'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    key(input, 'Escape') // 150ms 尚未到期就关闭
    await vi.runAllTimersAsync()
    await nextTick()
    expect(container.querySelector('.search-bar')).toBeNull()
    expect(marks()).toHaveLength(0)
  })

  it('重新打开恢复预填词、计数和高亮', async () => {
    const { vm } = await mountPreview('foo foo')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')
    key(container.querySelector('.search-input')!, 'Escape')
    await nextTick()
    expect(marks()).toHaveLength(0)
    vm.openSearch()
    await nextTick()
    expect(container.querySelector<HTMLInputElement>('.search-input')?.value).toBe('foo')
    expect(container.querySelector('.search-count')?.textContent).toBe('1/2')
    expect(marks()).toHaveLength(2)
  })

  it('预览重渲染后保持搜索并重跑高亮，索引 clamp 到新总数', async () => {
    const { vm, tabs, tab } = await mountPreview('foo foo foo')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')
    const input = container.querySelector('.search-input')!
    key(input, 'Enter')
    key(input, 'Enter')
    expect(currentMark()).toBe(marks()[2])
    vi.mocked(Element.prototype.scrollIntoView).mockClear()
    tabs.updateContent(tab.id, 'foo')
    await vi.runAllTimersAsync()
    await nextTick()
    expect(container.querySelector('.search-bar')).not.toBeNull()
    expect(marks()).toHaveLength(1)
    expect(container.querySelector('.search-count')?.textContent).toBe('1/1')
    expect(currentMark()).toBe(marks()[0])
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('debounce 未触发时 Enter 先展示新查询第一项，不额外步进', async () => {
    const { vm } = await mountPreview('foo foo bar bar')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')
    const input = container.querySelector('.search-input')!
    input.value = 'bar'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    key(input, 'Enter')
    await vi.runAllTimersAsync()
    await nextTick()
    expect(marks().map((m) => m.textContent)).toEqual(['bar', 'bar'])
    expect(currentMark()).toBe(marks()[0])
    expect(container.querySelector('.search-count')?.textContent).toBe('1/2')
  })

  it('最新帧等待 Mermaid 时旧导航失效，完成后恢复并 clamp 索引', async () => {
    const { vm, tabs, tab } = await mountPreview('foo foo foo')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')
    const input = container.querySelector('.search-input')!
    key(input, 'Enter')
    key(input, 'Enter')
    await nextTick()
    expect(container.querySelector('.search-count')?.textContent).toBe('3/3')

    let release!: () => void
    vi.mocked(renderMermaidBlocks).mockImplementationOnce(() => new Promise<void>((resolve) => {
      release = resolve
    }))
    const scroll = vi.mocked(Element.prototype.scrollIntoView)
    scroll.mockClear()
    tabs.updateContent(tab.id, 'foo')
    await vi.advanceTimersByTimeAsync(150)
    await nextTick()
    expect(vm.bodyHtml()).toBe('<p>foo</p>')
    expect(marks()).toHaveLength(0)
    expect(container.querySelector('.search-count')?.textContent).toBe('3/3')

    key(input, 'Enter')
    expect(container.querySelector('.search-count')?.textContent).toBe('3/3')
    expect(scroll).not.toHaveBeenCalled()
    release()
    await nextTick()
    await nextTick()
    expect(marks()).toHaveLength(1)
    expect(container.querySelector('.search-count')?.textContent).toBe('1/1')
    expect(currentMark()).toBe(marks()[0])
    expect(scroll).not.toHaveBeenCalled()
  })

  it('旧帧在 Mermaid 后到期不会 cleanup 或重建新帧高亮', async () => {
    const { vm, tabs, tab } = await mountPreview('foo foo')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')

    let releaseOld!: () => void
    vi.mocked(renderMermaidBlocks).mockImplementationOnce(() => new Promise<void>((resolve) => {
      releaseOld = resolve
    }))
    tabs.updateContent(tab.id, 'foo foo foo')
    await vi.advanceTimersByTimeAsync(150)
    await nextTick()
    expect(marks()).toHaveLength(0)

    tabs.updateContent(tab.id, 'foo')
    await vi.advanceTimersByTimeAsync(150)
    await nextTick()
    expect(marks()).toHaveLength(1)
    const latestMark = marks()[0]

    releaseOld()
    await nextTick()
    expect(marks()).toHaveLength(1)
    expect(marks()[0]).toBe(latestMark)
    expect(currentMark()).toBe(latestMark)
  })

  it('切回编辑模式自动关闭并清除高亮', async () => {
    const { vm, settings } = await mountPreview('foo')
    vm.openSearch()
    await nextTick()
    await typeQuery('foo')
    expect(marks()).toHaveLength(1)
    settings.editorVisible = true
    await nextTick()
    expect(container.querySelector('.search-bar')).toBeNull()
    expect(marks()).toHaveLength(0)
  })
})
