<script setup lang="ts">
export interface ConfirmButton {
  label: string
  value: string
  primary?: boolean
}

defineProps<{ message: string; buttons: ConfirmButton[] }>()
const emit = defineEmits<{ (e: 'resolve', value: string): void }>()
</script>

<template>
  <div class="overlay" @click.self="emit('resolve', 'cancel')">
    <div class="dialog">
      <p class="message">{{ message }}</p>
      <div class="actions">
        <button
          v-for="b in buttons"
          :key="b.value"
          :class="{ primary: b.primary }"
          @click="emit('resolve', b.value)"
        >
          {{ b.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  background: var(--bg-editor);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  min-width: 320px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}
.message {
  margin: 0 0 16px;
  font-size: 14px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-primary);
  border-radius: 6px;
  padding: 5px 14px;
  cursor: pointer;
  font-size: 13px;
}
button.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
