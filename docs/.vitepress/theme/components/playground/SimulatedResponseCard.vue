<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  response: {
    statusCode: number
    statusText: string
    headers: Record<string, string>
    body: string
    note?: string
  }
  evaluation: {
    verdict: string
    badgeClass: string
    normalizedPath: string
    reason: string
  }
  testMethod: string
}>()

const copyResponseSuccess = ref(false)

async function copyResponse() {
  try {
    const r = props.response
    let text = `${props.testMethod} ${props.evaluation.normalizedPath} HTTP/1.1\n`
    text += `HTTP/1.1 ${r.statusCode} ${r.statusText}\n`
    for (const [k, v] of Object.entries(r.headers)) {
      text += `${k}: ${v}\n`
    }
    if (r.body) {
      text += `\n${r.body}\n`
    }
    await navigator.clipboard.writeText(text.trim())
    copyResponseSuccess.value = true
    setTimeout(() => {
      copyResponseSuccess.value = false
    }, 2000)
  } catch {}
}
</script>

<template>
  <div class="rw-copyable-card rw-http-box" :class="`card-${evaluation.badgeClass}`">
    <div class="rw-card-header">
      <div class="rw-card-header-left">
        <span class="rw-proto">{{ testMethod }} {{ evaluation.normalizedPath }}</span>
        <span class="rw-status-num">
          {{ response.statusCode }} {{ response.statusText }}
        </span>
        <span class="rw-reason-dim">— {{ evaluation.reason }}</span>
      </div>
      <div class="rw-card-header-right">
        <button
          type="button"
          class="rw-btn-copy-card"
          :class="{ copied: copyResponseSuccess }"
          title="Copy raw HTTP response"
          @click="copyResponse"
        >
          {{ copyResponseSuccess ? 'Copied' : 'Copy HTTP' }}
        </button>
      </div>
    </div>

    <!-- Key HTTP Headers -->
    <div v-if="Object.keys(response.headers).length > 0" class="rw-http-headers">
      <div v-for="(val, key) in response.headers" :key="key" class="rw-hdr-line">
        <span class="rw-hdr-name">{{ key }}:</span>
        <span class="rw-hdr-val">{{ val }}</span>
      </div>
    </div>

    <pre class="rw-http-body" tabindex="0" title="Simulated HTTP response payload"><code>{{ response.body }}</code></pre>

    <div v-if="response.note" class="rw-http-note">
      💡 {{ response.note }}
    </div>
  </div>
</template>

<style scoped>
.rw-copyable-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

.rw-copyable-card.card-verdict-block {
  border-color: rgba(239, 68, 68, 0.35);
}
.rw-copyable-card.card-verdict-block .rw-card-header {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.2);
}
.rw-copyable-card.card-verdict-block .rw-status-num {
  color: #dc2626;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-block .rw-status-num {
  color: #f87171;
}

.rw-copyable-card.card-verdict-allow {
  border-color: rgba(16, 185, 129, 0.35);
}
.rw-copyable-card.card-verdict-allow .rw-card-header {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
}
.rw-copyable-card.card-verdict-allow .rw-status-num {
  color: #059669;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-allow .rw-status-num {
  color: #34d399;
}

.rw-copyable-card.card-verdict-bypass {
  border-color: rgba(14, 165, 233, 0.35);
}
.rw-copyable-card.card-verdict-bypass .rw-card-header {
  background: rgba(14, 165, 233, 0.06);
  border-color: rgba(14, 165, 233, 0.2);
}
.rw-copyable-card.card-verdict-bypass .rw-status-num {
  color: #0284c7;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-bypass .rw-status-num {
  color: #38bdf8;
}

.rw-copyable-card.card-verdict-pass {
  border-color: rgba(100, 116, 139, 0.35);
}
.rw-copyable-card.card-verdict-pass .rw-card-header {
  background: rgba(100, 116, 139, 0.06);
  border-color: rgba(100, 116, 139, 0.2);
}
.rw-copyable-card.card-verdict-pass .rw-status-num {
  color: #475569;
  font-weight: 700;
}
.dark .rw-copyable-card.card-verdict-pass .rw-status-num {
  color: #94a3b8;
}

.rw-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 4px 8px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
  transition: all 0.2s ease;
}

.rw-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 600;
  flex-wrap: wrap;
}

.rw-card-header-right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.rw-proto { color: var(--vp-c-text-2); font-size: 10.5px; }
.rw-status-num { color: #059669; font-weight: 600; }
.rw-reason-dim {
  color: var(--vp-c-text-2);
  font-size: 10.5px;
  font-weight: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rw-btn-copy-card {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.rw-btn-copy-card:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.rw-btn-copy-card.copied {
  background: #059669 !important;
  color: #fff !important;
  border-color: #059669 !important;
}

.rw-http-headers {
  padding: 4px 8px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px dashed var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.rw-hdr-line {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  line-height: 1.35;
  display: flex;
  gap: 0.35rem;
}
.rw-hdr-name {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.rw-hdr-val {
  color: var(--vp-c-text-2);
  word-break: break-all;
}

.rw-http-body {
  margin: 0 !important;
  padding: 6px 8px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
  cursor: text;
  outline: none;
}

.rw-http-note {
  padding: 4px 8px;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 10.5px;
  color: var(--vp-c-text-2);
}
</style>
