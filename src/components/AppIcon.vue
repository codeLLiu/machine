<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: number
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), { size: 18, strokeWidth: 1.7 })

const ICONS: Record<string, string> = {
  /* 导航 */
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  rows: 'M4 7h3M4 12h3M4 17h3M10 7h10M10 12h10M10 17h10',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  bug: 'M12 20c-4 0-7-2.4-7-6V9h14v5c0 3.6-3 6-7 6zM8 9V6a4 4 0 0 1 8 0v3M5 13H3M21 13h-2M7.5 20 5 22.5M16.5 20 19 22.5',
  wrench: 'M14.7 6.3a4.1 4.1 0 0 0-5.6 5.5L3.5 17.4 6.6 20.5l5.6-5.6a4.1 4.1 0 0 0 5.5-5.6L15 12l-3-3 2.7-2.7z',
  nodes: 'M12 3a2.2 2.2 0 1 0 0 4.4A2.2 2.2 0 0 0 12 3zM5 16.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM19 16.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM12 7.4v3.2M10.2 12.2 6.6 16.2M13.8 12.2l3.6 4',
  overview: 'M4 18a8 8 0 1 1 16 0M12 18l4.2-5.4M12 18h.01',
  control:
    'M6 4v6M6 14v6M12 4v10M12 18v2M18 4v2M18 10v10M3 10h6M9 16h6M15 6h6',
  monitor: 'M15 10l6-3v10l-6-3M3 7h12v10H3zM8 12h.01',
  cpu: 'M5 5h14v14H5zM9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3',
  terminal: 'M4 4h16v16H4zM8 9l3 3-3 3M13 15h4',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',

  /* 侧栏导航：对照 UI 优化方案设计稿中的 10 个图标 */
  navStatus: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 22v-7h6v7',
  navSerial: 'M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0zM12 18v3',
  navControl:
    'M4 7h10M18 7h2M4 17h4M12 17h8M14 7a2 2 0 1 0 4 0 2 2 0 1 0-4 0M8 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  navCamera: 'M3 8h4l2-3h6l2 3h4v12H3zM8.5 14a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0',
  navPlc: 'M2 12h4l3-7 4 14 3-7h6',
  navMqtt: 'M3 7 12 3l9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  navFuncDebug:
    'M20 4l-4.5 4.5M14 6.5a5 5 0 1 0-6.4 6.4L3 17.5 6.5 21l4.6-4.6A5 5 0 0 0 17.5 10L14 13.5l-3.5-3.5z',
  navModuleDebug: 'M3 7 12 3l9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  navParams:
    'M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1',
  navSystem: 'M12 3v9M6.6 6.6a8 8 0 1 0 10.8 0',

  /* 通用 */
  menu: 'M3 12h18M3 6h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 20h.01M2 9a15 15 0 0 1 20 0',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  plus: 'M12 5v14M5 12h14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7.5v.5',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2',
  upload: 'M12 17V4M7 9l5-5 5 5M4 20h16',

  /* 业务 */
  takeoff: 'M12 20V9M8 13l4-4 4 4M3 21h18',
  landing: 'M12 5v11M8 12l4 4 4-4M3 21h18',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M5 12l7 7 7-7',
  battery: 'M3 8h14v8H3zM17 11h2v2h-2M6 11v2M9 11v2M12 11v2',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  unlock: 'M7 11V8a5 5 0 0 1 9.9-1M5 11h12v10H5z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h12v10H5z',
  power: 'M12 3v9M6.4 6.4a8 8 0 1 0 11.2 0',
  expand: 'M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6',
  collapse: 'M3 9h6V3M21 9h-6V3M3 15h6v6M21 15h-6v6',
  radio:
    'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM8 16a5 5 0 0 1 0-8M16 8a5 5 0 0 1 0 8M5 19a9 9 0 0 1 0-14M19 5a9 9 0 0 1 0 14',
  signalOff: 'M2 3l20 18M5 12.5a10 10 0 0 1 4-2.4M12 20h.01M8.5 16a5.5 5.5 0 0 1 3-1.5M19 12.5a10 10 0 0 0-3-2',
  wind: 'M3 8h9a3 3 0 1 0-3-3M3 12h13a3 3 0 1 1-3 3M3 16h7',
  droplet: 'M12 3s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10z',
  thermometer: 'M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0z',
  rain: 'M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 18 9a3.5 3.5 0 0 1 0 6M8 19l-1 2M12 19l-1 2M16 19l-1 2',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  palette:
    'M12 21a9 9 0 1 1 0-18c4.4 0 8 3 8 6.8 0 2.4-1.6 3.7-3.4 3.7h-1.3a2 2 0 0 0-1.4 3.4c.4.4.6 1 .6 1.6 0 .8-.6 1.5-1.5 1.5z',
  camera:
    'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  play: 'M7 4l13 8-13 8z',
  pause: 'M8 5v14M16 5v14',
  server: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01',
  key: 'M15 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM11.5 13.5L3 22M6 19l2 2',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  zap: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  plug: 'M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5',
}

const iconPath = computed(() => ICONS[props.name] ?? '')
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="iconPath" />
  </svg>
</template>
