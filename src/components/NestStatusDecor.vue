<script setup lang="ts">
import { useId } from 'vue'

/** 机巢状态页的装饰插画：全部为内联 SVG，无外部图片依赖 */
defineProps<{ type: string }>()

const uid = useId()
const id = (name: string): string => `${uid}-${name}`
const grad = (name: string): string => `url(#${id(name)})`

const bars = [
  { y: 66, h: 24, o: 0.35 },
  { y: 60, h: 30, o: 0.45 },
  { y: 52, h: 38, o: 0.55 },
  { y: 44, h: 46, o: 0.7 },
  { y: 32, h: 58, o: 0.85 },
  { y: 18, h: 72, o: 1 },
]
const dots = [
  [78, 52], [86, 56], [94, 60], [102, 64],
  [78, 60], [86, 64], [94, 68], [102, 72],
  [78, 68], [86, 72], [94, 76], [102, 80],
]
</script>

<template>
  <!-- 概览卡：运行趋势曲线 -->
  <svg v-if="type === 'wave'" class="decor" viewBox="0 0 220 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient :id="id('wave')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#9dbfff" stop-opacity="0.62" />
        <stop offset="1" stop-color="#e3efff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0 88 C26 88 36 83 52 81 C70 79 78 70 94 66 C110 62 118 54 132 41 C146 28 154 14 170 14 C185 14 192 22 202 30 C210 36 215 38 220 38 L220 100 L0 100 Z"
      :fill="grad('wave')"
    />
    <path
      d="M0 88 C26 88 36 83 52 81 C70 79 78 70 94 66 C110 62 118 54 132 41 C146 28 154 14 170 14 C185 14 192 22 202 30 C210 36 215 38 220 38"
      fill="none"
      stroke="#8fb6fb"
      stroke-opacity="0.75"
      stroke-width="2"
    />
  </svg>

  <!-- 概览卡：通信柱状图 -->
  <svg v-if="type === 'bars'" class="decor" viewBox="0 0 128 92" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <defs>
      <linearGradient :id="id('bar')" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#8ec5ff" />
        <stop offset="1" stop-color="#3f7bff" />
      </linearGradient>
    </defs>
    <rect
      v-for="(bar, index) in bars"
      :key="index"
      :x="index * 21"
      :y="bar.y"
      width="10"
      :height="bar.h"
      rx="2.5"
      :fill="grad('bar')"
      :opacity="bar.o"
    />
  </svg>

  <!-- 概览卡：基本信息立方体 -->
  <svg v-if="type === 'cube'" class="decor" viewBox="0 0 140 110" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <radialGradient :id="id('cubeGlow')">
        <stop offset="0" stop-color="#8db8ff" stop-opacity="0.42" />
        <stop offset="1" stop-color="#cfe3ff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="70" cy="62" rx="58" ry="48" :fill="grad('cubeGlow')" />
    <path d="M70 16 112 36 70 58 28 36Z" fill="#dceaff" fill-opacity="0.85" />
    <path d="M28 36 70 58 70 94 28 72Z" fill="#bcd7ff" fill-opacity="0.8" />
    <path d="M112 36 70 58 70 94 112 72Z" fill="#9dc1f8" fill-opacity="0.8" />
    <g fill="#6f9ef0" fill-opacity="0.45">
      <circle v-for="(dot, index) in dots" :key="index" :cx="dot[0]" :cy="dot[1]" r="1.5" />
    </g>
    <path d="M70 16 112 36 70 58 28 36Z M28 36 70 58 70 94 28 72Z M112 36 70 58 70 94 112 72Z" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1" />
  </svg>

  <!-- 电源卡：立体电池箱 -->
  <svg v-if="type === 'powerBox'" class="decor" viewBox="0 0 140 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient :id="id('pbBody')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eef6ff" />
        <stop offset="0.55" stop-color="#c7ddff" />
        <stop offset="1" stop-color="#a7c6f7" />
      </linearGradient>
      <linearGradient :id="id('pbSide')" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#a9c9f7" />
        <stop offset="1" stop-color="#7fa9ec" />
      </linearGradient>
      <radialGradient :id="id('pbGlow')">
        <stop offset="0" stop-color="#9dc2ff" stop-opacity="0.55" />
        <stop offset="1" stop-color="#cfe3ff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="70" cy="66" rx="62" ry="54" :fill="grad('pbGlow')" />
    <ellipse cx="70" cy="101" rx="40" ry="8" fill="#9dc2ff" fill-opacity="0.28" />
    <rect x="52" y="17" width="14" height="8" rx="2.5" fill="#dcebff" />
    <rect x="76" y="17" width="14" height="8" rx="2.5" fill="#dcebff" />
    <path d="M34 29 88 22 106 32 52 40Z" fill="#f2f8ff" fill-opacity="0.92" />
    <path d="M88 22 106 32 106 92 88 100Z" :fill="grad('pbSide')" fill-opacity="0.75" />
    <path d="M34 29 52 40 52 100 34 89Z" :fill="grad('pbBody')" />
    <path d="M52 40 88 34 88 100 52 100Z" :fill="grad('pbBody')" fill-opacity="0.9" />
    <path d="M70 48 57 70h10l-4 17 16-24H69l4-15Z" fill="#ffffff" fill-opacity="0.78" />
    <path d="M34 29 88 22 106 32 52 40Z M52 40 88 34" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.2" />
  </svg>

  <!-- 风扇卡：四叶风扇 -->
  <svg v-if="type === 'fan'" class="decor" viewBox="0 0 130 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient :id="id('fanBlade')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b7d4ff" />
        <stop offset="0.55" stop-color="#7ea9ee" />
        <stop offset="1" stop-color="#3f6fc4" />
      </linearGradient>
      <radialGradient :id="id('fanHub')">
        <stop offset="0" stop-color="#dceaff" />
        <stop offset="1" stop-color="#4a78c8" />
      </radialGradient>
      <radialGradient :id="id('fanGlow')">
        <stop offset="0" stop-color="#a9c9ff" stop-opacity="0.4" />
        <stop offset="1" stop-color="#dceaff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <circle cx="65" cy="58" r="55" :fill="grad('fanGlow')" />
    <g v-for="n in 4" :key="n" :transform="`rotate(${(n - 1) * 90} 65 58)`">
      <path d="M63 51 C69 30 88 21 99 28 C109 35 99 50 80 57 C72 60 64 58 63 51Z" :fill="grad('fanBlade')" fill-opacity="0.94" />
      <path d="M67 50 C73 35 86 29 94 32" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2" />
    </g>
    <circle cx="65" cy="58" r="9" :fill="grad('fanHub')" />
    <circle cx="62" cy="55" r="2.6" fill="#ffffff" fill-opacity="0.8" />
  </svg>

  <!-- 电池卡：圆柱电池 -->
  <svg v-if="type === 'battery'" class="decor" viewBox="0 0 120 130" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient :id="id('batBody')" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#cfe6ff" />
        <stop offset="0.45" stop-color="#f2faff" />
        <stop offset="1" stop-color="#a9cdf5" />
      </linearGradient>
      <linearGradient :id="id('batJuice')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ef0d6" stop-opacity="0.85" />
        <stop offset="1" stop-color="#00cfa8" />
      </linearGradient>
      <radialGradient :id="id('batGlow')">
        <stop offset="0" stop-color="#5ce0c6" stop-opacity="0.42" />
        <stop offset="1" stop-color="#a7e8ff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="80" rx="52" ry="46" :fill="grad('batGlow')" />
    <ellipse cx="60" cy="112" rx="28" ry="6" fill="#8ed8e8" fill-opacity="0.3" />
    <path d="M34 26 L34 98 A26 9 0 0 0 86 98 L86 26 A26 9 0 0 1 34 26Z" :fill="grad('batBody')" fill-opacity="0.72" />
    <path d="M34 62 L34 98 A26 9 0 0 0 86 98 L86 62 A26 9 0 0 1 34 62Z" :fill="grad('batJuice')" fill-opacity="0.92" />
    <ellipse cx="60" cy="26" rx="26" ry="9" fill="#e9f5ff" stroke="#bddcff" stroke-width="1" />
    <ellipse cx="60" cy="26" rx="9" ry="3" fill="#b9d8ff" />
    <rect x="39" y="34" width="6" height="58" rx="3" fill="#ffffff" fill-opacity="0.5" />
    <g fill="#ffffff" fill-opacity="0.5">
      <circle cx="52" cy="82" r="3" /><circle cx="65" cy="74" r="2" /><circle cx="72" cy="90" r="2.5" />
    </g>
    <path d="M34 98 A26 9 0 0 0 86 98" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="1.5" />
  </svg>

  <!-- 单步控制卡：机械臂 -->
  <svg v-if="type === 'arm'" class="decor" viewBox="0 0 150 125" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient :id="id('armLink')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#dceaff" />
        <stop offset="0.5" stop-color="#a6c8f6" />
        <stop offset="1" stop-color="#6f9be2" />
      </linearGradient>
      <radialGradient :id="id('armGlow')">
        <stop offset="0" stop-color="#a9c9ff" stop-opacity="0.38" />
        <stop offset="1" stop-color="#dceaff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="75" cy="72" rx="66" ry="50" :fill="grad('armGlow')" />
    <rect x="62" y="24" width="26" height="18" rx="6" :fill="grad('armLink')" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.4" />
    <rect x="70" y="19" width="10" height="8" rx="3" :fill="grad('armLink')" />
    <path d="M38 38H112" fill="none" :stroke="grad('armLink')" stroke-width="13" stroke-linecap="round" />
    <path d="M38 35H112" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round" />
    <path d="M38 40 32 66 30 84M112 40 120 66 122 84" fill="none" :stroke="grad('armLink')" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M36 41 30 66 28 83M110 41 118 66 120 83" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    <g :fill="grad('armLink')" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.4">
      <circle cx="38" cy="38" r="8" /><circle cx="112" cy="38" r="8" />
      <circle cx="32" cy="66" r="6" /><circle cx="120" cy="66" r="6" />
    </g>
    <g fill="#ffffff" fill-opacity="0.75">
      <circle cx="36" cy="36" r="2.4" /><circle cx="110" cy="36" r="2.4" />
      <circle cx="31" cy="65" r="1.8" /><circle cx="119" cy="65" r="1.8" />
    </g>
    <path d="M30 84 21 96 26 106M30 84 39 96 34 106M122 84 131 96 126 106M122 84 113 96 118 106" fill="none" :stroke="grad('armLink')" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="30" cy="84" r="5.5" :fill="grad('armLink')" />
    <circle cx="122" cy="84" r="5.5" :fill="grad('armLink')" />
  </svg>

  <!-- 流程卡：无人机俯视 -->
  <svg v-if="type === 'drone'" class="decor" viewBox="0 0 150 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <radialGradient :id="id('droneGlow')">
        <stop offset="0" stop-color="#78aeff" stop-opacity="0.5" />
        <stop offset="1" stop-color="#cfe3ff" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="id('droneBody')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eaf4ff" />
        <stop offset="1" stop-color="#8db8f5" />
      </linearGradient>
    </defs>
    <ellipse cx="75" cy="82" rx="58" ry="32" :fill="grad('droneGlow')" />
    <ellipse cx="75" cy="92" rx="30" ry="7" fill="#8fbcf7" fill-opacity="0.28" />
    <g stroke="#8fb6ef" stroke-width="3" stroke-linecap="round">
      <path d="M67 46 42 30M83 46 108 30M67 55 42 70M83 55 108 70" />
    </g>
    <g fill="#cfe2ff" fill-opacity="0.8" stroke="#8fb6ef" stroke-width="1">
      <ellipse cx="38" cy="27" rx="15" ry="5" /><ellipse cx="112" cy="27" rx="15" ry="5" />
      <ellipse cx="38" cy="73" rx="15" ry="5" /><ellipse cx="112" cy="73" rx="15" ry="5" />
    </g>
    <rect x="65" y="38" width="20" height="26" rx="9" :fill="grad('droneBody')" stroke="#ffffff" stroke-opacity="0.8" stroke-width="1" />
    <circle cx="75" cy="43" r="3" fill="#3f7bff" />
    <path d="M75 64v14M68 72v9M82 72v9" stroke="#9dc2ff" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round" />
    <g fill="#ffffff" fill-opacity="0.75">
      <circle cx="38" cy="27" r="2.5" /><circle cx="112" cy="27" r="2.5" />
      <circle cx="38" cy="73" r="2.5" /><circle cx="112" cy="73" r="2.5" />
    </g>
  </svg>
</template>

<style scoped>
.decor {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
