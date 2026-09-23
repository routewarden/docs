<script setup lang="ts">
import { STANDARD_METHODS } from './rules'

const props = defineProps<{
  inspectedMethods: string[]
  allStandardMethodsSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-method', method: string): void
  (e: 'toggle-all'): void
}>()

const enableDefaultPatterns = defineModel<boolean>('enableDefaultPatterns', { required: true })
const enableDefaultAllowPatterns = defineModel<boolean>('enableDefaultAllowPatterns', { required: true })
const checkQuery = defineModel<boolean>('checkQuery', { required: true })
const enabled = defineModel<boolean>('enabled', { required: true })
const debug = defineModel<boolean>('debug', { required: true })
const securityLog = defineModel<boolean>('securityLog', { required: true })
const checkHeadersInput = defineModel<string>('checkHeadersInput', { required: true })
const allowedIpsInput = defineModel<string>('allowedIpsInput', { required: true })
const methodsInput = defineModel<string>('methodsInput', { required: true })
</script>

<template>
  <div class="rw-block">
    <div class="rw-row-header">
      <span class="rw-title">Middleware Options</span>
    </div>

    <div class="rw-flags-line">
      <label class="rw-check">
        <input v-model="enableDefaultPatterns" type="checkbox" />
        <span>Built-in Blocklist</span>
      </label>
      <label class="rw-check">
        <input v-model="enableDefaultAllowPatterns" type="checkbox" />
        <span>Built-in Allowlist</span>
      </label>
      <label class="rw-check">
        <input v-model="checkQuery" type="checkbox" />
        <span>Check Query</span>
      </label>
      <label class="rw-check">
        <input v-model="enabled" type="checkbox" />
        <span>Enabled</span>
      </label>
      <label class="rw-check">
        <input v-model="debug" type="checkbox" />
        <span>Debug</span>
      </label>
      <label class="rw-check" title="Emit single-line structured JSON security events on stdout for CrowdSec and SIEM">
        <input v-model="securityLog" type="checkbox" />
        <span>Security Log (CrowdSec)</span>
      </label>
      <div class="rw-inline-ip" title="Inspect custom HTTP headers for path smuggling (e.g. X-Forwarded-Uri, X-Rewrite-URL)">
        <span>Check Headers:</span>
        <input v-model="checkHeadersInput" placeholder="X-Forwarded-Uri, X-Rewrite-URL" />
      </div>
      <div class="rw-inline-ip">
        <span>Allowed IPs:</span>
        <input v-model="allowedIpsInput" placeholder="127.0.0.1, 10.0.0.0/8" />
      </div>
    </div>

    <!-- Enhanced HTTP Verbs Selector Row -->
    <div class="rw-verbs-selector-bar">
      <div class="rw-vsb-header">
        <span class="rw-vsb-label">Inspect HTTP Verbs (<code>methods</code>):</span>
        <span class="rw-vsb-desc">Non-selected verbs bypass inspection and forward directly to upstream backends</span>
      </div>
      <div class="rw-vsb-controls">
        <div class="rw-vsb-pills">
          <button
            v-for="m in STANDARD_METHODS"
            :key="m"
            type="button"
            class="rw-vsb-pill"
            :class="{ active: inspectedMethods.includes(m) }"
            :title="inspectedMethods.includes(m) ? `Click to exclude ${m} from inspection` : `Click to inspect ${m} requests`"
            @click="emit('toggle-method', m)"
          >
            <span class="rw-vsb-mark">{{ inspectedMethods.includes(m) ? '✓' : '+' }}</span>
            <span class="rw-vsb-name">{{ m }}</span>
          </button>
        </div>
        <div class="rw-vsb-actions">
          <button
            type="button"
            class="rw-vsb-all-btn"
            @click="emit('toggle-all')"
          >
            {{ allStandardMethodsSelected ? 'GET Only' : 'Select All' }}
          </button>
          <input
            v-model="methodsInput"
            class="rw-vsb-input"
            placeholder="Custom verbs: e.g. GET, POST"
            title="Comma-separated inspected HTTP verbs"
          />
        </div>
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

.rw-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rw-flags-line {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 11px;
  color: var(--vp-c-text-2);
  flex-wrap: wrap;
}
.rw-check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  user-select: none;
}
.rw-check input { cursor: pointer; }

.rw-inline-ip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.rw-inline-ip input {
  width: 170px;
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  outline: none;
}
.rw-inline-ip input:focus { border-color: var(--vp-c-brand-1); }

/* Enhanced Verbs Selector */
.rw-verbs-selector-bar {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px dashed var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rw-vsb-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-vsb-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rw-vsb-desc {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.rw-vsb-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-vsb-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.rw-vsb-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rw-vsb-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.rw-vsb-pill.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.rw-vsb-mark {
  font-size: 9px;
  font-weight: 800;
}

.rw-vsb-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-vsb-all-btn {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.rw-vsb-all-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.rw-vsb-input {
  width: 140px;
  font-size: 10.5px;
  font-family: var(--vp-font-family-mono);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
}

.rw-vsb-input:focus {
  border-color: var(--vp-c-brand-1);
}
</style>
