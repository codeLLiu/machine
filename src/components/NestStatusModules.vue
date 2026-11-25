<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useToast } from '@/composables/toast'
import { useNestStore } from '@/stores/nest'
import { sendCommand } from '@/api/endpoints'

import compressorFan from '@/assets/images/01_compressor_fan.png'
import batteryFull from '@/assets/images/02_battery_full.png'
import batteryEmpty from '@/assets/images/03_battery_empty.png'
import batteryIcon from '@/assets/images/battery_icon.png'
import cpuChip from '@/assets/images/04_cpu_chip.png'
import hardDisk from '@/assets/images/09_hard_disk.png'
import memoryModule from '@/assets/images/10_memory_module.png'
import doorOpen from '@/assets/images/11_door_open.png'
import doorClosed from '@/assets/images/12_door_closed.png'
import redWarningBeacon from '@/assets/images/14_red_warning_beacon.png'
import drone from '@/assets/images/15_drone.png'
import thermometer from '@/assets/images/16_thermometer.png'
import humidityDroplet from '@/assets/images/17_humidity_droplet.png'
import windDirection from '@/assets/images/18_wind_direction.png'
import sun from '@/assets/images/19_sun.png'
import rain from '@/assets/images/20_rain.png'
import remoteController from '@/assets/images/21_remote_controller.png'
import lightBulb from '@/assets/images/22_light_bulb.png'
import airportRedLight from '@/assets/images/23_airport_red_light.png'
import airportGreenLight from '@/assets/images/24_airport_green_light.png'
import airportYellowLight from '@/assets/images/25_airport_yellow_light.png'
import lift from '@/assets/images/26_lift.png'

const toast = useToast()
const nestStore = useNestStore()

type Tone = 'green' | 'gray' | 'orange' | 'blue' | 'red'

const runStatus = computed(() => nestStore.runStatus)
const compressorRunning = computed(() => runStatus.value?.ac === 1)
const compressorBusy = ref(false)

function formatMetric(value: number | undefined, digits = 1): string {
  if (value === undefined || !Number.isFinite(value)) return '--'
  return value.toFixed(digits)
}

function createSparkline(values: number[]): { line: string; area: string } {
  const width = 120
  const top = 5
  const bottom = 46
  const points = values.map((value, index) => ({
    x: (index / Math.max(values.length - 1, 1)) * width,
    y: bottom - (Math.min(Math.max(value, 0), 100) / 100) * (bottom - top),
  }))

  let line = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const before = points[index - 2] ?? previous
    const after = points[index + 1] ?? current
    const control1X = previous.x + (current.x - before.x) / 6
    const control1Y = previous.y + (current.y - before.y) / 6
    const control2X = current.x - (after.x - previous.x) / 6
    const control2Y = current.y - (after.y - previous.y) / 6
    line += ` C ${control1X.toFixed(2)} ${control1Y.toFixed(2)}, ${control2X.toFixed(2)} ${control2Y.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`
  }

  return {
    line,
    area: `${line} L ${width} 52 L 0 52 Z`,
  }
}

const hardwareSparks = {
  cpu: createSparkline([12, 18, 38, 31, 57, 48, 72, 61, 88, 79, 96, 78]),
  disk: createSparkline([16, 24, 21, 35, 29, 42, 36, 51, 44, 57, 49, 61]),
  memory: createSparkline([32, 22, 41, 55, 46, 69, 59, 80, 71, 91, 83, 97]),
}

const batteries = computed(() => (
  [...(runStatus.value?.battery ?? [])]
    .sort((a, b) => a.num - b.num)
    .map((slot) => ({ num: slot.num + 1, occupied: slot.exist === 1 }))
))

const BATTERY_PAGE_SIZE = 6
const batteryPageIndex = ref(0)
const batteryPages = computed(() => {
  const pages = []
  for (let index = 0; index < batteries.value.length; index += BATTERY_PAGE_SIZE) {
    pages.push(batteries.value.slice(index, index + BATTERY_PAGE_SIZE))
  }
  return pages
})
const hasBatteryPager = computed(() => batteryPages.value.length > 1)
const currentBatteryPage = computed(() => (
  Math.min(batteryPageIndex.value, Math.max(batteryPages.value.length - 1, 0))
))

watch(batteryPages, (pages) => {
  const lastPage = Math.max(pages.length - 1, 0)
  if (batteryPageIndex.value > lastPage) batteryPageIndex.value = lastPage
})

function changeBatteryPage(step: number): void {
  const next = currentBatteryPage.value + step
  if (next < 0 || next >= batteryPages.value.length) return
  batteryPageIndex.value = next
}

const hardwareItems = computed(() => [
  {
    kind: 'cpu',
    label: 'CPU使用率',
    value: runStatus.value?.cpuUsege || '--',
    icon: '',
    sparkKey: 'cpu',
    sparkline: hardwareSparks.cpu,
    progress: Math.min(Math.max(Number.parseFloat(runStatus.value?.cpuUsege ?? '') || 0, 0), 100),
  },
  {
    kind: 'image',
    label: '硬盘剩余量',
    value: runStatus.value?.diskFree || '--',
    icon: hardDisk,
    sparkKey: 'disk',
    sparkline: hardwareSparks.disk,
    progress: 0,
  },
  {
    kind: 'image',
    label: '内存剩余量',
    value: runStatus.value?.memFree || '--',
    icon: memoryModule,
    sparkKey: 'memory',
    sparkline: hardwareSparks.memory,
    progress: 0,
  },
])

const environmentItems = computed(() => [
  { label: '舱内湿度', value: formatMetric(runStatus.value?.innerHumidity), unit: ' % RH', icon: humidityDroplet },
  { label: '舱内温度', value: formatMetric(runStatus.value?.innerTemp), unit: ' ℃', icon: thermometer },
  { label: '舱外湿度', value: formatMetric(runStatus.value?.outHumidity), unit: ' % RH', icon: humidityDroplet },
  { label: '舱外温度', value: formatMetric(runStatus.value?.outTemp), unit: ' ℃', icon: thermometer },
  { label: '舱外风速', value: formatMetric(runStatus.value?.outWind), unit: ' m/s', icon: windDirection },
  { label: '舱外风向', value: formatMetric(runStatus.value?.outWindDir, 0), unit: '°', icon: windDirection },
])

const doorState = computed<{ text: string; tone: Tone }>(() => {
  const states: Record<number, { text: string; tone: Tone }> = {
    10: { text: '舱门已打开', tone: 'blue' },
    20: { text: '舱门已关闭', tone: 'green' },
    30: { text: '舱门打开中', tone: 'orange' },
    40: { text: '舱门关闭中', tone: 'orange' },
    50: { text: '舱门故障', tone: 'red' },
  }
  return states[runStatus.value?.door ?? -1] ?? { text: '--', tone: 'gray' }
})

const safetyItems = computed(() => {
  const emgStop = runStatus.value?.emgStop
  const haveUav = runStatus.value?.haveUav
  return [
    { label: '舱门状态', value: doorState.value.text, tone: doorState.value.tone, icon: doorClosed },
    {
      label: '紧急按钮',
      value: emgStop === undefined ? '--' : emgStop === 1 ? '已启动' : '未启动',
      tone: emgStop === 1 ? 'red' as Tone : 'gray' as Tone,
      icon: redWarningBeacon,
    },
    {
      label: '无人机在舱',
      value: haveUav === undefined ? '--' : haveUav === 1 ? '在舱' : '不在舱',
      tone: haveUav === 1 ? 'green' as Tone : 'gray' as Tone,
      icon: drone,
    },
  ]
})

function ledState(value: number | undefined): { text: string; tone: Tone } {
  if (value === undefined) return { text: '--', tone: 'gray' }
  if (value === 1) return { text: '开启', tone: 'green' }
  if (value === 2) return { text: '慢闪', tone: 'orange' }
  if (value === 3) return { text: '快闪', tone: 'red' }
  return { text: '关闭', tone: 'gray' }
}

function switchState(value: number | undefined): { text: string; tone: Tone } {
  if (value === undefined) return { text: '--', tone: 'gray' }
  return value === 1 ? { text: '开启', tone: 'green' } : { text: '关闭', tone: 'gray' }
}

function liftState(value: number | undefined): { text: string; tone: Tone } {
  const states: Record<number, { text: string; tone: Tone }> = {
    10: { text: '已降落', tone: 'blue' },
    11: { text: '升起中', tone: 'orange' },
    20: { text: '已升起', tone: 'green' },
    21: { text: '下降中', tone: 'orange' },
  }
  return states[value ?? -1] ?? { text: '--', tone: 'gray' }
}

const lightItems = computed(() => {
  const rainfall = runStatus.value?.rainfall
  const light = runStatus.value?.light
  const rc = switchState(runStatus.value?.rc)
  const redLed = ledState(runStatus.value?.redLed)
  const greenLed = ledState(runStatus.value?.greenLed)
  const yellowLed = ledState(runStatus.value?.yellowLed)
  const liftStatus = liftState(runStatus.value?.lift)

  return [
    {
      label: '雨量',
      value: rainfall === undefined ? '--' : rainfall === 1 ? '有雨' : '无雨',
      tone: rainfall === 1 ? 'orange' as Tone : 'gray' as Tone,
      icon: rain,
    },
    { label: '遥控机状态', value: rc.text, tone: rc.tone, icon: remoteController },
    {
      label: '灯光状态',
      value: light === undefined ? '--' : light === 0 ? '开启' : '关闭',
      tone: light === 0 ? 'green' as Tone : 'gray' as Tone,
      icon: lightBulb,
    },
    { label: '机场红灯', value: redLed.text, tone: redLed.tone, icon: airportRedLight },
    { label: '机场绿灯', value: greenLed.text, tone: greenLed.tone, icon: airportGreenLight },
    { label: '机场黄灯', value: yellowLed.text, tone: yellowLed.tone, icon: airportYellowLight },
    { label: '升降机状态', value: liftStatus.text, tone: liftStatus.tone, icon: lift },
  ]
})

async function toggleCompressor(): Promise<void> {
  if (compressorBusy.value) return
  const cmd = compressorRunning.value ? 'acClose' : 'acOpen'
  compressorBusy.value = true
  try {
    await sendCommand({ cmd })
    toast.success('操作成功', cmd === 'acOpen' ? '压缩机已启动' : '压缩机已关闭')
    await nestStore.refreshStatus()
    if (nestStore.mode !== 'live') {
      toast.warning('状态刷新失败', nestStore.errorMessage || '压缩机状态可能尚未更新')
    }
  } catch (error) {
    toast.apiError('操作失败', error, '压缩机控制指令发送失败')
  } finally {
    compressorBusy.value = false
  }
}
</script>

<template>
  <section class="ops-row">
    <article class="panel control-panel">
      <header class="panel-head">
        <div class="panel-title">
          <span class="hex-mark">
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path d="M20 2 35 10.5v19L20 38 5 29.5v-19z" fill="#4d78ff" />
              <path d="M20 2 35 10.5 20 19 5 10.5z" fill="#7fa4ff" />
              <path d="M20 19 35 10.5v19L20 38z" fill="#3f66ee" />
              <path d="M20 10 27 14v8l-7 5-7-5v-8z" fill="#dce8ff" />
              <path d="M20 15 24 17.5v4L20 24l-4-2.5v-4z" fill="#fff" />
            </svg>
          </span>
          <h2>设备控制</h2>
        </div>
      </header>

      <div class="control-surface">
        <div class="control-copy">
          <div class="control-info__name">
            <i />
            <span>压缩机</span>
          </div>
          <button
            class="compressor-toggle"
            type="button"
            :disabled="compressorBusy"
            @click="toggleCompressor"
          >
            <span class="compressor-toggle__icon"><AppIcon name="power" :size="14" /></span>
            {{ compressorBusy ? '处理中...' : compressorRunning ? '压缩机关闭' : '压缩机开启' }}
          </button>
        </div>
        <span class="control-divider" />
        <div class="control-machine">
          <div class="control-fan">
            <img :src="compressorFan" alt="" />
          </div>
          <div class="control-info">
            <span>压缩机状态</span>
            <strong>{{ compressorRunning ? '已启动' : '未启动' }}</strong>
          </div>
        </div>
      </div>
    </article>

    <article class="panel battery-panel">
      <header class="panel-head panel-head--between">
        <div class="panel-title">
          <img class="panel-title__battery" :src="batteryIcon" alt="" />
          <h2>电池槽与电池</h2>
        </div>
      </header>

      <div class="battery-stage">
        <button
          class="battery-arrow"
          :class="{ 'battery-arrow--hidden': !hasBatteryPager }"
          type="button"
          aria-label="上一组电池"
          :disabled="!hasBatteryPager || currentBatteryPage === 0"
          @click="changeBatteryPage(-1)"
        >
          <AppIcon name="chevronLeft" :size="16" />
        </button>

        <div class="battery-viewport">
          <p v-if="!batteries.length" class="battery-empty">暂无电池槽数据</p>
          <div
            v-else
            class="battery-track"
            :style="{ transform: `translateX(-${currentBatteryPage * 100}%)` }"
          >
            <div
              v-for="(page, pageIndex) in batteryPages"
              :key="pageIndex"
              class="battery-page"
            >
              <article
                v-for="battery in page"
                :key="battery.num"
                class="battery-slot"
                :class="{ 'battery-slot--empty': !battery.occupied }"
              >
                <img :src="battery.occupied ? batteryFull : batteryEmpty" alt="" />
                <strong>{{ battery.num }}号</strong>
                <span class="battery-slot__state">
                  <i />
                  {{ battery.occupied ? '有电' : '无电' }}
                </span>
              </article>
            </div>
          </div>
        </div>

        <button
          class="battery-arrow"
          :class="{ 'battery-arrow--hidden': !hasBatteryPager }"
          type="button"
          aria-label="下一组电池"
          :disabled="!hasBatteryPager || currentBatteryPage >= batteryPages.length - 1"
          @click="changeBatteryPage(1)"
        >
          <AppIcon name="chevronRight" :size="16" />
        </button>
      </div>
    </article>
  </section>

  <section class="detail-panel">
    <header class="detail-head">
      <div class="panel-title">
        <span class="hex-mark hex-mark--detail">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 2 35 10.5v19L20 38 5 29.5v-19z" fill="#4d78ff" />
            <path d="M20 2 35 10.5 20 19 5 10.5z" fill="#7fa4ff" />
            <path d="M20 19 35 10.5v19L20 38z" fill="#3f66ee" />
            <path d="M20 10 27 14v8l-7 5-7-5v-8z" fill="#dce8ff" />
            <path d="M20 15 24 17.5v4L20 24l-4-2.5v-4z" fill="#fff" />
          </svg>
        </span>
        <h2>机巢状态详情</h2>
      </div>
    </header>

    <div class="detail-layout">
      <div class="detail-column">
        <article class="detail-card hardware-card">
          <header class="subhead">
            <img :src="cpuChip" alt="" />
            <h3>硬件状态</h3>
          </header>
          <div class="hardware-grid">
            <div v-for="item in hardwareItems" :key="item.label" class="hardware-item">
              <svg
                v-if="item.kind === 'cpu'"
                class="hardware-item__icon hardware-item__icon--ring"
                viewBox="0 0 64 64"
                aria-hidden="true"
                :style="{ '--cpu-progress-offset': `${100 - item.progress}` }"
              >
                <defs>
                  <linearGradient id="cpu-ring-main" x1="10" y1="8" x2="53" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#7ee7ff" />
                    <stop offset="0.45" stop-color="#22c7ed" />
                    <stop offset="1" stop-color="#2f8df5" />
                  </linearGradient>
                  <filter id="cpu-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <circle cx="32" cy="32" r="20.5" fill="#f7fcff" stroke="#a8e8fb" stroke-width="7" />
                <circle
                  class="hardware-item__ring-progress"
                  cx="32"
                  cy="32"
                  r="20.5"
                  fill="none"
                  stroke="#68d8f6"
                  stroke-width="2"
                  stroke-opacity="0.36"
                  pathLength="100"
                  stroke-dasharray="16 84"
                  transform="rotate(128 32 32)"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="20.5"
                  fill="none"
                  stroke="url(#cpu-ring-main)"
                  stroke-width="7"
                  stroke-linecap="round"
                  pathLength="100"
                  filter="url(#cpu-ring-glow)"
                  transform="rotate(-90 32 32)"
                />
                <circle cx="32" cy="32" r="13" fill="#fbfeff" stroke="#c9eaf7" stroke-width="1" />

                <g stroke="#49c6ed" stroke-width="1.7" stroke-linecap="round">
                  <line x1="32" y1="3" x2="32" y2="7.2" />
                  <line x1="32" y1="56.8" x2="32" y2="61" />
                  <line x1="3" y1="32" x2="7.2" y2="32" />
                  <line x1="56.8" y1="32" x2="61" y2="32" />
                  <line x1="11.6" y1="11.6" x2="14.5" y2="14.5" />
                  <line x1="49.5" y1="49.5" x2="52.4" y2="52.4" />
                  <line x1="52.4" y1="11.6" x2="49.5" y2="14.5" />
                  <line x1="14.5" y1="49.5" x2="11.6" y2="52.4" />
                </g>
              </svg>
              <img v-else class="hardware-item__icon" :src="item.icon" alt="" />
              <div class="hardware-item__text">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
              <svg
                class="hardware-item__spark"
                viewBox="0 0 120 52"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient :id="`spark-fill-${item.sparkKey}`" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#70baff" stop-opacity="0.42" />
                    <stop offset="1" stop-color="#70baff" stop-opacity="0" />
                  </linearGradient>
                  <linearGradient
                    :id="`spark-stroke-${item.sparkKey}`"
                    x1="0"
                    y1="0"
                    x2="120"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stop-color="#9bdcff" />
                    <stop offset="1" stop-color="#5c9fff" />
                  </linearGradient>
                </defs>
                <path :d="item.sparkline.area" :fill="`url(#spark-fill-${item.sparkKey})`" />
                <path
                  class="hardware-item__spark-line"
                  :d="item.sparkline.line"
                  fill="none"
                  :stroke="`url(#spark-stroke-${item.sparkKey})`"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  pathLength="1"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </article>

        <article class="detail-card environment-card">
          <header class="subhead">
            <img :src="thermometer" alt="" />
            <h3>环境信息</h3>
          </header>
          <div class="environment-grid">
            <div v-for="item in environmentItems" :key="item.label" class="environment-item">
              <div class="environment-item__head">
                <img :src="item.icon" alt="" />
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}<small v-if="item.unit">{{ item.unit }}</small></strong>
            </div>
          </div>
        </article>
      </div>

      <div class="detail-column">
        <article class="detail-card safety-card">
          <header class="subhead">
            <img :src="doorOpen" alt="" />
            <h3>舱门与安全</h3>
          </header>
          <div class="safety-grid">
            <div v-for="item in safetyItems" :key="item.label" class="safety-item">
              <img :src="item.icon" alt="" />
              <div class="safety-item__text">
                <span>{{ item.label }}</span>
                <strong :class="`tone-${item.tone}`"><i />{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </article>

        <article class="detail-card lights-card">
          <header class="subhead">
            <img :src="sun" alt="" />
            <h3>灯光与其他</h3>
          </header>
          <div class="lights-grid">
            <div v-for="item in lightItems" :key="item.label" class="light-tile">
              <img :src="item.icon" alt="" />
              <span>{{ item.label }}</span>
              <strong :class="`tone-${item.tone}`"><i />{{ item.value }}</strong>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ops-row {
  display: grid;
  grid-template-columns: minmax(0, 0.58fr) minmax(0, 0.80fr);
  gap: calc(var(--s) * 16);
  margin-top: calc(var(--s) * 16);
}

.panel,
.detail-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.96);
  border-radius: calc(var(--s) * 18);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(231, 242, 255, 0.58));
  box-shadow:
    0 calc(var(--s) * 12) calc(var(--s) * 30) rgba(74, 120, 190, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.panel {
  min-height: calc(var(--s) * 242);
  padding: calc(var(--s) * 16) calc(var(--s) * 20) calc(var(--s) * 18);
}

.panel::before,
.detail-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 7% 0%, #ecf2ff, transparent 32%),
    radial-gradient(circle at 94% 100%, rgba(195, 221, 255, 0.22), transparent 35%);
}

.panel-head,
.detail-head,
.subhead {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}

.panel-head {
  justify-content: space-between;
  gap: calc(var(--s) * 12);
}

.panel-head--between {
  align-items: center;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 10);
  min-width: 0;
}

.panel-title h2,
.detail-head h2 {
  color: #1d3158;
  font-size: calc(var(--fs) * 19);
  font-weight: 750;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.panel-title__battery {
  width: calc(var(--s) * 30);
  height: calc(var(--s) * 30);
  object-fit: contain;
  filter: drop-shadow(0 calc(var(--s) * 3) calc(var(--s) * 5) rgba(64, 137, 229, 0.2));
}

.hex-mark {
  display: grid;
  place-items: center;
  width: calc(var(--s) * 29);
  height: calc(var(--s) * 31);
  flex: 0 0 auto;
  filter: drop-shadow(0 calc(var(--s) * 3) calc(var(--s) * 5) rgba(70, 102, 240, 0.23));
}

.hex-mark svg {
  width: 100%;
  height: 100%;
}

.hex-mark--detail {
  width: calc(var(--s) * 34);
  height: calc(var(--s) * 36);
}

.battery-slot__state i,
.detail-card strong i {
  display: inline-block;
  flex: 0 0 auto;
  border-radius: 50%;
}

.control-surface {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) 1px minmax(0, 1.18fr);
  align-items: center;
  min-height: calc(var(--s) * 174);
  margin-top: calc(var(--s) * 13);
  padding: calc(var(--s) * 8) calc(var(--s) * 16);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: calc(var(--s) * 14);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.35), rgba(218, 236, 255, 0.3));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 calc(var(--s) * 5) calc(var(--s) * 13) rgba(85, 133, 201, 0.06);
}

.control-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--s) * 20);
  min-width: 0;
  padding-left: calc(var(--s) * 10);
}

.compressor-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 8);
  width: 100%;
  max-width: calc(var(--s) * 158);
  min-width: 0;
  height: calc(var(--s) * 38);
  padding: 0 calc(var(--s) * 10);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #81aeff 0%, #4f80f3 100%);
  font-size: calc(var(--fs) * 12);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  box-shadow:
    0 calc(var(--s) * 7) calc(var(--s) * 14) rgba(66, 113, 224, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.compressor-toggle:hover {
  transform: translateY(-1px);
  box-shadow:
    0 calc(var(--s) * 9) calc(var(--s) * 18) rgba(66, 113, 224, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.compressor-toggle:disabled {
  opacity: 0.7;
  cursor: wait;
  transform: none;
}

.compressor-toggle__icon {
  display: grid;
  place-items: center;
  width: calc(var(--s) * 19);
  height: calc(var(--s) * 19);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}

.control-fan {
  display: grid;
  place-items: center;
  min-width: 0;
}

.control-fan img {
  width: min(100%, calc(var(--s) * 112));
  object-fit: contain;
}

.control-divider {
  align-self: stretch;
  width: 1px;
  margin: calc(var(--s) * 26) 0;
  background: linear-gradient(180deg, transparent, rgba(135, 171, 220, 0.28), transparent);
}

.control-machine {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 8);
  min-width: 0;
  padding-left: calc(var(--s) * 4);
}

.control-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.control-info__name {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 8);
  color: #24385e;
  font-size: calc(var(--fs) * 14);
  font-weight: 650;
}

.control-info__name i {
  width: calc(var(--s) * 9);
  height: calc(var(--s) * 9);
  border-radius: 50%;
  background: #3b8cf5;
  box-shadow: 0 0 0 calc(var(--s) * 3) rgba(59, 140, 245, 0.1);
}

.control-info > span {
  color: #435a7c;
  font-size: calc(var(--fs) * 11.5);
  font-weight: 500;
  white-space: nowrap;
}

.control-info > strong {
  display: block;
  margin-top: calc(var(--s) * 5);
  color: #2f7cf6;
  font-size: calc(var(--fs) * 20);
  font-weight: 750;
  line-height: 1.08;
  white-space: nowrap;
}

.battery-arrow {
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(222, 237, 255, 0.74));
  color: #4c7fce;
  cursor: pointer;
  box-shadow:
    0 calc(var(--s) * 4) calc(var(--s) * 9) rgba(73, 120, 190, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.battery-arrow:hover {
  transform: translateY(-1px);
  box-shadow:
    0 calc(var(--s) * 6) calc(var(--s) * 12) rgba(73, 120, 190, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

.battery-stage {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 7);
  margin-top: calc(var(--s) * 16);
}

.battery-panel {
  overflow: visible;
}

.battery-arrow {
  width: calc(var(--s) * 34);
  height: calc(var(--s) * 34);
  flex: 0 0 auto;
}

.battery-arrow--hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.battery-arrow:disabled:not(.battery-arrow--hidden) {
  opacity: 0.35;
  cursor: default;
}

.battery-arrow:disabled:hover {
  transform: none;
  box-shadow:
    0 calc(var(--s) * 4) calc(var(--s) * 9) rgba(73, 120, 190, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.battery-viewport {
  flex: 1;
  min-width: 0;
  min-height: calc(var(--s) * 174);
  overflow: hidden;
}

.battery-track {
  display: flex;
  transition: transform 0.32s cubic-bezier(0.22, 0.8, 0.32, 1);
  will-change: transform;
}

.battery-page {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: calc(var(--s) * 8);
  flex: 0 0 100%;
  min-width: 0;
}

.battery-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(var(--s) * 174);
  margin: 0;
  color: #8b99ad;
  font-size: calc(var(--fs) * 12);
  text-align: center;
}

.battery-slot {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: calc(var(--s) * 174);
  padding: calc(var(--s) * 9) calc(var(--s) * 5) calc(var(--s) * 11);
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: calc(var(--s) * 13);
  background: linear-gradient(18deg, rgba(255, 255, 255, 0.62), rgb(135 192 255 / 17%));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 calc(var(--s) * 5) calc(var(--s) * 10) rgba(83, 132, 202, 0.06);
  transform-origin: center bottom;
  transition:
    transform 0.24s cubic-bezier(0.22, 0.8, 0.32, 1),
    border-color 0.24s ease,
    box-shadow 0.24s ease,
    background 0.24s ease;
  will-change: transform;
}

.battery-slot:hover {
  z-index: 2;
  border-color: rgba(255, 255, 255, 1);
  background: linear-gradient(18deg, rgba(255, 255, 255, 0.95), rgba(171, 213, 255, 0.34));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 calc(var(--s) * -2) calc(var(--s) * 4) rgba(78, 134, 216, 0.07),
    0 calc(var(--s) * 7) calc(var(--s) * 12) rgba(65, 118, 190, 0.15),
    0 calc(var(--s) * 17) calc(var(--s) * 27) rgba(65, 118, 190, 0.2);
  transform: translateY(calc(var(--s) * -3)) scale(1.06);
}

.battery-slot img {
  width: calc(var(--s) * 52);
  height: calc(var(--s) * 78);
  object-fit: contain;
  transform-origin: center bottom;
  filter: drop-shadow(0 calc(var(--s) * 5) calc(var(--s) * 8) rgba(37, 174, 205, 0.16));
}

.battery-slot:not(.battery-slot--empty):hover img {
  animation: battery-swing 0.55s ease-in-out;
}

@keyframes battery-swing {
  0%,
  100% {
    transform: rotate(0deg);
  }

  20% {
    transform: rotate(-7deg);
  }

  40% {
    transform: rotate(6deg);
  }

  60% {
    transform: rotate(-4deg);
  }

  80% {
    transform: rotate(3deg);
  }
}

.battery-slot > strong {
  margin-top: calc(var(--s) * 4);
  color: #24385e;
  font-size: calc(var(--fs) * 15);
  font-weight: 700;
  white-space: nowrap;
}

.battery-slot__state {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 5);
  margin-top: calc(var(--s) * 4);
  color: #627795;
  font-size: calc(var(--fs) * 12);
  font-weight: 550;
  white-space: nowrap;
}

.battery-slot__state i {
  width: calc(var(--s) * 6);
  height: calc(var(--s) * 6);
  background: #2ed498;
}

.battery-slot--empty .battery-slot__state i {
  background: #a3b0c2;
}

.detail-panel {
  margin-top: calc(var(--s) * 16);
  padding: calc(var(--s) * 16) calc(var(--s) * 18) calc(var(--s) * 18);
}

.detail-head {
  justify-content: space-between;
  gap: calc(var(--s) * 14);
}

.detail-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr);
  gap: calc(var(--s) * 16);
  margin-top: calc(var(--s) * 12);
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 16);
  min-width: 0;
}

.detail-card {
  min-width: 0;
  padding: calc(var(--s) * 11) calc(var(--s) * 12) calc(var(--s) * 12);
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: calc(var(--s) * 14);
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.38), rgba(232, 243, 255, 0.22));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 calc(var(--s) * 5) calc(var(--s) * 12) rgba(82, 126, 191, 0.04);
}

.hardware-card {
  flex: 0 0 auto;
}

.environment-card {
  flex: 1;
}

.subhead {
  gap: calc(var(--s) * 8);
}

.subhead img {
  width: calc(var(--s) * 29);
  height: calc(var(--s) * 29);
  object-fit: contain;
  filter: drop-shadow(0 calc(var(--s) * 3) calc(var(--s) * 5) rgba(60, 123, 211, 0.14));
}

.subhead h3 {
  color: #253a60;
  font-size: calc(var(--fs) * 14.5);
  font-weight: 700;
}

.hardware-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: calc(var(--s) * 9);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: calc(var(--s) * 12);
  background: rgba(255, 255, 255, 0.24);
}

.hardware-item {
  position: relative;
  z-index: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(calc(var(--s) * 64), 0.8fr);
  align-items: center;
  gap: calc(var(--s) * 8);
  min-width: 0;
  padding: calc(var(--s) * 9) calc(var(--s) * 10);
  transition: background 0.22s ease, box-shadow 0.22s ease;
}

.hardware-item:hover {
  z-index: 1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(205, 230, 255, 0.3));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.84);
}

.hardware-item + .hardware-item {
  border-left: 1px solid rgba(147, 179, 220, 0.2);
}

.hardware-item__icon {
  width: calc(var(--s) * 38);
  height: calc(var(--s) * 38);
  object-fit: contain;
  transform-origin: center bottom;
}

.hardware-item__icon--ring {
  overflow: visible;
  transform-origin: center;
  transition: transform 0.24s cubic-bezier(0.22, 0.8, 0.32, 1);
  filter: drop-shadow(0 calc(var(--s) * 3) calc(var(--s) * 5) rgba(34, 177, 228, 0.18));
}

.hardware-item:hover .hardware-item__icon {
  animation: detail-icon-bounce 0.52s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.hardware-item__ring-progress {
  stroke-dasharray: 100;
  stroke-dashoffset: var(--cpu-progress-offset);
  transition: stroke-dashoffset 0.55s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.hardware-item:hover .hardware-item__ring-progress {
  animation: cpu-ring-progress 0.85s cubic-bezier(0.22, 0.8, 0.32, 1) both;
}

@keyframes cpu-ring-progress {
  from {
    stroke-dashoffset: 100;
  }

  to {
    stroke-dashoffset: var(--cpu-progress-offset);
  }
}

.hardware-item__text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 4);
  min-width: 0;
}

.hardware-item__text span {
  color: #334b70;
  font-size: calc(var(--fs) * 12);
  font-weight: 550;
  white-space: nowrap;
}

.hardware-item__text strong {
  color: #1f355c;
  font-size: calc(var(--fs) * 21);
  font-weight: 750;
  white-space: nowrap;
  transform-origin: center;
  transition: transform 0.22s cubic-bezier(0.22, 0.8, 0.32, 1), color 0.22s ease;
}

.hardware-item:hover .hardware-item__text strong {
  color: #2f6fe4;
  transform: scale(1.12);
}

.hardware-item__spark {
  width: 100%;
  height: calc(var(--s) * 46);
  overflow: visible;
  transform-origin: center;
}

.hardware-item:hover .hardware-item__spark {
  animation: hardware-spark-reveal 1.8s cubic-bezier(0.22, 0.8, 0.32, 1) both;
}

@keyframes hardware-spark-reveal {
  0% {
    clip-path: inset(0 100% 0 0);
    opacity: 0.35;
    transform: translateX(calc(var(--s) * -3));
  }

  70%,
  100% {
    clip-path: inset(0 0 0 0);
    opacity: 1;
    transform: translateX(0);
  }
}

.hardware-item__spark-line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  filter: drop-shadow(0 calc(var(--s) * 1) calc(var(--s) * 2) rgba(75, 158, 246, 0.24));
  animation: hardware-spark-draw 1.1s cubic-bezier(0.22, 0.8, 0.32, 1) forwards;
}

@keyframes hardware-spark-draw {
  to {
    stroke-dashoffset: 0;
  }
}

.environment-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-top: calc(var(--s) * 12);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: calc(var(--s) * 12);
  background: rgba(255, 255, 255, 0.2);
}

.environment-item {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 5);
  min-width: 0;
  padding: calc(var(--s) * 11) calc(var(--s) * 8);
  text-align: center;
  transition: background 0.22s ease, box-shadow 0.22s ease;
}

.environment-item:hover {
  z-index: 1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(205, 230, 255, 0.28));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.82);
}

.environment-item + .environment-item {
  border-left: 1px solid rgba(147, 179, 220, 0.19);
}

.environment-item__head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 5);
  min-width: 0;
}

.environment-item__head img {
  width: calc(var(--s) * 27);
  height: calc(var(--s) * 31);
  flex: 0 0 auto;
  object-fit: contain;
  transform-origin: center bottom;
}

.environment-item:hover .environment-item__head img {
  animation: detail-icon-bounce 0.52s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.environment-item span {
  color: #4d6488;
  font-size: calc(var(--fs) * 12);
  font-weight: 500;
  white-space: nowrap;
}

.environment-item strong {
  color: #1f355c;
  font-size: calc(var(--fs) * 16);
  font-weight: 750;
  white-space: nowrap;
  transform-origin: center;
  transition: transform 0.22s cubic-bezier(0.22, 0.8, 0.32, 1), color 0.22s ease;
}

.environment-item:hover strong {
  color: #2f6fe4;
  transform: scale(1.16);
}

.environment-item strong small {
  margin-left: calc(var(--s) * 3);
  font-size: calc(var(--fs) * 12.5);
  font-weight: 600;
}

@keyframes detail-icon-bounce {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  35% {
    transform: translateY(calc(var(--s) * -5)) scale(1.08);
  }

  60% {
    transform: translateY(calc(var(--s) * 1)) scale(0.98);
  }

  80% {
    transform: translateY(calc(var(--s) * -2)) scale(1.03);
  }
}

.safety-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: calc(var(--s) * 8);
  margin-top: calc(var(--s) * 10);
}

.safety-item {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 7);
  min-width: 0;
  padding: calc(var(--s) * 9) calc(var(--s) * 8);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: calc(var(--s) * 11);
  background: rgba(255, 255, 255, 0.34);
  transition: background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.safety-item:hover {
  z-index: 1;
  border-color: rgba(255, 255, 255, 0.96);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(205, 230, 255, 0.34));
  box-shadow: 0 calc(var(--s) * 5) calc(var(--s) * 12) rgba(72, 127, 201, 0.1);
}

.safety-item > img {
  width: calc(var(--s) * 34);
  height: calc(var(--s) * 34);
  flex: 0 0 auto;
  object-fit: contain;
  transform-origin: center bottom;
}

.safety-item:hover > img {
  animation: detail-icon-bounce 0.52s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.safety-item__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: calc(var(--s) * 5);
  min-width: 0;
}

.safety-item__text > span {
  color: #41597d;
  font-size: calc(var(--fs) * 12);
  font-weight: 550;
  white-space: nowrap;
}

.safety-item__text strong {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 5);
  font-size: calc(var(--fs) * 12.5);
  font-weight: 650;
  white-space: nowrap;
  transform-origin: left center;
  transition: transform 0.22s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.safety-item:hover .safety-item__text strong {
  transform: scale(1.14);
}

.safety-item__text strong i,
.light-tile strong i {
  width: calc(var(--s) * 8);
  height: calc(var(--s) * 8);
  background: currentColor;
}

.tone-green {
  color: #1fbd7e;
}

.tone-gray {
  color: #8b99ad;
}

.tone-orange {
  color: #ff9f3f;
}

.tone-blue {
  color: #3d86e8;
}

.tone-red {
  color: #e35d5d;
}

.lights-card {
  flex: 1;
}

.lights-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: calc(var(--s) * 5);
  margin-top: calc(var(--s) * 10);
}

.light-tile {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: calc(var(--s) * 8) calc(var(--s) * 4) calc(var(--s) * 9);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: calc(var(--s) * 11);
  background: rgba(255, 255, 255, 0.3);
  transition: background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.light-tile:hover {
  z-index: 1;
  border-color: rgba(255, 255, 255, 0.96);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(205, 230, 255, 0.38));
  box-shadow: 0 calc(var(--s) * 5) calc(var(--s) * 12) rgba(72, 127, 201, 0.1);
}

.light-tile img {
  width: calc(var(--s) * 31);
  height: calc(var(--s) * 31);
  object-fit: contain;
  transform-origin: center bottom;
}

.light-tile:hover img {
  animation: detail-icon-bounce 0.52s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.light-tile > span {
  margin-top: calc(var(--s) * 5);
  color: #4d6488;
  font-size: calc(var(--fs) * 12);
  font-weight: 500;
  white-space: nowrap;
}

.light-tile strong {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 4);
  margin-top: calc(var(--s) * 5);
  font-size: calc(var(--fs) * 11.5);
  font-weight: 650;
  white-space: nowrap;
  transform-origin: center;
  transition: transform 0.22s cubic-bezier(0.22, 0.8, 0.32, 1);
}

.light-tile:hover strong {
  transform: scale(1.15);
}

@media (max-width: 1200px) {
  .ops-row {
    grid-template-columns: minmax(0, 0.7fr) minmax(0, 1fr);
  }

  .detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1020px) {
  .ops-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .panel-title h2,
  .detail-head h2 {
    font-size: calc(var(--fs) * 17);
  }

  .battery-page {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .environment-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .environment-item:nth-child(4) {
    border-left: 0;
  }

  .lights-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .panel,
  .detail-panel {
    padding: calc(var(--s) * 14);
  }

  .panel-head,
  .detail-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .battery-stage {
    margin-top: calc(var(--s) * 14);
  }

  .battery-page,
  .safety-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .control-surface {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--s) * 10);
  }

  .control-divider {
    width: auto;
    height: 1px;
    margin: 0 calc(var(--s) * 16);
    background: linear-gradient(90deg, transparent, rgba(135, 171, 220, 0.28), transparent);
  }

  .control-info {
    padding: calc(var(--s) * 2) 0 calc(var(--s) * 8);
    text-align: center;
  }

  .control-info__name {
    justify-content: center;
  }

  .hardware-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hardware-item + .hardware-item {
    border-top: 1px solid rgba(147, 179, 220, 0.2);
    border-left: 0;
  }

  .environment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .environment-item:nth-child(odd) {
    border-left: 0;
  }

  .lights-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
