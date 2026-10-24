<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ initial: string; count: number; current: number }>()
const emit = defineEmits<{
  (e: 'query', value: string): void
  (e: 'next'): void
  (e: 'prev'): void
  (e: 'close'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const text = ref(props.initial)

function refocus(): void {
  inputRef.value?.focus()
  inputRef.value?.select()
}

function onInput(e: Event): void {
  text.value = (e.target as HTMLInputElement).value
  emit('query', text.value)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.isComposing) return // 输入法确认候选的 Enter/Esc 不触发搜索操作
  if (e.key === 'Enter') {
    e.preventDefault()
    emit(e.shiftKey ? 'prev' : 'next')
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(refocus)
defineExpose({ refocus })
</script>

<template>
  <div class="search-bar" role="search" aria-label="预览搜索" @keydown="onKeydown">
    <input
      ref="inputRef"
      class="search-input"
      :class="{ 'no-hit': text !== '' && count === 0 }"
      :value="text"
      type="text"
      placeholder="搜索…"
      aria-label="搜索预览文本"
      @input="onInput"
    />
    <span
      v-if="text"
      class="search-count"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      >{{ count === 0 ? '0/0' : `${current + 1}/${count}` }}</span
    >
    <button
      class="search-btn"
      type="button"
      title="上一个（Shift+Enter）"
      aria-label="上一个命中"
      @click="emit('prev')"
    >
      ↑
    </button>
    <button
      class="search-btn"
      type="button"
      title="下一个（Enter）"
      aria-label="下一个命中"
      @click="emit('next')"
    >
      ↓
    </button>
    <button
      class="search-btn"
      type="button"
      title="关闭（Esc）"
      aria-label="关闭搜索"
      @click="emit('close')"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.search-bar {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--bg-sidebar);
  border: 1px solid var(--control-border);
  border-radius: var(--control-radius);
  box-shadow: var(--paper-shadow);
}
.search-input {
  width: 180px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  border-bottom: 1.5px solid transparent;
}
.search-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.search-input.no-hit {
  border-bottom-color: var(--error-text);
}
.search-count {
  min-width: 36px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}
.search-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 5px;
  border-radius: 4px;
  cursor: pointer;
}
.search-btn:hover {
  background: var(--control-hover-bg);
  color: var(--text-primary);
}
</style>
