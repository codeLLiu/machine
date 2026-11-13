<script setup lang="ts">
/** 数值滚动：仅在数值变化时补间，尊重系统的「减少动态效果」设置 */
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    decimals?: number
    duration?: number
  }>(),
  { decimals: 0, duration: 520 },
)

const display = ref(props.value)
let raf = 0

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

watch(
  () => props.value,
  (next, prev) => {
    if (reduced || !Number.isFinite(next)) {
      display.value = next
      return
    }
    cancelAnimationFrame(raf)
    const from = Number.isFinite(prev) ? prev : next
    const start = performance.now()

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / props.duration)
      const eased = 1 - Math.pow(1 - t, 3)
      display.value = from + (next - from) * eased
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  },
)

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span class="mono">{{ display.toFixed(decimals) }}</span>
</template>
