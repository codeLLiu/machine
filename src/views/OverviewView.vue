<script setup lang="ts">
import { computed, ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import CountUp from '@/components/CountUp.vue'
import NestSchematic from '@/components/NestSchematic.vue'
import { useControlStore } from '@/stores/control'
import { useNestStore } from '@/stores/nest'
import type { ControlCmd } from '@/api/types'

const nestStore = useNestStore()
const controlStore = useControlStore()

/** 态势页只放「看一眼就要动手」的四个动作 */
const QUICK: { cmd: ControlCmd; label: string; icon: string }[] = [
  { cmd: 'requestLand', label: '停机坪升起（无飞机）', icon: 'arrowUp' },
  { cmd: 'takeoffClosing', label: '停机坪下降（无飞机）', icon: 'arrowDown' },
  { cmd: 'requestTakeoff', label: '停机坪升起并释放起落架', icon: 'takeoff' },
  { cmd: 'requestLandClose', label: '归中并下降（有飞机）', icon: 'landing' },
]

/** 作业流程：与 FlowHub 原型一致的六阶段条 */
const FLOW: { title: string; sub: string; icon: string }[] = [
  { title: '待机', sub: 'Standby', icon: 'power' },
  { title: '开舱', sub: 'Door Open', icon: 'layers' },
  { title: '放飞', sub: 'Takeoff', icon: 'takeoff' },
  { title: '作业', sub: 'In Mission', icon: 'target' },
  { title: '返航', sub: 'Return', icon: 'landing' },
  { title: '归位', sub: 'Docked', icon: 'battery' },
]

const pendingQuick = ref<{ cmd: ControlCmd; label: string } | null>(null)

function quick(cmd: ControlCmd, label: string): void {
  pendingQuick.value = { cmd, label }
}

function confirmQuick(): void {
  const item = pendingQuick.value
  pendingQuick.value = null
  if (item) void controlStore.execute(item.cmd, item.label)
}

const status = computed(() => nestStore.runStatus)

const updatedText = computed(() => {
  if (!nestStore.lastUpdated) return '等待数据'
  return new Date(nestStore.lastUpdated).toLocaleTimeString('zh-CN', { hour12: false })
})

const tempText = computed(() => (status.value ? status.value.innerTemp.toFixed(1) : '--'))
const humidityText = computed(() => (status.value ? String(Math.round(status.value.innerHumidity)) : '--'))
const outTempText = computed(() => (status.value ? status.value.outTemp.toFixed(1) : '--'))
const outHumidityText = computed(() => (status.value ? String(Math.round(status.value.outHumidity)) : '--'))
const windText = computed(() => (status.value ? status.value.outWind.toFixed(1) : '--'))
const windDirText = computed(() => {
  if (!status.value) return '--'
  const dir = status.value.outWindDir
  const points = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return `${points[Math.round(dir / 45) % 8]} ${Math.round(dir)}°`
})

const workTone = computed(() => {
  if (!status.value) return 'muted'
  if (!nestStore.isHealthy || status.value.workStatus === 2) return 'danger'
  if (status.value.workStatus === 1) return 'info'
  return 'success'
})

/** 状态矩阵 */
const matrix = computed(() => {
  const s = status.value
  if (!s) return []
  return [
    {
      label: '舱门',
      value: nestStore.doorText,
      tone: s.door === 50 ? 'danger' : s.door === 30 || s.door === 40 ? 'info' : 'success',
      icon: 'layers',
    },
    {
      label: '升降平台',
      value: nestStore.liftText,
      tone: s.lift === 11 || s.lift === 21 ? 'info' : 'success',
      icon: 'arrowUp',
    },
    {
      label: '空调压缩机',
      value: s.ac === 1 ? '运行中' : '已停止',
      tone: s.ac === 1 ? 'success' : 'muted',
      icon: 'wind',
    },
    {
      label: '舱内照明',
      value: s.light === 0 ? '已开启' : '已关闭',
      tone: s.light === 0 ? 'success' : 'muted',
      icon: 'sun',
    },
    {
      label: '遥控器',
      value: s.rc === 1 ? '已开启' : '已关闭',
      tone: s.rc === 1 ? 'info' : 'muted',
      icon: 'signalOff',
    },
    {
      label: '降雨',
      value: s.rainfall === 1 ? '有降雨' : '无降雨',
      tone: s.rainfall === 1 ? 'warning' : 'success',
      icon: 'rain',
    },
  ]
})

function dotTone(tone: string): string {
  if (tone === 'success') return 'live'
  if (tone === 'danger') return 'err'
  if (tone === 'warning' || tone === 'info') return 'warn'
  return 'idle'
}

const axisRows = computed(() =>
  nestStore.plcErrors.map((axis) => {
    const codes = [axis.axisPowerErr, axis.axisStatusErr, axis.servoErrorErr, axis.servoAxisErr]
    const failed = codes.some((code) => code && code !== '0')
    return { ...axis, failed, summary: failed ? codes.filter((c) => c && c !== '0').join(' / ') : '正常' }
  }),
)

const axisFaultCount = computed(() => axisRows.value.filter((row) => row.failed).length)
</script>

<template>
  <div class="page stagger">
    <section class="kpis">
      <article class="panel kpi">
        <div class="kpi__head">
          <span class="kpi__label">工作状态</span>
          <span class="tag" :class="`tag--${workTone}`">{{ nestStore.isHealthy ? '健康' : '异常' }}</span>
        </div>
        <div class="kpi__body">
          <span class="kpi__value kpi__value--sm">{{ nestStore.workStatusText }}</span>
        </div>
        <p class="kpi__foot">
          <span class="dot" :class="nestStore.isHealthy ? 'dot--live' : 'dot--err'" />
          {{ nestStore.isHealthy ? '各子系统无异常' : '存在告警项，请检查' }}
        </p>
      </article>

      <article class="panel kpi">
        <div class="kpi__head">
          <span class="kpi__label">舱内温度</span>
          <AppIcon name="thermometer" :size="15" class="kpi__icon" />
        </div>
        <div class="kpi__body">
          <span class="metric__value">
            <CountUp v-if="status" :value="status.innerTemp" :decimals="1" />
            <span v-else class="skel" />
          </span>
          <span class="metric__unit">℃</span>
        </div>
        <p class="kpi__foot">空调控温中 · 目标 22–28℃</p>
      </article>

      <article class="panel kpi">
        <div class="kpi__head">
          <span class="kpi__label">舱内湿度</span>
          <AppIcon name="droplet" :size="15" class="kpi__icon" />
        </div>
        <div class="kpi__body">
          <span class="metric__value">
            <CountUp v-if="status" :value="Math.round(status.innerHumidity)" />
            <span v-else class="skel" />
          </span>
          <span class="metric__unit">%RH</span>
        </div>
        <p class="kpi__foot">舱外 {{ outHumidityText }} %RH</p>
      </article>

      <article class="panel kpi">
        <div class="kpi__head">
          <span class="kpi__label">电池在位</span>
          <AppIcon name="battery" :size="15" class="kpi__icon" />
        </div>
        <div class="kpi__body">
          <span class="metric__value">
            <CountUp v-if="status" :value="nestStore.batteryInstalled" />
            <span v-else class="skel" />
          </span>
          <span class="metric__unit">/ {{ nestStore.batteryTotal || 3 }} 槽</span>
        </div>
        <p class="kpi__foot">支持连续轮换作业</p>
      </article>
    </section>

    <section class="quickbar">
      <span class="quickbar__label">
        <AppIcon name="zap" :size="13" />
        快捷动作
      </span>
      <button
        v-for="item in QUICK"
        :key="item.cmd"
        class="quickbar__btn"
        type="button"
        :disabled="controlStore.isRunning(item.cmd)"
        @click="quick(item.cmd, item.label)"
      >
        <AppIcon
          :name="controlStore.isRunning(item.cmd) ? 'refresh' : item.icon"
          :size="13"
          :class="{ spin: controlStore.isRunning(item.cmd) }"
        />
        {{ item.label }}
      </button>
      <span class="quickbar__hint">完整操作与二次确认见「功能调试」</span>
    </section>

    <section class="grid">
      <article class="panel panel--corner schematic-panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">舱体态势</h2>
            <p class="panel__sub">剖面示意 · 实时同步 · {{ updatedText }}</p>
          </div>
          <button class="btn btn--sm btn--ghost" type="button" @click="nestStore.refreshStatus()">
            <AppIcon name="refresh" :size="13" :class="{ spin: nestStore.loading }" />
            刷新
          </button>
        </header>
        <div class="panel__body">
          <NestSchematic :status="status" />
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">环境监测</h2>
            <p class="panel__sub">舱内 / 舱外双区采样</p>
          </div>
          <span class="tag tag--muted mono">{{ windText }} m/s</span>
        </header>
        <div class="panel__body env">
          <div class="env__zone">
            <span class="env__tag">舱内</span>
            <div class="env__row">
              <span class="env__label">温度</span>
              <span class="env__value mono">{{ tempText }}<i>℃</i></span>
            </div>
            <div class="env__row">
              <span class="env__label">湿度</span>
              <span class="env__value mono">{{ humidityText }}<i>%</i></span>
            </div>
          </div>

          <div class="env__zone">
            <span class="env__tag env__tag--out">舱外</span>
            <div class="env__row">
              <span class="env__label">温度</span>
              <span class="env__value mono">{{ outTempText }}<i>℃</i></span>
            </div>
            <div class="env__row">
              <span class="env__label">湿度</span>
              <span class="env__value mono">{{ outHumidityText }}<i>%</i></span>
            </div>
          </div>

          <div class="env__compass">
            <svg viewBox="0 0 120 120" class="compass" aria-hidden="true">
              <circle cx="60" cy="60" r="46" class="compass__ring" />
              <circle cx="60" cy="60" r="34" class="compass__ring compass__ring--inner" />
              <g class="compass__ticks">
                <line x1="60" y1="10" x2="60" y2="20" />
                <line x1="60" y1="100" x2="60" y2="110" />
                <line x1="10" y1="60" x2="20" y2="60" />
                <line x1="100" y1="60" x2="110" y2="60" />
              </g>
              <text x="60" y="24" class="compass__label" text-anchor="middle">N</text>
              <text x="98" y="64" class="compass__label" text-anchor="middle">E</text>
              <text x="60" y="106" class="compass__label" text-anchor="middle">S</text>
              <text x="22" y="64" class="compass__label" text-anchor="middle">W</text>
              <g :transform="`rotate(${status?.outWindDir ?? 0} 60 60)`" class="compass__needle">
                <path d="M60 26 L65 60 L60 66 L55 60 Z" class="compass__needle-main" />
                <path d="M60 94 L55 60 L60 54 L65 60 Z" class="compass__needle-tail" />
              </g>
              <circle cx="60" cy="60" r="3.2" class="compass__hub" />
            </svg>
            <div class="env__compass-meta">
              <span class="env__label">风向</span>
              <strong class="mono">{{ windDirText }}</strong>
            </div>
          </div>

          <div class="env__rain">
            <div class="env__rain-item">
              <AppIcon name="rain" :size="15" />
              <span>{{ status?.rainfall === 1 ? '检测到降雨' : '无降雨' }}</span>
            </div>
            <div class="env__rain-item">
              <AppIcon name="sun" :size="15" />
              <span>照度 {{ status?.light === 0 ? '已开灯' : '正常' }}</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="grid grid--bottom">
      <article class="panel">
        <header class="panel__head">
          <h2 class="panel__title">子系统状态</h2>
          <span class="panel__sub">6 项关键机构</span>
        </header>
        <div class="matrix">
          <div v-for="item in matrix" :key="item.label" class="matrix__cell">
            <div class="matrix__top">
              <AppIcon :name="item.icon" :size="14" class="matrix__icon" />
              <span class="matrix__label">{{ item.label }}</span>
            </div>
            <div class="matrix__value">
              <span class="dot" :class="`dot--${dotTone(item.tone)}`" />
              {{ item.value }}
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <h2 class="panel__title">伺服轴健康</h2>
          <span
            class="tag"
            :class="!axisRows.length ? 'tag--muted' : axisFaultCount ? 'tag--danger' : 'tag--success'"
          >
            {{ !axisRows.length ? '读取中' : axisFaultCount ? `${axisFaultCount} 轴异常` : '全部正常' }}
          </span>
        </header>
        <div class="axes">
          <div v-for="row in axisRows" :key="row.id" class="axes__row">
            <span class="axes__name">{{ row.name }}</span>
            <span class="axes__code mono" :class="{ 'is-bad': row.failed }">{{ row.summary }}</span>
            <span class="dot" :class="row.failed ? 'dot--err' : 'dot--live'" />
          </div>
          <p v-if="!axisRows.length" class="axes__empty">正在读取轴状态…</p>
        </div>
      </article>
    </section>

    <section class="fh-card flow-card">
      <div class="fh-card__hd">
        <div>
          <div class="fh-card__t"><AppIcon name="layers" :size="16" /> 作业流程总览</div>
          <div class="fh-card__s">从待机到归位的六个阶段 · 全链路状态</div>
        </div>
        <span class="tag" :class="nestStore.isHealthy ? 'tag--success' : 'tag--danger'">
          {{ nestStore.isHealthy ? 'Healthy' : '需关注' }}
        </span>
      </div>
      <div class="fh-flow">
        <template v-for="(stage, index) in FLOW" :key="stage.title">
          <div class="fh-flow__n">
            <div class="fh-flow__ic"><AppIcon :name="stage.icon" :size="23" /></div>
            <div>
              <div class="fh-flow__t">{{ stage.title }}</div>
              <div class="fh-flow__s">{{ stage.sub }}</div>
            </div>
          </div>
          <AppIcon
            v-if="index < FLOW.length - 1"
            name="chevronRight"
            :size="15"
            class="fh-flow__arw"
          />
        </template>
      </div>
    </section>

    <AppConfirm
      :open="Boolean(pendingQuick)"
      :title="pendingQuick?.label ?? ''"
      message="该流程指令会驱动停机坪或起落架动作。"
      detail="请先确认现场安全，并核对无人机是否在位。"
      confirm-text="确认下发"
      danger
      @update:open="(value) => !value && (pendingQuick = null)"
      @confirm="confirmQuick"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flow-card {
  margin-bottom: 0;
}

/* KPI */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

/* 快捷动作条 */
.quickbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  flex-wrap: wrap;
}

.quickbar__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-xs);
  color: var(--text-3);
  margin-right: 4px;
}

.quickbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: var(--fs-sm);
  cursor: pointer;
  transition: border-color var(--dur-1) ease, color var(--dur-1) ease, background var(--dur-1) ease;
}

.quickbar__btn:hover:not([disabled]) {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-weak);
}

.quickbar__btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.quickbar__hint {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.kpi {
  padding: 16px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.kpi__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kpi__label {
  font-size: var(--fs-sm);
  color: var(--text-3);
}

.kpi__icon {
  color: var(--text-4);
}

.kpi__body {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.kpi__value {
  font-size: var(--fs-2xl);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.5px;
}

.kpi__value--sm {
  font-size: var(--fs-xl);
}

.kpi__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-xs);
  color: var(--text-4);
}

/* 主区 */
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.32fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.grid--bottom {
  grid-template-columns: minmax(0, 1.32fr) minmax(0, 1fr);
}

.schematic-panel .panel__body {
  padding: 8px 16px 14px;
}

/* 剖面图按容器宽度铺满，避免 flex 压缩后四周留白 */
.schematic-panel :deep(.schematic__svg) {
  max-height: 300px;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
  flex: 0 0 auto;
}

/* 环境监测 */
.env {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.env__zone {
  position: relative;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.env__tag {
  display: inline-block;
  margin-bottom: 8px;
  padding: 1px 8px;
  border-radius: 5px;
  font-size: var(--fs-xs);
  color: var(--primary);
  background: var(--primary-weak);
  border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
}

.env__tag--out {
  color: var(--text-3);
  background: var(--surface-3);
  border-color: var(--border);
}

.env__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}

.env__label {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.env__value {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--text);
}

.env__value i {
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--text-4);
  margin-left: 2px;
}

.env__compass {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.compass {
  width: 92px;
  height: 92px;
  flex: 0 0 92px;
  color: var(--text-4);
}

.compass__ring {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  opacity: 0.4;
}

.compass__ring--inner {
  opacity: 0.18;
}

.compass__ticks {
  stroke: currentColor;
  stroke-width: 1;
  opacity: 0.55;
}

.compass__label {
  font-family: var(--mono);
  font-size: var(--fs-xs);
  fill: var(--text-4);
}

.compass__needle {
  transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.compass__needle-main {
  fill: var(--primary);
}

.compass__needle-tail {
  fill: var(--primary);
  opacity: 0.22;
}

.compass__hub {
  fill: var(--text-2);
}

.env__compass-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.env__compass-meta strong {
  font-size: var(--fs-md);
  font-weight: 600;
}

.env__rain {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.env__rain-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: var(--fs-xs);
  color: var(--text-3);
}

/* 状态矩阵 */
.matrix {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--border);
  border-top: 1px solid var(--border);
}

.matrix__cell {
  padding: 14px 16px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.matrix__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.matrix__icon {
  color: var(--text-4);
}

.matrix__label {
  font-size: var(--fs-xs);
  color: var(--text-3);
}

.matrix__value {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text);
}

/* 轴 */
.axes {
  padding: 8px 0;
}

.axes__row {
  display: grid;
  grid-template-columns: 1fr auto 12px;
  align-items: center;
  gap: 10px;
  padding: 9px 18px;
  font-size: var(--fs-sm);
}

.axes__row + .axes__row {
  border-top: 1px solid var(--border);
}

.axes__name {
  color: var(--text-2);
}

.axes__code {
  font-size: var(--fs-xs);
  color: var(--success);
}

.axes__code.is-bad {
  color: var(--danger);
}

.axes__empty {
  padding: 16px 18px;
  font-size: var(--fs-sm);
  color: var(--text-4);
}

@media (max-width: 1200px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid,
  .grid--bottom {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .kpi {
    padding: 12px 12px 10px;
  }

  .kpi__value {
    font-size: 24px;
  }

  .kpi__value--sm {
    font-size: var(--fs-lg);
  }

  .matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .env {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
