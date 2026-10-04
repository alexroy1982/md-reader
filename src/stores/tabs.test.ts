import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTabsStore } from './tabs'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('applyExternalContent（外部文件变更应用）', () => {
  it('按 path 找到标签，content 与 savedContent 同步更新且不脏', () => {
    const tabs = useTabsStore()
    const tab = tabs.openFileTab('D:\\docs\\a.md', 'a.md', 'old')
    tabs.applyExternalContent('D:\\docs\\a.md', 'new')
    expect(tab.content).toBe('new')
    expect(tab.savedContent).toBe('new')
    expect(tabs.isDirty(tab)).toBe(false)
  })

  it('path 无匹配标签时安全无操作', () => {
    const tabs = useTabsStore()
    expect(() => tabs.applyExternalContent('D:\\none.md', 'x')).not.toThrow()
  })

  it('脏标签被显式覆盖后恢复干净（保存/外部刷新共用语义）', () => {
    const tabs = useTabsStore()
    const tab = tabs.openFileTab('D:\\docs\\a.md', 'a.md', 'old')
    tabs.updateContent(tab.id, 'edited')
    expect(tabs.isDirty(tab)).toBe(true)
    tabs.applyExternalContent('D:\\docs\\a.md', 'new')
    expect(tabs.isDirty(tab)).toBe(false)
  })
})
