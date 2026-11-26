<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

interface Props {
  threshold?: number
  bottom?: number
  right?: number
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 260,
  bottom: 24,
  right: 28,
})

const visible = ref(false)

function updateVisibility(): void {
  visible.value = window.scrollY > props.threshold
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', updateVisibility, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateVisibility)
})
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-if="visible"
      class="back-to-top"
      :style="{ bottom: `${bottom}px`, right: `${right}px` }"
      type="button"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      <AppIcon name="chevronUp" :size="20" />
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  z-index: 30;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-2);
  box-shadow: 0 12px 28px rgba(30, 80, 170, 0.16);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease,
    border-color 0.18s ease;
}

.back-to-top::before,
.back-to-top::after {
  content: '';
  position: absolute;
  inset: -2px;
  z-index: -1;
  border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
}

.back-to-top:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 16px 34px rgba(30, 80, 170, 0.22);
}

.back-to-top:hover::before {
  animation: back-to-top-ripple 1.2s ease-out infinite;
}

.back-to-top:hover::after {
  animation: back-to-top-ripple 1.2s ease-out 0.4s infinite;
}

@keyframes back-to-top-ripple {
  0% {
    transform: scale(0.88);
    opacity: 0.55;
  }
  70% {
    opacity: 0.12;
  }
  100% {
    transform: scale(1.75);
    opacity: 0;
  }
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 680px) {
  .back-to-top {
    width: 42px;
    height: 42px;
  }
}
</style>
