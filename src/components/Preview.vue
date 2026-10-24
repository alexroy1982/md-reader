<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { renderMarkdown } from '@/composables/useMarkdown'
import { renderMermaidBlocks } from '@/composables/useMermaid'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import { findMatches, applyHighlights, type AppliedHighlights } from '@/lib/previewSearch'
import SearchBar from '@/components/SearchBar.vue'
import type { RenderResult, TocItem } from '@/types'

const tabs = useTabsStore()
const settings = useSettingsStore()

const rootEl = ref<HTMLElement | null>(null)
const scrollerEl = ref<HTMLElement | null>(null)
const result = ref<RenderResult>({ html: '', toc: [] })
const tocItems = ref<TocItem[]>([])

let timer: ReturnType<typeof setTimeout> | undefined
let renderSeq = 0
let firstRenderDone = false

// ---- 预览搜索状态（编排都在这里，SearchBar 只管 UI）----
const searchOpen = ref(false)
const searchQuery = ref('')
const searchCount = ref(0)
const searchIndex = ref(0)
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let highlights: AppliedHighlights | null = null

function clearHighlights(): void {
  highlights?.cleanup()
  highlights = null
}

function runSearchNow(scroll = true): void {
  clearTimeout(searchTimer)
  searchTimer = undefined
  clearHighlights()
  const q = searchQuery.value
  if (!q || !rootEl.value) {
    searchCount.value = 0
    searchIndex.value = 0
    return
  }
  const applied = applyHighlights(findMatches(rootEl.value, q))
  highlights = applied
  searchCount.value = applied.marks.length
  searchIndex.value = Math.min(searchIndex.value, Math.max(searchCount.value - 1, 0))
  focusCurrent(scroll)
}

function focusCurrent(scroll = true): void {
  if (!highlights || searchCount.value === 0) return
  highlights.marks.forEach((m, i) =>
    m.classList.toggle('pv-search-hit-current', i === searchIndex.value)
  )
  if (scroll) {
    highlights.marks[searchIndex.value]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function stepSearch(dir: 1 | -1): void {
  if (searchTimer !== undefined) {
    runSearchNow()
    return
  }
  if (!highlights || searchCount.value === 0) return
  searchIndex.value = (searchIndex.value + dir + searchCount.value) % searchCount.value
  focusCurrent()
}

function onSearchQuery(value: string): void {
  searchQuery.value = value
  searchIndex.value = 0
  clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearchNow, 150)
}

function openSearch(): void {
  if (searchOpen.value) {
    searchBarRef.value?.refocus()
    return
  }
  searchOpen.value = true
  runSearchNow() // 重新打开时恢复预填词的高亮与计数
}

function closeSearch(): void {
  searchOpen.value = false
  clearTimeout(searchTimer) // 关闭前未到期的 debounce 不能重新生成高亮
  searchTimer = undefined
  clearHighlights()
  searchCount.value = 0
  searchIndex.value = 0
}

// 切回编辑模式：搜索是阅读模式功能，自动收摊
watch(
  () => settings.editorVisible,
  (v) => {
    if (v) closeSearch()
  }
)

async function renderNow(): Promise<void> {
  const seq = ++renderSeq
  const content = tabs.activeTab?.content ?? ''
  let next: RenderResult
  try {
    next = await renderMarkdown(content)
  } catch {
    return // 渲染管线异常：保留上一帧，绝不白屏
  }
  if (seq !== renderSeq) return
  result.value = next
  tocItems.value = next.toc
  await nextTick()
  if (seq !== renderSeq) return
  // v-html 已替换正文：立即使旧 mark 引用和导航失效，计数保留到重跑完成
  clearHighlights()
  if (rootEl.value) await renderMermaidBlocks(rootEl.value, settings.theme)
  if (seq !== renderSeq) return
  // 搜索激活时在最新 DOM 上重跑，索引 clamp；后台重跑不抢占滚动位置
  if (searchOpen.value && searchQuery.value) runSearchNow(false)
  if (!firstRenderDone) {
    firstRenderDone = true
    performance.mark('app:first-render-done')
  }
}

watch(
  () => tabs.activeTab?.content,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => void renderNow(), 150)
  },
  { immediate: true }
)

// 主题切换：整体重渲染（markdown 重跑成本极低，mermaid 缓存 key 含主题会自动失效重绘）
// 不能只调 renderMermaidBlocks——已渲染块带 mermaid-rendered class 会被跳过，
// 而占位符是 v-html 重新生成的，必须走完整 renderNow 才能拿到新主题的图。
watch(
  () => settings.theme,
  () => void renderNow()
)

onMounted(() => void renderNow())

function scrollToHeading(slug: string): void {
  rootEl.value
    ?.querySelector(`#${CSS.escape(slug)}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollEl(): HTMLElement | null {
  return scrollerEl.value
}

function bodyHtml(): string {
  const el = rootEl.value
  if (!el) return ''
  // 导出必须剥离搜索高亮：在 clone 上还原纯文本，不影响屏幕上的高亮状态
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('mark.pv-search-hit').forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent ?? ''))
  })
  return clone.innerHTML
}

defineExpose({ tocItems, scrollToHeading, scrollEl, bodyHtml, openSearch })
</script>

<template>
  <div class="preview-host">
    <SearchBar
      v-if="searchOpen"
      ref="searchBarRef"
      :initial="searchQuery"
      :count="searchCount"
      :current="searchIndex"
      @query="onSearchQuery"
      @next="stepSearch(1)"
      @prev="stepSearch(-1)"
      @close="closeSearch"
    />
    <div ref="scrollerEl" class="preview-scroll">
      <div ref="rootEl" class="preview-pane markdown-body" v-html="result.html"></div>
    </div>
  </div>
</template>
