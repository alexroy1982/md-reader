import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const storeData = new Map<string, unknown>()
vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn(async () => ({
      get: async (k: string) => storeData.get(k) ?? null,
      set: async (k: string, v: unknown) => { storeData.set(k, v) },
      save: async () => {},
    })),
  },
}))

import { useRecentsStore, upsertRecent } from './recents'
import type { RecentFile } from '@/types'

const entry = (path: string, t: number): RecentFile => ({
  path,
  name: path.split('/').pop()!,
  openedAt: t,
})

beforeEach(() => {
  setActivePinia(createPinia())
  storeData.clear()
})

describe('upsertRecent', () => {
  it('最新置顶', () => {
    const list = upsertRecent([entry('/a.md', 1)], entry('/b.md', 2))
    expect(list.map((i) => i.path)).toEqual(['/b.md', '/a.md'])
  })
  it('同路径去重并置顶', () => {
    const list = upsertRecent([entry('/a.md', 1), entry('/b.md', 2)], entry('/a.md', 3))
    expect(list.map((i) => i.path)).toEqual(['/a.md', '/b.md'])
    expect(list[0].openedAt).toBe(3)
  })
  it('超过 15 条截断最旧', () => {
    let list: RecentFile[] = []
    for (let i = 0; i < 20; i++) list = upsertRecent(list, entry(`/f${i}.md`, i))
    expect(list.length).toBe(15)
    expect(list[0].path).toBe('/f19.md')
    expect(list.some((i) => i.path === '/f0.md')).toBe(false)
  })
})

describe('recents store 持久化', () => {
  it('add 写入 store，load 恢复', async () => {
    const s = useRecentsStore()
    await s.add('/docs/note.md')
    expect(s.items[0].name).toBe('note.md')
    expect(storeData.get('recents')).toHaveLength(1)

    const s2 = useRecentsStore()
    await s2.load()
    expect(s2.items[0].path).toBe('/docs/note.md')
  })
})
