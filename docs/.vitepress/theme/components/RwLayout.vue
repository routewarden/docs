<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import PatternChecker from './PatternChecker.vue'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { trackPlaygroundEvent } from '../telemetry'

const { Layout } = DefaultTheme

const isOpen = ref(false)

function openPlayground() {
  isOpen.value = true
  trackPlaygroundEvent('open_drawer', { source: 'nav_or_deeplink' })
}

function toggle() {
  if (isOpen.value) {
    close()
  } else {
    openPlayground()
  }
}

function close() {
  isOpen.value = false
  trackPlaygroundEvent('close_drawer')
}

// Sync URL and lock body/html scroll when panel is open/closed
watch(isOpen, (open) => {
  if (typeof window !== 'undefined') {
    // 1. Scroll lock
    document.body.style.overflow = open ? 'hidden' : ''
    document.documentElement.style.overflow = open ? 'hidden' : ''

    // 2. URL synchronization
    try {
      const url = new URL(window.location.href)
      if (open) {
        if (!url.searchParams.has('playground')) {
          url.searchParams.set('playground', 'open')
          window.history.pushState({ playground: true }, '', url.toString())
        }
      } else {
        if (url.searchParams.has('playground')) {
          url.searchParams.delete('playground')
          window.history.replaceState({}, '', url.toString())
        }
      }
    } catch {}
  }
})

// Close on Escape key
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

// Check URL query parameters or hash to open or close the playground drawer
function checkDeeplink() {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    const shouldOpen =
      params.get('playground') === 'open' ||
      params.get('playground') === '1' ||
      params.get('playground') === 'true' ||
      params.has('path') ||
      params.has('url') ||
      params.has('block') ||
      params.has('allow') ||
      params.has('mode') ||
      hash === '#playground'

    if (shouldOpen) {
      isOpen.value = true
    } else if (isOpen.value) {
      isOpen.value = false
    }
  } catch {}
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('popstate', checkDeeplink)
    window.addEventListener('hashchange', checkDeeplink)
    // Expose toggle function globally so any link or button can call it
    ;(window as any).__rwCheckerToggle = toggle
    checkDeeplink()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('popstate', checkDeeplink)
    window.removeEventListener('hashchange', checkDeeplink)
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
/* Navbar Trigger Button (Premium Pill) */
.rw-nav-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: 10px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  height: 36px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.rw-nav-trigger:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.12);
}

.rw-nav-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: var(--vp-c-brand-1);
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
  height: 100dvh;
  background: var(--vp-c-bg);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 768px) {
  .rw-panel-container {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
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
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px calc(32px + env(safe-area-inset-bottom, 0px));
  overscroll-behavior: contain;
}

@media (max-width: 768px) {
  .rw-panel-header {
    padding: 12px 14px;
  }

  .rw-panel-body {
    padding: 12px 12px calc(48px + env(safe-area-inset-bottom, 0px));
  }
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
