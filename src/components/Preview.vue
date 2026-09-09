<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { renderMarkdown } from '@/composables/useMarkdown'
import { renderMermaidBlocks } from '@/composables/useMermaid'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import type { RenderResult, TocItem } from '@/types'

const tabs = useTabsStore()
const settings = useSettingsStore()

const rootEl = ref<HTMLElement | null>(null)
const scrollerEl = ref<HTMLElement | null>(null)
const result = ref<RenderResult>({ html: '', toc: [] })
const tocItems = ref<TocItem[]>([])

let timer: ReturnType<typeof setTimeout> | undefined
let renderSeq = 0 // 渲染管线改为异步后，防止旧结果晚到覆盖新结果
let firstRenderDone = false

async function renderNow(): Promise<void> {
  const seq = ++renderSeq
  const content = tabs.activeTab?.content ?? ''
  let next: RenderResult
  try {
    next = await renderMarkdown(content)
  } catch {
    return // 渲染管线异常：保留上一帧，绝不白屏
  }
  if (seq !== renderSeq) return // 已有更新的渲染在途，丢弃本帧
  result.value = next
  tocItems.value = next.toc
  await nextTick()
  if (seq !== renderSeq) return
  if (rootEl.value) await renderMermaidBlocks(rootEl.value, settings.theme)
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
  // 滚动发生在包装层（阅读模式下它是纸张外围 backdrop），不是纸张本体
  return scrollerEl.value
}

function bodyHtml(): string {
  return rootEl.value?.innerHTML ?? ''
}

defineExpose({ tocItems, scrollToHeading, scrollEl, bodyHtml })
</script>

<template>
  <div ref="scrollerEl" class="preview-scroll">
    <div ref="rootEl" class="preview-pane markdown-body" v-html="result.html"></div>
  </div>
</template>
