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
  // 隔离上一条用例残留的主题状态，保证「全新安装」场景真实
  delete document.documentElement.dataset.theme
  document.getElementById('gh-markdown-theme')?.remove()
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

  it('load 无保存记录（全新安装）也注入默认主题样式', async () => {
    // index.html 预置 data-theme="light" 让主题变量生效，但 github-markdown-css
    // 只能由 applyTheme 注入；跳过注入会导致 <pre> 无 overflow 样式，长行溢出纸张
    const s = useSettingsStore()
    await s.load()
    expect(document.documentElement.dataset.theme).toBe('light')
    const el = document.getElementById('gh-markdown-theme')
    expect(el).not.toBeNull()
    expect(el!.textContent).toContain('.markdown-body pre')
  })

  it('setTheme 注入对应主题的 github-markdown 样式', async () => {
    const s = useSettingsStore()
    await s.setTheme('light')
    const el = document.getElementById('gh-markdown-theme')
    expect(el).not.toBeNull()
    const lightContent = el!.textContent
    expect(lightContent).toBeTruthy()
    await s.setTheme('dark')
    const darkContent = document.getElementById('gh-markdown-theme')!.textContent
    expect(darkContent).toBeTruthy()
    expect(darkContent).not.toBe(lightContent)
  })

  it('toggle 在明暗间切换', async () => {
    const s = useSettingsStore()
    await s.toggle()
    expect(s.theme).toBe('dark')
    await s.toggle()
    expect(s.theme).toBe('light')
  })
})
