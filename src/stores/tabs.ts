import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Tab } from '@/types'

let seq = 0

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeId = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? null)

  function isDirty(tab: Tab): boolean {
    return tab.content !== tab.savedContent
  }

  function newTab(): Tab {
    const tab: Tab = { id: `tab-${++seq}`, title: '未命名', path: null, content: '', savedContent: '' }
    tabs.value.push(tab)
    activeId.value = tab.id
    return tab
  }

  function openFileTab(path: string, name: string, content: string): Tab {
    const existing = tabs.value.find((t) => t.path === path)
    if (existing) {
      activeId.value = existing.id
      return existing
    }
    const tab: Tab = { id: `tab-${++seq}`, title: name, path, content, savedContent: content }
    tabs.value.push(tab)
    activeId.value = tab.id
    return tab
  }

  function updateContent(id: string, content: string): void {
    const tab = tabs.value.find((t) => t.id === id)
    if (tab) tab.content = content
  }

  function markSaved(id: string): void {
    const tab = tabs.value.find((t) => t.id === id)
    if (tab) tab.savedContent = tab.content
  }

  function closeTab(id: string): void {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (activeId.value === id) {
      const next = tabs.value[Math.min(idx, tabs.value.length - 1)] ?? null
      activeId.value = next ? next.id : null
    }
  }

  function setActive(id: string): void {
    if (tabs.value.some((t) => t.id === id)) activeId.value = id
  }

  function stepTab(delta: number): void {
    const n = tabs.value.length
    if (n === 0 || activeId.value === null) return
    const idx = tabs.value.findIndex((t) => t.id === activeId.value)
    activeId.value = tabs.value[(idx + delta + n) % n].id
  }

  return { tabs, activeId, activeTab, isDirty, newTab, openFileTab, updateContent, markSaved, closeTab, setActive, stepTab }
})
