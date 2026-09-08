import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Theme } from '@/types'
import { applyMarkdownTheme } from '@/lib/markdownTheme'
import { Store } from '@tauri-apps/plugin-store'

let storePromise: Promise<Store> | null = null
function getStore(): Promise<Store> {
  if (!storePromise) storePromise = Store.load('settings.json')
  return storePromise
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>('light')
  const editorVisible = ref(false)

  function applyTheme(t: Theme): void {
    theme.value = t
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t
    }
    applyMarkdownTheme(t)
  }

  async function load(): Promise<void> {
    try {
      const s = await getStore()
      const saved = await s.get<Theme>('theme')
      const savedEditorVisible = await s.get<boolean>('editorVisible')
      if (saved === 'light' || saved === 'dark') applyTheme(saved)
      if (typeof savedEditorVisible === 'boolean') editorVisible.value = savedEditorVisible
    } catch {
      // 纯浏览器 / 测试环境无 tauri，保持默认
    }
  }

  async function setTheme(t: Theme): Promise<void> {
    applyTheme(t)
    try {
      const s = await getStore()
      await s.set('theme', t)
      await s.save()
    } catch {
      // 同上
    }
  }

  async function setEditorVisible(visible: boolean): Promise<void> {
    editorVisible.value = visible
    try {
      const s = await getStore()
      await s.set('editorVisible', visible)
      await s.save()
    } catch {
      // 纯浏览器 / 测试环境忽略持久化失败
    }
  }

  function toggle(): Promise<void> {
    return setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return { theme, editorVisible, load, setTheme, setEditorVisible, toggle }
})
