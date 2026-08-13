import type { Theme } from '@/types'

type MermaidApi = (typeof import('mermaid'))['default']

interface CacheEntry {
  svg?: string
  error?: string
}

const cache = new Map<string, CacheEntry>()
let mermaidPromise: Promise<MermaidApi> | null = null
let initializedTheme: Theme | null = null
let activeToken = 0
let idCounter = 0

const CONCURRENCY = 2

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default)
  }
  return mermaidPromise
}

function ensureInitialized(mermaid: MermaidApi, theme: Theme): void {
  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    })
    initializedTheme = theme
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function renderOne(mermaid: MermaidApi, source: string): Promise<CacheEntry> {
  const id = `mmd-${++idCounter}`
  try {
    const { svg } = await mermaid.render(id, source)
    return { svg }
  } catch (err) {
    // mermaid 失败时可能向 document.body 注入错误元素，清掉
    document.getElementById(id)?.remove()
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

function applyEntry(el: HTMLElement, entry: CacheEntry): void {
  const source = el.querySelector('.mermaid-source')?.textContent ?? ''
  if (entry.svg !== undefined) {
    // 成功也要保留源码（隐藏 pre），供主题切换时重渲染取源
    el.innerHTML =
      `<div class="mermaid-diagram">${entry.svg}</div>` +
      `<pre class="mermaid-source">${escapeHtml(source)}</pre>`
    el.classList.add('mermaid-rendered')
  } else {
    el.innerHTML =
      `<div class="mermaid-error-bar">Mermaid 渲染失败：${escapeHtml(entry.error ?? '未知错误')}</div>` +
      `<pre class="mermaid-source mermaid-source-visible">${escapeHtml(source)}</pre>`
    el.classList.add('mermaid-failed')
  }
}

export async function renderMermaidBlocks(root: HTMLElement, theme: Theme): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('.mermaid-placeholder'))
  const pending = blocks.filter((el) => !el.classList.contains('mermaid-rendered'))
  if (pending.length === 0) return
  const token = ++activeToken

  let mermaid: MermaidApi
  try {
    mermaid = await loadMermaid()
  } catch {
    // chunk 加载失败：降级为可见代码块
    for (const el of pending) {
      el.querySelector('.mermaid-source')?.classList.add('mermaid-source-visible')
    }
    return
  }
  ensureInitialized(mermaid, theme)

  const queue = [...pending]
  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const el = queue.shift()!
      const source = el.querySelector('.mermaid-source')?.textContent ?? ''
      const key = `${theme}\x00${source}`
      let entry = cache.get(key)
      if (!entry) {
        entry = await renderOne(mermaid, source)
        cache.set(key, entry)
      }
      if (token !== activeToken) continue // 过期：结果已缓存，跳过 DOM 写入
      if (!el.isConnected) continue
      applyEntry(el, entry)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

export function resetMermaidForTests(): void {
  cache.clear()
  mermaidPromise = null
  initializedTheme = null
  activeToken = 0
  idCounter = 0
}
