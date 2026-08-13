import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Store } from '@tauri-apps/plugin-store'
import type { RecentFile } from '@/types'

const MAX_RECENTS = 15

export function upsertRecent(items: RecentFile[], entry: RecentFile): RecentFile[] {
  return [entry, ...items.filter((i) => i.path !== entry.path)].slice(0, MAX_RECENTS)
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

let storePromise: Promise<Store> | null = null
function getStore(): Promise<Store> {
  if (!storePromise) storePromise = Store.load('recents.json')
  return storePromise
}

export const useRecentsStore = defineStore('recents', () => {
  const items = ref<RecentFile[]>([])

  async function load(): Promise<void> {
    try {
      const s = await getStore()
      const saved = await s.get<RecentFile[]>('recents')
      if (Array.isArray(saved)) items.value = saved
    } catch {
      // 非 tauri 环境忽略
    }
  }

  async function add(path: string): Promise<void> {
    items.value = upsertRecent(items.value, { path, name: fileName(path), openedAt: Date.now() })
    try {
      const s = await getStore()
      await s.set('recents', items.value)
      await s.save()
    } catch {
      // 同上
    }
  }

  return { items, load, add }
})
