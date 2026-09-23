<script setup lang="ts">
export interface SnippetFile {
  filename: string
  lang: string
  code: string
  html: string
}

defineProps<{
  files: SnippetFile[]
}>()

const activeIndex = defineModel<number>({ required: true })
</script>

<template>
  <div class="rw-file-tabs" role="tablist" aria-label="Configuration files">
    <button
      v-for="(file, idx) in files"
      :key="file.filename"
      role="tab"
      type="button"
      class="rw-file-tab"
      :class="{ active: activeIndex === idx }"
      :aria-selected="activeIndex === idx"
      @click="activeIndex = idx"
    >
      <svg
        v-if="file.filename.toLowerCase().includes('terminal')"
        class="rw-file-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
      <svg
        v-else-if="file.filename.endsWith('.yml') || file.filename.endsWith('.yaml')"
        class="rw-file-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      <svg
        v-else
        class="rw-file-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span class="rw-tab-title">{{ file.filename }}</span>
    </button>
  </div>
</template>

<style scoped>
.rw-file-tabs {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
}

.rw-file-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 100%;
  min-height: 38px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
  position: relative;
}

.rw-file-tab:hover {
  color: var(--vp-c-text-1);
  border-bottom-color: var(--vp-c-divider);
}

.dark .rw-file-tab:hover {
  border-bottom-color: rgba(255, 255, 255, 0.15);
}

.rw-file-tab.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  border-bottom-color: var(--vp-c-brand-1);
}

.dark .rw-file-tab.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
}

.rw-file-icon {
  opacity: 0.6;
  flex-shrink: 0;
}

.rw-file-tab:hover .rw-file-icon,
.rw-file-tab.active .rw-file-icon {
  opacity: 1;
}

.rw-tab-title {
  display: inline-block;
}
</style>
