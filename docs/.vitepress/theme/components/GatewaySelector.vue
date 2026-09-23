<script setup lang="ts">
import type { GatewayId, GatewayOption } from '../composables/useGatewaySelection'

defineProps<{
  gateways: GatewayOption[]
}>()

const activeGateway = defineModel<GatewayId>({ required: true })
</script>

<template>
  <div class="rw-dropdown-wrapper">
    <select
      id="gateway-select"
      v-model="activeGateway"
      class="rw-gateway-select"
      aria-label="Select gateway configuration"
    >
      <option v-for="g in gateways" :key="g.id" :value="g.id">
        {{ g.label }}
      </option>
    </select>
    <svg
      class="rw-dropdown-chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </div>
</template>

<style scoped>
.rw-dropdown-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.rw-gateway-select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px 26px 4px 10px;
  font-family: var(--vp-font-family-base);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .rw-gateway-select {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
}

.rw-gateway-select:hover,
.rw-gateway-select:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.rw-dropdown-chevron {
  position: absolute;
  right: 8px;
  pointer-events: none;
  color: var(--vp-c-text-2);
  transition: transform 0.2s ease;
}
</style>
