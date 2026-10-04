import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

const { readMock, unwatchSpy, watchImmediateMock } = vi.hoisted(() => ({
  readMock: vi.fn(),
  unwatchSpy: vi.fn(),
  watchImmediateMock: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({ watchImmediate: watchImmediateMock }))
vi.mock('@/composables/useFileIO', () => ({
  readMarkdown: (p: string) => readMock(p),
}))

import { useTabsStore } from '@/stores/tabs'
import { setupExternalFileSync } from './useFileWatch'

type EventCb = (event: { type: string; paths: string[]; attrs: unknown }) => void
let fire: EventCb = () => {}
let cleanup: (() => void) | null = null

async function openDoc(path: string, content = 'old') {
  const tabs = useTabsStore()
  const tab = tabs.openFileTab(path, 'x.md', content)
  await nextTick() // 触发目录集合的响应式同步
  await vi.advanceTimersByTimeAsync(0) // 让异步 watchImmediate 注册落定
  return tab
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  fire = () => {}
  watchImmediateMock.mockReset()
  watchImmediateMock.mockImplementation(async (_dir: string, cb: EventCb) => {
    fire = cb
    return unwatchSpy
  })
  readMock.mockReset()
  unwatchSpy.mockClear()
})

afterEach(() => {
  cleanup?.()
  cleanup = null
  vi.useRealTimers()
})

describe('setupExternalFileSync', () => {
  it('打开带路径标签注册其所在目录（归一化键），未命名标签不注册', async () => {
    const tabs = useTabsStore()
    tabs.newTab() // 未命名，path 为 null
    cleanup = setupExternalFileSync()
    await openDoc('D:\\docs\\a.md')
    expect(watchImmediateMock).toHaveBeenCalledTimes(1)
    expect(watchImmediateMock).toHaveBeenCalledWith('d:\\docs', expect.any(Function))
  })

  it('目录事件命中文件：防抖后重读，干净标签 content/savedContent 同步更新', async () => {
    cleanup = setupExternalFileSync()
    const tab = await openDoc('D:\\docs\\a.md')
    readMock.mockResolvedValue('new')
    fire({ type: 'any', paths: ['D:\\docs\\a.md'] })
    expect(readMock).not.toHaveBeenCalled() // 防抖窗口内不读
    await vi.advanceTimersByTimeAsync(300)
    expect(readMock).toHaveBeenCalledWith('D:\\docs\\a.md') // 用原样路径读取
    expect(tab.content).toBe('new')
    expect(tab.savedContent).toBe('new')
    expect(useTabsStore().isDirty(tab)).toBe(false)
  })

  it('事件路径与打开文件大小写/分隔符不一致也能命中（Windows 归一化）', async () => {
    cleanup = setupExternalFileSync()
    const tab = await openDoc('D:\\Docs\\A.md')
    readMock.mockResolvedValue('new')
    fire({ type: 'any', paths: ['d:/docs/a.md'] })
    await vi.advanceTimersByTimeAsync(300)
    expect(readMock).toHaveBeenCalledWith('D:\\Docs\\A.md')
    expect(tab.content).toBe('new')
  })

  it('脏标签跳过：不读取不更新', async () => {
    cleanup = setupExternalFileSync()
    const tabs = useTabsStore()
    const tab = await openDoc('D:\\docs\\a.md')
    tabs.updateContent(tab.id, 'edited')
    fire({ type: 'any', paths: ['D:\\docs\\a.md'] })
    await vi.advanceTimersByTimeAsync(300)
    expect(readMock).not.toHaveBeenCalled()
    expect(tab.content).toBe('edited')
  })

  it('重读内容与当前相同：不产生变更（自家保存回声无循环）', async () => {
    cleanup = setupExternalFileSync()
    const tab = await openDoc('D:\\docs\\a.md')
    readMock.mockResolvedValue('old')
    fire({ type: 'any', paths: ['D:\\docs\\a.md'] })
    await vi.advanceTimersByTimeAsync(300)
    expect(tab.content).toBe('old')
    expect(useTabsStore().isDirty(tab)).toBe(false)
  })

  it('同目录第二个标签不重复注册 watcher', async () => {
    cleanup = setupExternalFileSync()
    await openDoc('D:\\docs\\a.md')
    await openDoc('D:\\docs\\b.md')
    expect(watchImmediateMock).toHaveBeenCalledTimes(1)
  })

  it('关闭标签使目录无引用后注销 watcher', async () => {
    cleanup = setupExternalFileSync()
    const tabs = useTabsStore()
    const tab = await openDoc('D:\\docs\\a.md')
    tabs.closeTab(tab.id)
    await nextTick()
    expect(unwatchSpy).toHaveBeenCalledTimes(1)
  })

  it('清理函数：注销全部 watcher 且未到期的防抖被取消', async () => {
    cleanup = setupExternalFileSync()
    await openDoc('D:\\docs\\a.md')
    fire({ type: 'any', paths: ['D:\\docs\\a.md'] })
    cleanup!()
    cleanup = null
    await vi.advanceTimersByTimeAsync(300)
    expect(readMock).not.toHaveBeenCalled()
    expect(unwatchSpy).toHaveBeenCalled()
  })

  it('watcher 注册失败静默降级（不抛出，功能退化为手动重开）', async () => {
    watchImmediateMock.mockRejectedValue(new Error('denied'))
    cleanup = setupExternalFileSync()
    await expect(openDoc('D:\\docs\\a.md')).resolves.toBeDefined()
  })
})
