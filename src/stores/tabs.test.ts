import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTabsStore } from './tabs'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('tabs store', () => {
  it('newTab 创建未命名标签并激活', () => {
    const s = useTabsStore()
    const tab = s.newTab()
    expect(tab.title).toBe('未命名')
    expect(tab.path).toBeNull()
    expect(s.activeId).toBe(tab.id)
  })

  it('openFileTab 按 path 去重并激活已有标签', () => {
    const s = useTabsStore()
    const a = s.openFileTab('/docs/a.md', 'a.md', '# A')
    s.newTab()
    const again = s.openFileTab('/docs/a.md', 'a.md', '# A')
    expect(again.id).toBe(a.id)
    expect(s.tabs.length).toBe(2)
    expect(s.activeId).toBe(a.id)
  })

  it('脏标记：content 与 savedContent 不一致', () => {
    const s = useTabsStore()
    const tab = s.openFileTab('/a.md', 'a.md', '# A')
    expect(s.isDirty(tab)).toBe(false)
    s.updateContent(tab.id, '# A changed')
    expect(s.isDirty(tab)).toBe(true)
    s.markSaved(tab.id)
    expect(s.isDirty(tab)).toBe(false)
  })

  it('closeTab 激活相邻标签', () => {
    const s = useTabsStore()
    const a = s.newTab()
    const b = s.newTab()
    const c = s.newTab()
    s.setActive(b.id)
    s.closeTab(b.id)
    expect(s.activeId).toBe(c.id)
    s.closeTab(c.id)
    s.closeTab(a.id)
    expect(s.activeId).toBeNull()
  })

  it('stepTab 循环切换', () => {
    const s = useTabsStore()
    const a = s.newTab()
    const b = s.newTab()
    s.setActive(a.id)
    s.stepTab(1)
    expect(s.activeId).toBe(b.id)
    s.stepTab(1)
    expect(s.activeId).toBe(a.id)
    s.stepTab(-1)
    expect(s.activeId).toBe(b.id)
  })
})
