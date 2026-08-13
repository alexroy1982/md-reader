import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Theme } from '@/types'
import { Store } from '@tauri-apps/plugin-store'

let storePromise: Promise<Store> | null = null
function getStore(): Promise<Store> {
  if (!storePromise) storePromise = Store.load('settings.json')
  return storePromise
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>('light')

  function applyTheme(t: Theme): void {
    theme.value = t
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t
    }
  }

  async function load(): Promise<void> {
    try {
      const s = await getStore()
      const saved = await s.get<Theme>('theme')
      if (saved === 'light' || saved === 'dark') applyTheme(saved)
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

  function toggle(): Promise<void> {
    return setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return { theme, load, setTheme, toggle }
})
