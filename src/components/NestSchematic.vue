<script setup lang="ts">
import { computed } from 'vue'
import type { RunStatus } from '@/api/types'

const props = defineProps<{ status: RunStatus | null }>()

const doorOpen = computed(() => {
  const door = props.status?.door ?? 20
  return door === 10 || door === 30
})

const doorFault = computed(() => props.status?.door === 50)

const liftUp = computed(() => {
  const lift = props.status?.lift ?? 10
  return lift === 20 || lift === 11
})

const hasUav = computed(() => props.status?.haveUav === 1)
const emergency = computed(() => props.status?.emgStop === 1)

const battery = computed(() => props.status?.battery ?? [])
const installed = computed(() => battery.value.filter((slot) => slot.exist === 1).length)

const liftLabel = computed(() => {
  const lift = props.status?.lift ?? 10
  if (lift === 20) return '已升起'
  if (lift === 11) return '升起中'
  if (lift === 21) return '下降中'
  return '已降落'
})

const doorLabel = computed(() => {
  const door = props.status?.door ?? 20
  if (door === 10) return '已打开'
  if (door === 30) return '打开中'
  if (door === 40) return '关闭中'
  if (door === 50) return '舱门故障'
  return '已关闭'
})
</script>

<template>
  <div class="schematic">
    <svg viewBox="0 0 420 330" class="schematic__svg" role="img" aria-label="机巢剖面示意">
      <!-- 外壳 -->
      <rect x="26" y="46" width="368" height="238" rx="12" class="cab" />

      <!-- 舱门（左右滑开） -->
      <g :class="{ 'is-moving': false }">
        <g class="door door--left" :class="{ 'is-open': doorOpen, 'is-fault': doorFault }">
          <rect x="58" y="52" width="150" height="16" rx="4" class="cab__door" />
          <rect x="66" y="58.5" width="134" height="2" rx="1" class="cab__door-line" />
        </g>
        <g class="door door--right" :class="{ 'is-open': doorOpen, 'is-fault': doorFault }">
          <rect x="212" y="52" width="150" height="16" rx="4" class="cab__door" />
          <rect x="220" y="58.5" width="134" height="2" rx="1" class="cab__door-line" />
        </g>
      </g>

      <!-- 升降平台 + 无人机 -->
      <g class="lift" :class="{ 'is-up': liftUp }">
        <rect x="104" y="196" width="212" height="11" rx="3" class="cab__deck" />
        <line x1="210" y1="207" x2="210" y2="246" class="cab__mast" />
        <path d="M186 246h48" class="cab__base" />

        <!-- 无人机 -->
        <g class="uav" :class="{ 'is-present': hasUav }">
          <rect x="196" y="176" width="28" height="10" rx="4" class="uav__body" />
          <rect x="203" y="169" width="14" height="8" rx="3" class="uav__top" />
          <line x1="190" y1="181" x2="198" y2="181" class="uav__arm" />
          <line x1="222" y1="181" x2="230" y2="181" class="uav__arm" />
          <circle cx="186" cy="181" r="4" class="uav__rotor" />
          <circle cx="234" cy="181" r="4" class="uav__rotor" />
        </g>
      </g>

      <!-- 电池仓 -->
      <g class="battery">
        <text x="336" y="150" class="cab__micro" text-anchor="middle">电池仓</text>
        <g v-for="(slot, index) in battery" :key="slot.num">
          <rect
            :x="318"
            :y="158 + index * 34"
            width="30"
            height="28"
            rx="5"
            class="slot"
            :class="{ 'slot--on': slot.exist }"
          />
          <rect
            v-if="slot.exist"
            x="322"
            :y="176 + index * 34"
            width="22"
            height="5"
            rx="2"
            class="slot__bar"
          />
          <text :x="333" :y="158 + index * 34 + 18" class="cab__micro" text-anchor="middle">
            {{ index + 1 }}
          </text>
        </g>
      </g>

      <!-- 急停标记 -->
      <g v-if="emergency" class="alarm">
        <circle cx="60" cy="240" r="16" class="alarm__ring" />
        <text x="60" y="245" class="alarm__text" text-anchor="middle">!</text>
      </g>

      <!-- 标注：升降 / 舱门 -->
      <g>
        <text x="38" y="272" class="cab__micro">升降 {{ liftLabel }}</text>
        <text x="382" y="272" class="cab__micro" text-anchor="end">舱门 {{ doorLabel }}</text>
      </g>
    </svg>

    <div class="schematic__legend">
      <span class="legend-item">
        <span class="dot" :class="hasUav ? 'dot--live' : 'dot--idle'" />
        飞行器 {{ hasUav ? '在位' : '未在位' }}
      </span>
      <span class="legend-item">
        <span class="dot" :class="installed > 0 ? 'dot--live' : 'dot--idle'" />
        电池 {{ installed }}/{{ battery.length || 3 }}
      </span>
      <span class="legend-item" :class="{ 'is-warn': emergency }">
        <span class="dot" :class="emergency ? 'dot--err' : 'dot--idle'" />
        急停 {{ emergency ? '已触发' : '未触发' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.schematic {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schematic__svg {
  width: 100%;
  height: auto;
  max-height: 380px;
}

/* 外壳与结构 */
.cab {
  fill: var(--surface-3);
  stroke: var(--border-strong);
  stroke-width: 1;
}

.cab__door {
  fill: var(--surface);
  stroke: var(--border-strong);
}

.cab__door-line {
  fill: var(--border-strong);
}

.cab__deck {
  fill: var(--primary);
  opacity: 0.85;
}

.cab__mast {
  stroke: var(--border-strong);
  stroke-width: 2;
}

.cab__base {
  stroke: var(--border-strong);
  stroke-width: 2;
  stroke-linecap: round;
}

.cab__micro {
  font-family: var(--mono);
  font-size: var(--fs-xs);
  fill: var(--text-3);
}

/* 无人机 */
.uav {
  opacity: 0;
  transition: opacity 0.4s ease;
}

.uav.is-present {
  opacity: 1;
}

.uav__body {
  fill: var(--text-2);
}

.uav__top {
  fill: var(--text-3);
}

.uav__arm {
  stroke: var(--text-3);
  stroke-width: 2;
  stroke-linecap: round;
}

.uav__rotor {
  fill: none;
  stroke: var(--text-3);
  stroke-width: 1.5;
}

/* 电池 */
.slot {
  fill: var(--surface-3);
  stroke: var(--border-strong);
}

.slot--on {
  fill: var(--success-weak);
  stroke: color-mix(in srgb, var(--success) 45%, transparent);
}

.slot__bar {
  fill: var(--success);
  opacity: 0.75;
}

/* 急停 */
.alarm__ring {
  fill: var(--danger-weak);
  stroke: var(--danger);
  stroke-width: 1.5;
}

.alarm__text {
  font-size: var(--fs-md);
  font-weight: 700;
  fill: var(--danger);
}

/* 动效：只做位移，不加发光 */
.door {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.door--left.is-open {
  transform: translateX(-46px);
}

.door--right.is-open {
  transform: translateX(46px);
}

.door.is-fault .cab__door {
  fill: var(--danger-weak);
  stroke: var(--danger);
}

.lift {
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.lift.is-up {
  transform: translateY(-72px);
}

.schematic__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 0 2px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: var(--fs-xs);
  color: var(--text-3);
}

.legend-item.is-warn {
  color: var(--danger);
}
</style>
