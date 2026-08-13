<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <button
    class="theme-toggle"
    :title="settings.theme === 'light' ? '切换到暗色' : '切换到亮色'"
    @click="settings.toggle()"
  >
    {{ settings.theme === 'light' ? '🌙' : '☀️' }}
  </button>
</template>

<style scoped>
.theme-toggle {
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}
.theme-toggle:hover {
  border-color: var(--accent);
}
</style>
