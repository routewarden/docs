<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGatewaySelection } from '../composables/useGatewaySelection'
import GatewaySelector from './GatewaySelector.vue'
import FileTabs, { type SnippetFile } from './FileTabs.vue'
import CopyButton from './CopyButton.vue'
import snippetsData from './setup-snippets.json'

const { activeGateway, activeTabIndex, gateways } = useGatewaySelection()

// Diff toggle — ON by default so diff highlights show
const showDiff = ref(true)

const availableGatewayKeys = computed(() => Object.keys(snippetsData))

const effectiveGateway = computed(() => {
  if (snippetsData[activeGateway.value as keyof typeof snippetsData]) {
    return activeGateway.value
  }
  return (availableGatewayKeys.value[0] || 'traefik') as keyof typeof snippetsData
})

const currentFiles = computed<SnippetFile[]>(() => {
  return (snippetsData as Record<string, SnippetFile[]>)[effectiveGateway.value] || []
})

const currentFile = computed<SnippetFile | null>(() => {
  const files = currentFiles.value
  if (files.length === 0) return null
  return files[activeTabIndex.value] || files[0]
})

// Check if current file has diff markup
const currentHasDiff = computed(() => {
  return currentFile.value?.html?.includes('diff add') || currentFile.value?.html?.includes('diff remove') || false
})
</script>

<template>
  <div class="rw-quick-setup-container">
    <div class="rw-quick-setup-box">
      <!-- Header bar with file tabs, Gateway Selector, diff toggle, and Copy button -->
      <div class="rw-setup-header">
        <div class="rw-setup-header-left">
          <FileTabs
            :files="currentFiles"
            v-model="activeTabIndex"
          />
        </div>

        <div class="rw-setup-header-right">
          <!-- Diff toggle — shown when current file has diff highlights -->
          <label v-if="currentHasDiff" class="rw-diff-toggle" title="Toggle diff highlighting">
            <input
              type="checkbox"
              v-model="showDiff"
              class="rw-diff-checkbox"
            />
            <span class="rw-diff-toggle-label">Diff</span>
          </label>

          <GatewaySelector
            :gateways="gateways"
            v-model="activeGateway"
          />

          <CopyButton
            v-if="currentFile"
            :code="currentFile.code"
          />
        </div>
      </div>

      <!-- Code block content with VitePress Shiki Syntax Highlighting -->
      <div
        v-if="currentFile"
        class="rw-setup-body"
        :class="{ 'rw-hide-diff': !showDiff }"
        v-html="currentFile.html"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.rw-quick-setup-container {
  margin: 1.5rem 0;
}

.rw-quick-setup-box {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.dark .rw-quick-setup-box {
  background: #0d1322;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.rw-setup-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 12px;
  flex-wrap: wrap;
  min-height: 38px;
}

.dark .rw-setup-header {
  background: rgba(15, 23, 42, 0.7);
  border-bottom-color: rgba(255, 255, 255, 0.07);
}

.rw-setup-header-left {
  display: flex;
  align-items: stretch;
  gap: 12px;
  overflow-x: auto;
  max-width: 100%;
}

.rw-setup-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 6px 0;
}

.rw-diff-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  user-select: none;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.rw-diff-toggle:hover {
  border-color: var(--vp-c-brand-1);
}

.dark .rw-diff-toggle {
  background: rgba(255, 255, 255, 0.04);
}

.rw-diff-checkbox {
  width: 11px;
  height: 11px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
  flex-shrink: 0;
}

.rw-diff-toggle-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  letter-spacing: 0.03em;
}

.rw-setup-body {
  overflow-x: auto;
}

@media (max-width: 640px) {
  .rw-setup-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .rw-setup-header-left {
    width: 100%;
  }
  .rw-setup-header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<!-- Non-scoped: styles for Shiki HTML injected via v-html inside .rw-setup-body.
     Values mirror the global code-block theme in custom.css exactly. -->
<style>
.rw-setup-body pre.shiki {
  margin: 0 !important;
  padding: 12px 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
  font-family: var(--vp-font-family-mono);
  font-size: 13px !important;
  white-space: pre;
  overflow-x: auto;
}

.rw-setup-body pre.shiki code {
  display: block;
  width: fit-content;
  min-width: 100%;
  box-sizing: border-box;
  line-height: 0; /* collapse \n text-nodes between .line spans */
}

.rw-setup-body .line {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0 18px;
  line-height: 1.5 !important;
}

.rw-setup-body .line:empty {
  height: 0.75em;
}

/* Diff gutter — identical to custom.css global rules */
.rw-setup-body pre.has-diff .line {
  padding: 0 18px 0 28px;
}

.rw-setup-body pre.has-diff .line.diff.add {
  background: rgba(16, 185, 129, 0.1) !important;
  border-left: 3px solid #10b981;
  padding: 0 18px 0 25px;
  position: relative;
}

.rw-setup-body pre.has-diff .line.diff.add::before {
  content: '+';
  position: absolute;
  left: 7px;
  top: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #10b981;
  line-height: inherit;
  user-select: none;
  pointer-events: none;
}

.dark .rw-setup-body pre.has-diff .line.diff.add {
  background: rgba(16, 185, 129, 0.13) !important;
  border-left-color: #34d399;
}

.dark .rw-setup-body pre.has-diff .line.diff.add::before {
  color: #34d399;
}

/* === Diff hidden state === */
/* When showDiff is false, suppress all diff styling so code reads as plain text */
.rw-setup-body.rw-hide-diff pre.has-diff .line,
.dark .rw-setup-body.rw-hide-diff pre.has-diff .line {
  padding-left: 18px !important;
}

.rw-setup-body.rw-hide-diff .line.diff.add,
.rw-setup-body.rw-hide-diff .line.diff.remove,
.dark .rw-setup-body.rw-hide-diff .line.diff.add,
.dark .rw-setup-body.rw-hide-diff .line.diff.remove,
.rw-setup-body.rw-hide-diff pre.has-diff .line.diff.add,
.rw-setup-body.rw-hide-diff pre.has-diff .line.diff.remove,
.dark .rw-setup-body.rw-hide-diff pre.has-diff .line.diff.add,
.dark .rw-setup-body.rw-hide-diff pre.has-diff .line.diff.remove {
  background: transparent !important;
  border-left: none !important;
  border-left-color: transparent !important;
  padding-left: 18px !important;
  opacity: 1 !important;
}

.rw-setup-body.rw-hide-diff .line.diff.add::before,
.rw-setup-body.rw-hide-diff .line.diff.remove::before,
.dark .rw-setup-body.rw-hide-diff .line.diff.add::before,
.dark .rw-setup-body.rw-hide-diff .line.diff.remove::before,
.rw-setup-body.rw-hide-diff pre.has-diff .line.diff.add::before,
.rw-setup-body.rw-hide-diff pre.has-diff .line.diff.remove::before,
.dark .rw-setup-body.rw-hide-diff pre.has-diff .line.diff.add::before,
.dark .rw-setup-body.rw-hide-diff pre.has-diff .line.diff.remove::before {
  display: none !important;
  content: none !important;
}
</style>
