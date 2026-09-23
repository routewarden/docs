<script setup lang="ts">
import { PRESETS, type PresetItem } from './rules'

defineProps<{
  evaluation: {
    verdict: string
    badgeClass: string
    normalizedPath: string
    transformations: string[]
  }
  shareFeedback: boolean
}>()

const emit = defineEmits<{
  (e: 'apply-preset', preset: PresetItem): void
  (e: 'copy-share'): void
}>()

const testMethod = defineModel<string>('testMethod', { required: true })
const testPath = defineModel<string>('testPath', { required: true })
const testIp = defineModel<string>('testIp', { required: true })
</script>

<template>
  <div class="rw-block">
    <div class="rw-input-bar">
      <div class="rw-input-main">
        <select v-model="testMethod" class="rw-method-select" title="Simulated HTTP request verb">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
        <input
          v-model="testPath"
          class="rw-url-input"
          placeholder="/admin/.env"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="rw-input-extra">
        <input
          v-model="testIp"
          class="rw-ip-input"
          placeholder="Client IP"
          title="Simulated Client IP"
        />
        <div class="rw-verdict-tag" :class="evaluation.badgeClass">
          {{ evaluation.verdict }}
        </div>
      </div>
    </div>

    <!-- Quick sample presets, normalization trace & Share Deeplink -->
    <div class="rw-sub-bar">
      <div class="rw-presets">
        <span class="rw-dim">Try:</span>
        <button
          v-for="p in PRESETS"
          :key="p.label"
          type="button"
          class="rw-preset-pill"
          @click="emit('apply-preset', p)"
        >{{ p.label }}</button>
      </div>

      <div class="rw-sub-actions">
        <div v-if="evaluation.transformations.length > 0" class="rw-norm-info">
          <span class="rw-dim">Anti-Evasion:</span>
          <code>{{ evaluation.normalizedPath }}</code>
          <span class="rw-norm-text">({{ evaluation.transformations.join(', ') }})</span>
        </div>
        <button
          type="button"
          class="rw-btn-share-link"
          :class="{ copied: shareFeedback }"
          title="Copy shareable link with current playground parameters"
          @click="emit('copy-share')"
        >
          <span v-if="shareFeedback" class="rw-share-icon">✓</span>
          <span>{{ shareFeedback ? 'Link Copied' : 'Share Link' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-block {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rw-input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px 6px;
  transition: border-color 0.15s ease;
}
.rw-input-bar:focus-within {
  border-color: var(--vp-c-brand-1);
}

.rw-input-main {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1;
  min-width: 0;
}

.rw-input-extra {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.rw-method-select {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-brand-soft);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.rw-method-select:hover {
  border-color: var(--vp-c-brand-1);
}

.rw-method-select:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.rw-url-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  padding: 4px 2px;
}

.rw-ip-input {
  width: 120px;
  flex-shrink: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-2);
  padding: 4px 6px;
  border-left: 1px solid var(--vp-c-divider);
  text-align: right;
}

.rw-verdict-tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.verdict-block { background: rgba(239,68,68,0.15); color: #dc2626; }
.dark .verdict-block { color: #f87171; }
.verdict-allow { background: rgba(16,185,129,0.15); color: #059669; }
.dark .verdict-allow { color: #34d399; }
.verdict-bypass { background: rgba(56,189,248,0.15); color: #0284c7; }
.dark .verdict-bypass { color: #38bdf8; }
.verdict-pass { background: rgba(100,116,139,0.15); color: #475569; }
.dark .verdict-pass { color: #94a3b8; }

.rw-sub-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 11px;
  flex-wrap: wrap;
}

.rw-presets {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.rw-dim { color: var(--vp-c-text-2); font-weight: 600; font-size: 10.5px; }

.rw-preset-pill {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.12s;
}
.rw-preset-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rw-norm-info {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 11px;
}
.rw-norm-info code {
  color: var(--vp-c-brand-1);
  font-size: 11px;
}
.rw-norm-text {
  color: var(--vp-c-text-2);
  font-size: 10px;
}

.rw-sub-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.rw-btn-share-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 11px;
  font-weight: 600;
  padding: 2.5px 9px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-brand-1);
  background: rgba(99, 102, 241, 0.08);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.rw-btn-share-link:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.rw-btn-share-link.copied {
  border-color: #059669;
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}
.dark .rw-btn-share-link.copied {
  color: #34d399;
}
.rw-share-icon {
  font-size: 11px;
}

@media (max-width: 680px) {
  .rw-input-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    padding: 6px 8px;
  }

  .rw-input-main {
    width: 100%;
    min-width: 0;
    gap: 0.4rem;
  }

  .rw-url-input {
    width: 100%;
    flex: 1;
    min-width: 0;
    font-size: 13px;
  }

  .rw-input-extra {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 5px;
    border-top: 1px solid var(--vp-c-divider);
  }

  .rw-ip-input {
    width: auto;
    flex: 1;
    min-width: 0;
    border-left: none;
    padding: 2px 4px;
    text-align: left;
    font-size: 11.5px;
  }
}
</style>
