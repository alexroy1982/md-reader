<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRecentsStore } from '@/stores/recents'

const recents = useRecentsStore()
const emit = defineEmits<{ (e: 'open', path: string): void }>()
const open = ref(false)

function onDocClick(): void {
  open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="recents" @click.stop>
    <button @click="open = !open">最近打开</button>
    <div v-if="open" class="menu">
      <div v-if="recents.items.length === 0" class="empty">暂无记录</div>
      <div
        v-for="item in recents.items"
        :key="item.path"
        class="item"
        :title="item.path"
        @click="emit('open', item.path); open = false"
      >
        {{ item.name }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.recents {
  position: relative;
}
button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-primary);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
}
.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-editor);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 50;
}
.empty {
  padding: 10px 12px;
  color: var(--text-secondary);
  font-size: 13px;
}
.item {
  padding: 7px 12px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item:hover {
  background: var(--bg-sidebar);
  color: var(--accent);
}
</style>
