import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const storeData = new Map<string, unknown>()
const mockStore = {
  get: vi.fn(async (k: string) => storeData.get(k) ?? null),
  set: vi.fn(async (k: string, v: unknown) => { storeData.set(k, v) }),
  save: vi.fn(async () => {}),
}

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: { load: vi.fn(async () => mockStore) },
}))

import { useSettingsStore } from './settings'

beforeEach(() => {
  setActivePinia(createPinia())
  storeData.clear()
  vi.clearAllMocks()
})

describe('settings store', () => {
  it('默认亮色主题', () => {
    const s = useSettingsStore()
    expect(s.theme).toBe('light')
  })

  it('setTheme 写入 data-theme 属性并持久化', async () => {
    const s = useSettingsStore()
    await s.setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark')
    expect(mockStore.save).toHaveBeenCalled()
  })

  it('load 恢复上次保存的主题', async () => {
    storeData.set('theme', 'dark')
    const s = useSettingsStore()
    await s.load()
    expect(s.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggle 在明暗间切换', async () => {
    const s = useSettingsStore()
    await s.toggle()
    expect(s.theme).toBe('dark')
    await s.toggle()
    expect(s.theme).toBe('light')
  })
})
