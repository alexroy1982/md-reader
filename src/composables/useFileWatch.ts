import { watch } from 'vue'
import { watchImmediate } from '@tauri-apps/plugin-fs'
import type { UnwatchFn, WatchEvent } from '@tauri-apps/plugin-fs'
import { useTabsStore } from '@/stores/tabs'
import { readMarkdown } from '@/composables/useFileIO'

const DEBOUNCE_MS = 300

// Windows 路径匹配：分隔符统一 + 大小写不敏感（notify 与 dialog/drag-drop 的路径写法不保证一致）
function normPath(p: string): string {
  return p.replace(/\//g, '\\').toLowerCase()
}

function dirOf(norm: string): string {
  const i = norm.lastIndexOf('\\')
  return i === -1 ? norm : norm.slice(0, i)
}

/**
 * 外部修改自动刷新：监听所有打开文件所在目录（同目录共用一个 watcher），
 * 事件命中打开的文件时防抖重读；脏标签跳过，绝不覆盖未保存编辑。
 * 仅 Tauri 环境调用（App.vue 已守卫）。返回清理函数。
 */
export function setupExternalFileSync(): () => void {
  const tabs = useTabsStore()
  const watchers = new Map<string, UnwatchFn>() // 归一化目录 -> unwatch
  const registering = new Set<string>() // 注册中的目录，防异步竞态重复注册
  const timers = new Map<string, ReturnType<typeof setTimeout>>() // 归一化文件路径 -> 防抖
  let disposed = false

  function scheduleReload(norm: string): void {
    clearTimeout(timers.get(norm)!)
    timers.set(
      norm,
      setTimeout(() => void reload(norm), DEBOUNCE_MS)
    )
  }

  async function reload(norm: string): Promise<void> {
    timers.delete(norm)
    const tab = tabs.tabs.find((t) => t.path !== null && normPath(t.path) === norm)
    if (!tab || tab.path === null) return
    if (tabs.isDirty(tab)) return // 脏标签：保留用户编辑
    try {
      const content = await readMarkdown(tab.path)
      if (content === tab.content) return // 自家保存的回声 / 无变化
      tabs.applyExternalContent(tab.path, content)
    } catch {
      // 文件被删除/重命名走：读取失败，保留旧内容
    }
  }

  function handleEvent(event: WatchEvent): void {
    for (const raw of event.paths) {
      const norm = normPath(raw)
      if (tabs.tabs.some((t) => t.path !== null && normPath(t.path) === norm)) {
        scheduleReload(norm)
      }
    }
  }

  const stopWatch = watch(
    () =>
      [
        ...new Set(
          tabs.tabs
            .map((t) => t.path)
            .filter((p): p is string => p !== null)
            .map(normPath)
        ),
      ] as string[],
    async (paths) => {
      if (disposed) return
      const wantDirs = new Set(paths.map(dirOf))
      for (const dir of [...watchers.keys()]) {
        if (!wantDirs.has(dir)) {
          watchers.get(dir)?.()
          watchers.delete(dir)
        }
      }
      for (const dir of wantDirs) {
        if (watchers.has(dir) || registering.has(dir)) continue
        registering.add(dir)
        try {
          const unwatch = await watchImmediate(dir, handleEvent)
          if (disposed) {
            unwatch() // 等待注册期间已清理：立即注销防泄漏
          } else {
            watchers.set(dir, unwatch)
          }
        } catch {
          // 监听失败（权限/目录消失）：静默，退化为不自动刷新
        } finally {
          registering.delete(dir)
        }
      }
    },
    { immediate: true }
  )

  return () => {
    disposed = true
    stopWatch()
    for (const unwatch of watchers.values()) unwatch()
    watchers.clear()
    for (const t of timers.values()) clearTimeout(t)
    timers.clear()
  }
}
