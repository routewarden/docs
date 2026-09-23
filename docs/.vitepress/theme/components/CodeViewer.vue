<script setup lang="ts">
import { ref, computed, useSlots } from 'vue'
import { useGatewaySelection, type GatewayId } from '../composables/useGatewaySelection'
import GatewaySelector from './GatewaySelector.vue'
import CopyButton from './CopyButton.vue'

export interface CodeViewerSnippet {
  filename: string
  lang?: string
  code: string
  html?: string
  /** If true, this file has diff markup and benefits from the diff toggle */
  hasDiff?: boolean
}

export type CodeViewerSnippets = Record<string, CodeViewerSnippet[] | CodeViewerSnippet>

const props = withDefaults(
  defineProps<{
    snippets?: CodeViewerSnippets
  }>(),
  {
    snippets: undefined
  }
)

const slots = useSlots()
const { activeGateway, activeTabIndex, gateways } = useGatewaySelection()

// Diff toggle — OFF by default so diff highlights show
const showDiff = ref(true)

// Available gateway keys detected from either snippets prop or available slots
const availableGateways = computed(() => {
  const recognized = new Set<string>()

  if (props.snippets) {
    Object.keys(props.snippets).forEach(key => recognized.add(key))
  }

  // Also check named slots like #traefik, #caddy, #nginx, #cli
  gateways.forEach(g => {
    if (slots[g.id]) {
      recognized.add(g.id)
    }
  })

  // Filter to keep canonical order of GATEWAYS
  const filtered = gateways.filter(g => recognized.has(g.id))
  return filtered.length > 0 ? filtered : gateways
})

// If activeGateway is present among availableGateways, use it.
// Otherwise, auto-select the first available gateway for this code viewer so it never renders empty.
const effectiveGateway = computed<GatewayId>(() => {
  const list = availableGateways.value
  if (list.length === 0) return activeGateway.value
  const found = list.find(g => g.id === activeGateway.value)
  return found ? found.id : list[0].id
})

// Current snippet files for active gateway (if using snippets prop)
const currentFiles = computed<CodeViewerSnippet[]>(() => {
  if (!props.snippets) return []
  const entry = props.snippets[effectiveGateway.value] || props.snippets[Object.keys(props.snippets)[0]]
  if (!entry) return []
  return Array.isArray(entry) ? entry : [entry]
})

// Local tab index for this specific code viewer
const activeFileIndex = ref(0)

// Guarded index to ensure we never point outside currentFiles
const safeFileIndex = computed(() => {
  if (currentFiles.value.length === 0) return 0
  return (activeFileIndex.value >= 0 && activeFileIndex.value < currentFiles.value.length)
    ? activeFileIndex.value
    : 0
})

const currentFile = computed<CodeViewerSnippet | null>(() => {
  if (currentFiles.value.length === 0) return null
  return currentFiles.value[safeFileIndex.value] || currentFiles.value[0]
})

// Whether any file in the current gateway has diff markup
const currentHasDiff = computed(() => {
  return currentFiles.value.some(f => f.hasDiff)
})

// When switching gateways via the selector in this CodeViewer, update page gateway
function handleGatewayChange(newGw: GatewayId) {
  activeFileIndex.value = 0
  activeGateway.value = newGw
}
</script>

<template>
  <div class="rw-code-viewer-container">
    <div class="rw-code-viewer-box">
      <!-- Header bar with tabs, Gateway Selector, diff toggle, and Copy button -->
      <div class="rw-code-viewer-header" ref="headerRef">
        <div class="rw-code-viewer-header-left">
          <!-- File tabs — shown for any snippets-based content (1 or more files) -->
          <div
            v-if="currentFiles.length > 0"
            class="rw-file-tabs"
            role="tablist"
            aria-label="Configuration files"
          >
            <button
              v-for="(file, idx) in currentFiles"
              :key="file.filename"
              role="tab"
              type="button"
              class="rw-file-tab"
              :class="{ active: safeFileIndex === idx }"
              :aria-selected="safeFileIndex === idx"
              @click="activeFileIndex = idx"
            >
              <span class="rw-tab-title">{{ file.filename }}</span>
            </button>
          </div>

          <!-- Mount point for lifted inner markdown tabs -->
          <div class="rw-slot-tabs-mount" ref="tabsMountRef"></div>

          <!-- Fallback: header-left slot -->
          <slot name="header-left" />
        </div>

        <div class="rw-code-viewer-header-right">
          <!-- Diff toggle — only shown when current gateway has diff content -->
          <label v-if="currentHasDiff" class="rw-diff-toggle" title="Toggle diff highlighting">
            <input
              type="checkbox"
              v-model="showDiff"
              class="rw-diff-checkbox"
            />
            <span class="rw-diff-toggle-label">Diff</span>
          </label>

          <GatewaySelector
            v-if="availableGateways.length > 1"
            :gateways="availableGateways"
            :model-value="effectiveGateway"
            @update:model-value="handleGatewayChange"
          />

          <CopyButton
            v-if="currentFile"
            :code="currentFile.code"
          />
        </div>
      </div>

      <!-- Code block content -->
      <div class="rw-code-viewer-body" :class="{ 'rw-hide-diff': !showDiff }" ref="bodyRef">
        <!-- If snippets prop is passed with pre-rendered HTML -->
        <div
          v-if="currentFile && currentFile.html"
          class="rw-snippet-html"
          v-html="currentFile.html"
        ></div>

        <pre v-else-if="currentFile" class="rw-raw-pre"><code>{{ currentFile.code }}</code></pre>

        <!-- Or if slot-based content is passed (markdown code blocks) -->
        <div v-else class="rw-slot-body">
          <div v-if="effectiveGateway === 'traefik' && slots.traefik">
            <slot name="traefik" />
          </div>
          <div v-else-if="effectiveGateway === 'caddy' && slots.caddy">
            <slot name="caddy" />
          </div>
          <div v-else-if="effectiveGateway === 'nginx' && slots.nginx">
            <slot name="nginx" />
          </div>
          <div v-else-if="effectiveGateway === 'cli' && slots.cli">
            <slot name="cli" />
          </div>
          <div v-else>
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-code-viewer-container {
  margin: 1.5rem 0;
}

.rw-code-viewer-box {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.dark .rw-code-viewer-box {
  background: #0d1322;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.rw-code-viewer-header {
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

.dark .rw-code-viewer-header {
  background: rgba(15, 23, 42, 0.7);
  border-bottom-color: rgba(255, 255, 255, 0.07);
}

.rw-code-viewer-header-left {
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  max-width: 100%;
  flex: 1;
  min-width: 0;
}

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

.rw-code-viewer-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 6px 0;
}

/* Diff toggle checkbox */
.rw-diff-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  user-select: none;
  padding: 2px 6px;
  border-radius: 4px;
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

.rw-code-viewer-body {
  overflow-x: auto;
}

.rw-raw-pre {
  margin: 0 !important;
  padding: 12px 18px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 13px !important;
  line-height: 1.5 !important;
}

/* Snippet HTML rendering — mirrors VitePress code block styles */
.rw-snippet-html {
  overflow-x: auto;
}

/* Reset all inner markdown blocks & code-groups when placed inside CodeViewer */
.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-']),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group div[class*='language-']) {
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding-top: 0 !important;
  background: transparent !important;
}

.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-']::before),
.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-']::after),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group div[class*='language-']::before),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group div[class*='language-']::after) {
  display: none !important;
}

.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-'] .lang) {
  display: none !important;
}

/* Hide the duplicate copy button from the inner code block */
.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-'] .copy) {
  display: none !important;
}

/* Hide duplicate gateway select inside inner code-groups */
.rw-code-viewer-container :deep(.rw-slot-body .rw-group-gateway-wrapper) {
  display: none !important;
}

/* Snippet HTML — pre block styling */
.rw-code-viewer-container :deep(.rw-snippet-html pre) {
  margin: 0 !important;
  padding: 12px 18px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 13px !important;
  /* No line-height here — each .line span owns its own height */
  overflow-x: auto;
}

/* Collapse whitespace text-nodes so display:block .line spans sit flush */
.rw-code-viewer-container :deep(.rw-snippet-html pre code) {
  line-height: 0;
}

/* Each line span restores its own line-height — continuous, no gaps */
.rw-code-viewer-container :deep(.rw-snippet-html .line) {
  display: block;
  line-height: 1.5;
}

/* Empty lines get a compact gap (same as VitePress) */
.rw-code-viewer-container :deep(.rw-snippet-html .line:empty) {
  height: 0.75em;
}

.rw-code-viewer-container :deep(.rw-snippet-html pre.has-diff),
.rw-code-viewer-container :deep(.rw-snippet-html pre:has(.line.diff)) {
  padding-left: 28px !important;
}

.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add) {
  background: rgba(16, 185, 129, 0.1);
  margin: 0 -18px 0 -28px;
  padding: 0 18px 0 28px;
  border-left: 3px solid #10b981;
  position: relative;
}

.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add::before) {
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

.dark .rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add) {
  background: rgba(16, 185, 129, 0.13);
  border-left-color: #34d399;
}

.dark .rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add::before) {
  color: #34d399;
}

.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.remove) {
  background: rgba(239, 68, 68, 0.08);
  margin: 0 -18px 0 -28px;
  padding: 0 18px 0 28px;
  border-left: 3px solid #ef4444;
  position: relative;
  opacity: 0.7;
}

.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.remove::before) {
  content: '-';
  position: absolute;
  left: 7px;
  top: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #ef4444;
  line-height: inherit;
  user-select: none;
  pointer-events: none;
}

/* === Diff hidden state === */
/* When showDiff is false, suppress all diff styling so code reads as plain text */
.rw-hide-diff :deep(.line.diff.add),
.rw-hide-diff :deep(.line.diff.remove),
.dark .rw-hide-diff :deep(.line.diff.add),
.dark .rw-hide-diff :deep(.line.diff.remove) {
  background: transparent !important;
  border-left: none !important;
  border-left-color: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 1 !important;
}

.rw-hide-diff :deep(.line.diff.add::before),
.rw-hide-diff :deep(.line.diff.remove::before),
.dark .rw-hide-diff :deep(.line.diff.add::before),
.dark .rw-hide-diff :deep(.line.diff.remove::before) {
  display: none !important;
  content: none !important;
}

/* Restore normal left padding when diff is hidden */
.rw-hide-diff :deep(pre.has-diff),
.rw-hide-diff :deep(pre:has(.line.diff)),
.dark .rw-hide-diff :deep(pre.has-diff),
.dark .rw-hide-diff :deep(pre:has(.line.diff)) {
  padding-left: 18px !important;
}

@media (max-width: 640px) {
  .rw-code-viewer-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .rw-code-viewer-header-left {
    width: 100%;
  }
  .rw-code-viewer-header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<!-- Unscoped: token styles for v-html snippet content -->
<style>
.rw-snippet-html pre { tab-size: 2; }
.rw-snippet-html .tok-comment { color: #94a3b8; font-style: italic; }
.dark .rw-snippet-html .tok-comment { color: #64748b; }
.rw-snippet-html .tok-keyword { color: #7c3aed; font-weight: 600; }
.dark .rw-snippet-html .tok-keyword { color: #c084fc; }
.rw-snippet-html .tok-section { color: #6d28d9; font-weight: 700; }
.dark .rw-snippet-html .tok-section { color: #d8b4fe; }
.rw-snippet-html .tok-key { color: #0284c7; font-weight: 600; }
.dark .rw-snippet-html .tok-key { color: #38bdf8; }
.rw-snippet-html .tok-str { color: #059669; }
.dark .rw-snippet-html .tok-str { color: #34d399; }
.rw-snippet-html .tok-num { color: #d97706; font-weight: 600; }
.dark .rw-snippet-html .tok-num { color: #fbbf24; }
.rw-snippet-html .tok-bool { color: #db2777; font-weight: 600; }
.dark .rw-snippet-html .tok-bool { color: #f472b6; }
.rw-snippet-html .tok-verb { color: #2563eb; font-weight: 700; }
.dark .rw-snippet-html .tok-verb { color: #60a5fa; }
.rw-snippet-html .tok-punct { color: var(--vp-c-text-3); }
.rw-snippet-html .tok-val { color: var(--vp-c-text-1); }
</style>
