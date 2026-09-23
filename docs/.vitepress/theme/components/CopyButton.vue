<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    code: string
    title?: string
  }>(),
  {
    title: 'Copy code'
  }
)

const copied = ref(false)

function copy() {
  if (typeof navigator !== 'undefined' && navigator.clipboard && props.code) {
    navigator.clipboard.writeText(props.code).then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    })
  }
}
</script>

<template>
  <button
    type="button"
    class="rw-copy-btn"
    :class="{ copied }"
    :title="copied ? 'Copied to clipboard' : title"
    @click="copy"
  >
    <span v-if="copied" class="rw-copy-text">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied
    </span>
    <span v-else class="rw-copy-text">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </span>
  </button>
</template>

<style scoped>
.rw-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dark .rw-copy-btn {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--vp-c-text-2);
}

.rw-copy-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rw-copy-btn.copied {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}

.rw-copy-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
