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
    let saved: Theme | null = null
    let savedEditorVisible: boolean | null = null
    try {
      const s = await getStore()
      saved = await s.get<Theme>('theme')
      savedEditorVisible = await s.get<boolean>('editorVisible')
    } catch {
      // 纯浏览器 / 测试环境无 tauri：无持久化配置，走默认主题
    }
    // index.html 只预置了 data-theme 属性，github-markdown-css 必须由 applyTheme 注入。
    // 全新安装（从未保存过主题）也必须走一次，否则 <pre> 缺 overflow/背景样式，
    // 超长无空格行会溢出 A4 纸张。放在 try 外：存储异常不能连坐样式注入
    applyTheme(saved === 'dark' ? 'dark' : 'light')
    if (typeof savedEditorVisible === 'boolean') editorVisible.value = savedEditorVisible
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
