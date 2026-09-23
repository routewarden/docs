<script setup lang="ts">
import type { ResponseMode } from './generator'

export interface VerbEvalResult {
  method: string
  verdict: 'BLOCK' | 'ALLOW' | 'BYPASS' | 'PASS' | 'DISABLED'
  statusTitle: string
  badgeClass: string
  statusCode: number
  statusText: string
  reason: string
  isInspected: boolean
}

defineProps<{
  verbEvaluations: VerbEvalResult[]
}>()

const responseMode = defineModel<ResponseMode>('responseMode', { required: true })
const statusCode = defineModel<number>('statusCode', { required: true })
const customBody = defineModel<string>('customBody', { required: true })
const redirectUrl = defineModel<string>('redirectUrl', { required: true })
const proxyUrl = defineModel<string>('proxyUrl', { required: true })
const gzipBombMB = defineModel<number>('gzipBombMB', { required: true })
const tarpitDelayMs = defineModel<number>('tarpitDelayMs', { required: true })
const tarpitMaxDurationSeconds = defineModel<number>('tarpitMaxDurationSeconds', { required: true })
const retryAfterSeconds = defineModel<number>('retryAfterSeconds', { required: true })
const streamSizeMB = defineModel<number>('streamSizeMB', { required: true })
const captchaProvider = defineModel<'turnstile' | 'hcaptcha' | 'recaptcha'>('captchaProvider', { required: true })
const captchaSiteKey = defineModel<string>('captchaSiteKey', { required: true })
const captchaTitle = defineModel<string>('captchaTitle', { required: true })
const testMethod = defineModel<string>('testMethod', { required: true })
</script>

<template>
  <div class="rw-block">
    <div class="rw-row-header">
      <span class="rw-title">HTTP Response</span>
      <div class="rw-resp-opts">
        <label>
          <span>Mode:</span>
          <select v-model="responseMode" class="rw-mode-select">
            <optgroup label="Standard Responses">
              <option value="json">json</option>
              <option value="html">html</option>
              <option value="text">text</option>
              <option value="xml">xml</option>
            </optgroup>
            <optgroup label="Traffic Routing">
              <option value="redirect">redirect</option>
              <option value="proxy">proxy (honeypot)</option>
            </optgroup>
            <optgroup label="Active Defense & Traps">
              <option value="silentDrop">silentDrop (TCP RST)</option>
              <option value="gzipBomb">gzipBomb (zip bomb)</option>
              <option value="tarpit">tarpit (slow drip)</option>
              <option value="rateLimitChallenge">rateLimitChallenge (429)</option>
              <option value="infiniteStream">infiniteStream (junk stream)</option>
            </optgroup>
            <optgroup label="Deception & Verification">
              <option value="fakeSuccess">fakeSuccess (HTTP 200)</option>
              <option value="captcha">captcha (Turnstile/hCaptcha)</option>
            </optgroup>
          </select>
        </label>
        <label v-if="responseMode !== 'silentDrop' && responseMode !== 'fakeSuccess' && responseMode !== 'redirect' && responseMode !== 'rateLimitChallenge'">
          <span>Status:</span>
          <input v-model.number="statusCode" type="number" class="rw-small-num" />
        </label>
      </div>
    </div>

    <!-- Mode-Specific Configuration Options -->
    <div class="rw-mode-opts-panel">
      <!-- Redirect Options -->
      <div v-if="responseMode === 'redirect'" class="rw-mode-fields">
        <span class="rw-opt-tag">Redirect Target:</span>
        <input v-model="redirectUrl" class="rw-opt-input" placeholder="https://sinkhole.example.com/blocked" />
      </div>

      <!-- Proxy Options -->
      <div v-if="responseMode === 'proxy'" class="rw-mode-fields">
        <span class="rw-opt-tag">Honeypot Proxy URL:</span>
        <input v-model="proxyUrl" class="rw-opt-input" placeholder="http://honeypot-internal:8080" />
      </div>

      <!-- Gzip Bomb Options -->
      <div v-if="responseMode === 'gzipBomb'" class="rw-mode-fields">
        <span class="rw-opt-tag">Payload Size:</span>
        <div class="rw-opt-unit">
          <input v-model.number="gzipBombMB" type="number" min="1" max="100" class="rw-small-num" />
          <span>MB (expands to ~{{ gzipBombMB * 1000 }} MB in scanner memory)</span>
        </div>
      </div>

      <!-- Tarpit Options -->
      <div v-if="responseMode === 'tarpit'" class="rw-mode-fields">
        <span class="rw-opt-tag">Drip Delay:</span>
        <div class="rw-opt-unit">
          <input v-model.number="tarpitDelayMs" type="number" min="50" step="100" class="rw-small-num" />
          <span>ms/byte</span>
        </div>
        <span class="rw-opt-tag">Max Duration:</span>
        <div class="rw-opt-unit">
          <input v-model.number="tarpitMaxDurationSeconds" type="number" min="1" class="rw-small-num" />
          <span>s</span>
        </div>
      </div>

      <!-- Rate Limit Challenge Options -->
      <div v-if="responseMode === 'rateLimitChallenge'" class="rw-mode-fields">
        <span class="rw-opt-tag">Retry-After:</span>
        <div class="rw-opt-unit">
          <input v-model.number="retryAfterSeconds" type="number" min="1" class="rw-small-num" />
          <span>seconds</span>
        </div>
      </div>

      <!-- Infinite Stream Options -->
      <div v-if="responseMode === 'infiniteStream'" class="rw-mode-fields">
        <span class="rw-opt-tag">Stream Cap:</span>
        <div class="rw-opt-unit">
          <input v-model.number="streamSizeMB" type="number" min="1" class="rw-small-num" />
          <span>MB pseudo-random junk bytes</span>
        </div>
      </div>

      <!-- Captcha Options -->
      <div v-if="responseMode === 'captcha'" class="rw-mode-fields rw-wrap-fields">
        <div class="rw-field-group">
          <span class="rw-opt-tag">Provider:</span>
          <select v-model="captchaProvider" class="rw-mini-select">
            <option value="turnstile">Cloudflare Turnstile</option>
            <option value="hcaptcha">hCaptcha</option>
            <option value="recaptcha">reCAPTCHA v2</option>
          </select>
        </div>
        <div class="rw-field-group rw-flex-1">
          <span class="rw-opt-tag">Site Key:</span>
          <input v-model="captchaSiteKey" class="rw-opt-input mono" placeholder="0x4AAAAAA..." />
        </div>
        <div class="rw-field-group rw-flex-1">
          <span class="rw-opt-tag">Title:</span>
          <input v-model="captchaTitle" class="rw-opt-input" placeholder="Verification Title" />
        </div>
      </div>

      <!-- Silent Drop Note -->
      <div v-if="responseMode === 'silentDrop'" class="rw-mode-fields rw-silent-note">
        <span class="rw-badge-silent">TCP RST</span>
        <span>Abruptly closes socket via Go <code>http.Hijacker</code>. Zero HTTP bytes, headers, or status codes sent.</span>
      </div>

      <!-- Custom Body Override for json/text/html/xml/fakeSuccess -->
      <div v-if="['json', 'text', 'html', 'xml', 'fakeSuccess'].includes(responseMode)" class="rw-mode-fields">
        <span class="rw-opt-tag">Custom Body:</span>
        <input
          v-model="customBody"
          class="rw-opt-input"
          :placeholder="responseMode === 'json' ? 'Leave empty for default JSON or type custom payload...' : 'Leave empty for default or type custom body...'"
        />
        <button v-if="customBody" type="button" class="rw-btn-reset-sm" title="Reset body" @click="customBody = ''">✕</button>
      </div>
    </div>

    <!-- Simulation Results for Each HTTP Verb -->
    <div class="rw-verb-sim-section">
      <div class="rw-sim-matrix-bar">
        <div class="rw-sm-info">
          <span class="rw-sm-title">⚡ Verdict for Each HTTP Verb:</span>
          <span class="rw-sm-desc">Click any verb to inspect its live simulated response payload below</span>
        </div>
        <div class="rw-sm-pills">
          <button
            v-for="ve in verbEvaluations"
            :key="ve.method"
            type="button"
            class="rw-sim-pill"
            :class="[
              ve.badgeClass,
              {
                active: testMethod === ve.method,
                uninspected: !ve.isInspected
              }
            ]"
            :title="`Click to inspect HTTP ${ve.method} (${ve.reason})`"
            @click="testMethod = ve.method"
          >
            <span class="rw-sp-dot">●</span>
            <span class="rw-sp-name">{{ ve.method }}</span>
            <span class="rw-sp-badge">{{ ve.verdict }}</span>
            <span class="rw-sp-code">{{ ve.statusCode }}</span>
          </button>
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

.rw-resp-opts {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 11.5px;
}
.rw-resp-opts label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--vp-c-text-2);
}
.rw-mode-select, .rw-resp-opts select, .rw-small-num, .rw-mini-select {
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 11px;
  outline: none;
}
.rw-small-num { width: 60px; }

/* Mode options sub-panel */
.rw-mode-opts-panel {
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rw-mode-fields {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 11.5px;
}

.rw-wrap-fields {
  flex-wrap: wrap;
}

.rw-field-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-flex-1 {
  flex: 1;
  min-width: 130px;
}

.rw-opt-tag {
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.rw-opt-input {
  flex: 1;
  min-width: 120px;
  padding: 3px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 11px;
  outline: none;
}
.rw-opt-input.mono {
  font-family: var(--vp-font-family-mono);
}
.rw-opt-input:focus {
  border-color: var(--vp-c-brand-1);
}

.rw-opt-unit {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--vp-c-text-2);
  font-size: 11px;
}

.rw-silent-note {
  color: var(--vp-c-text-2);
  font-size: 11px;
  line-height: 1.4;
}

.rw-badge-silent {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.dark .rw-badge-silent {
  color: #f87171;
}

.rw-btn-reset-sm {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
}
.rw-btn-reset-sm:hover {
  color: var(--vp-c-text-1);
}

/* Simulation Results for Each Verb */
.rw-verb-sim-section {
  margin: 0.4rem 0 0.2rem;
}

.rw-sim-matrix-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 8px;
}

.rw-sm-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-sm-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-sm-desc {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.rw-sm-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.rw-sim-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  background: var(--vp-c-bg);
}

.rw-sim-pill:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.rw-sim-pill.active {
  box-shadow: 0 0 0 2px var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.rw-sp-dot {
  font-size: 8px;
}

.rw-sim-pill.verdict-block .rw-sp-dot { color: #ef4444; }
.rw-sim-pill.verdict-allow .rw-sp-dot { color: #10b981; }
.rw-sim-pill.verdict-bypass .rw-sp-dot { color: #0ea5e9; }
.rw-sim-pill.verdict-pass .rw-sp-dot { color: #64748b; }

.rw-sp-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-sp-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

.rw-sim-pill.verdict-block .rw-sp-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}
.dark .rw-sim-pill.verdict-block .rw-sp-badge { color: #f87171; }

.rw-sim-pill.verdict-allow .rw-sp-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}
.dark .rw-sim-pill.verdict-allow .rw-sp-badge { color: #34d399; }

.rw-sim-pill.verdict-bypass .rw-sp-badge {
  background: rgba(56, 189, 248, 0.2);
  color: #0284c7;
}
.dark .rw-sim-pill.verdict-bypass .rw-sp-badge { color: #38bdf8; }

.rw-sim-pill.verdict-pass .rw-sp-badge {
  background: rgba(100, 116, 139, 0.2);
  color: #475569;
}
.dark .rw-sim-pill.verdict-pass .rw-sp-badge { color: #94a3b8; }

.rw-sp-code {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
</style>
