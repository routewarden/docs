<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import PatternChecker from './PatternChecker.vue'
import { ref, watch, onMounted, onUnmounted } from 'vue'

const { Layout } = DefaultTheme

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

// Lock body & html scroll when panel is open
watch(isOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : ''
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})

// Close on Escape key
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown)
    // Expose toggle function globally so the navbar button can call it
    ;(window as any).__rwCheckerToggle = toggle
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
    delete (window as any).__rwCheckerToggle
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }
})
</script>

<template>
  <Layout>
    <!-- Inject the Playground button into the navbar via the nav-bar-content-after slot -->
    <template #nav-bar-content-after>
      <button
        type="button"
        class="rw-nav-trigger"
        title="Open Pattern &amp; Response Playground"
        @click="toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="rw-nav-icon"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span class="rw-nav-label">Playground</span>
      </button>
    </template>
  </Layout>

  <!-- Full-screen Overlay Panel -->
  <Teleport to="body">
    <Transition name="rw-panel">
      <div v-if="isOpen" class="rw-overlay" @click.self="close">
        <div class="rw-panel-container">
          <!-- Panel Header -->
          <div class="rw-panel-header">
            <div class="rw-panel-title-wrap">
              <div class="rw-panel-badge">INTERACTIVE TOOL</div>
              <h2 class="rw-panel-title">Pattern &amp; Response Playground</h2>
            </div>
            <button
              type="button"
              class="rw-panel-close"
              title="Close (Esc)"
              @click="close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Scrollable Body -->
          <div class="rw-panel-body">
            <PatternChecker />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Navbar Trigger Button */
.rw-nav-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  line-height: 28px;
  height: 36px;
}

.rw-nav-trigger:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.rw-nav-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .rw-nav-label {
    display: none;
  }

  .rw-nav-trigger {
    padding: 4px 8px;
    margin-left: 4px;
  }
}

/* Overlay Backdrop */
.rw-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
}

/* Slide-in Panel Container */
.rw-panel-container {
  position: fixed;
  top: 0;
  right: 0;
  width: 100vw;
  height: 100vh;
  background: var(--vp-c-bg);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 768px) {
  .rw-panel-container {
    width: 100vw;
  }
}

/* Panel Header */
.rw-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.rw-panel-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rw-panel-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--vp-c-brand-1);
}

.rw-panel-title {
  margin: 0 !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: var(--vp-c-text-1);
  border: none !important;
  padding: 0 !important;
}

.rw-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.rw-panel-close:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-2);
}

/* Panel Body – Scrollable */
.rw-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 32px;
  overscroll-behavior: contain;
}

/* Slide-in Transition */
.rw-panel-enter-active,
.rw-panel-leave-active {
  transition: opacity 0.2s ease;
}

.rw-panel-enter-active .rw-panel-container,
.rw-panel-leave-active .rw-panel-container {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.rw-panel-enter-from {
  opacity: 0;
}

.rw-panel-enter-from .rw-panel-container {
  transform: translateX(100%);
}

.rw-panel-leave-to {
  opacity: 0;
}

.rw-panel-leave-to .rw-panel-container {
  transform: translateX(100%);
}
</style>
