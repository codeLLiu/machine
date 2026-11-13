<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CountUp from '@/components/CountUp.vue'
import { MODULES } from '@/data/fixtures'
import { MODE_TEXT, useDeviceStore, type RunMode } from '@/stores/device'

const deviceStore = useDeviceStore()

const GROUPS = [
  { key: 'axis', label: '模组 / 轴' },
  { key: 'end', label: '末端执行器' },
  { key: 'door', label: '舱门与规整' },
] as const

const levels = ['全部', 'DEBUG', 'INFO', 'WARN'] as const
const activeLevel = ref<(typeof levels)[number]>('全部')
const keyword = ref('')

const modes = Object.entries(MODE_TEXT) as [RunMode, string][]

const grouped = computed(() =>
  GROUPS.map((group) => ({
    ...group,
    items: MODULES.filter((module) => module.group === group.key),
  })),
)

const activeAxes = computed(() => new Set(deviceStore.activeModule.axes.map((axis) => axis.key)))
const isAxisPos = (name: string): boolean =>
  [...activeAxes.value].some((key) => name === `${key}_pos`)

const filteredLogs = computed(() =>
  deviceStore.logs.filter((log) => {
    const byLevel = activeLevel.value === '全部' || log.level === activeLevel.value
    const byKeyword = !keyword.value || log.text.toLowerCase().includes(keyword.value.toLowerCase())
    return byLevel && byKeyword
  }),
)

const targetPreview = computed(() => {
  const values = deviceStore.targetValues
  return values.length ? values.join(' , ') : '—'
})
</script>

<template>
  <div class="module">
    <aside class="panel rail-panel">
      <div class="rail">
        <template v-for="group in grouped" :key="group.key">
          <p class="rail__group">{{ group.label }}</p>
          <button
            v-for="module in group.items"
            :key="module.key"
            class="rail__item"
            :class="{ 'is-active': module.key === deviceStore.activeKey }"
            type="button"
            @click="deviceStore.selectModule(module.key)"
          >
            <AppIcon
              :name="module.axes.length > 1 ? 'layers' : module.group === 'door' ? 'lock' : 'cpu'"
              :size="14"
            />
            <span class="rail__text">
              <span class="rail__name">{{ module.name }}</span>
              <span class="rail__pos">
                {{ module.axes.map((axis) => deviceStore.positions[axis.key]).join(' / ') }}
              </span>
            </span>
          </button>
        </template>
      </div>
    </aside>

    <div class="module__main">
      <!-- 状态矩阵 -->
      <article class="panel">
        <header class="panel__head panel__head--tight">
          <div>
            <h2 class="panel__title">模块状态</h2>
            <p class="panel__sub">24 个关键信号 · 变化时高亮</p>
          </div>
          <span class="tag tag--muted mono">refresh 300ms</span>
        </header>
        <div class="panel__body panel__body--tight">
          <div class="matrix">
            <div
              v-for="signal in deviceStore.signalList"
              :key="signal.name"
              class="matrix__cell"
              :class="{
                'is-active': isAxisPos(signal.name),
                'is-changed': deviceStore.changed.includes(signal.name),
                'is-true': signal.value === 'true',
                'is-false': signal.value === 'false',
              }"
            >
              <span class="matrix__name">{{ signal.name }}</span>
              <span class="matrix__val">{{ signal.value }}</span>
            </div>
          </div>
        </div>
      </article>

      <!-- 模块信息 + 位置 + 控制 -->
      <article class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">{{ deviceStore.activeModule.name }}</h2>
            <p class="panel__sub">
              设备编号 {{ deviceStore.activeModule.deviceNo }} ·
              {{ deviceStore.activeModule.type }} ·
              {{ deviceStore.activeModule.port }}
            </p>
          </div>
          <div class="head-tags">
            <span class="tag tag--info">{{ deviceStore.activeModule.axes.length }} 轴</span>
            <button class="btn btn--sm btn--ghost" type="button" @click="deviceStore.appendLog('INFO', '重新读取模块配置')">
              <AppIcon name="refresh" :size="12" />
              刷新配置
            </button>
          </div>
        </header>

        <div class="panel__body">
          <div class="block-head">
            <span class="block-head__title">位置预设</span>
            <span class="block-head__meta">点击切换目标值</span>
            <span class="block-head__line" />
          </div>

          <div class="presets">
            <button
              v-for="preset in deviceStore.activeModule.presets"
              :key="preset.id"
              class="preset"
              :class="{ 'is-active': preset.id === deviceStore.presetId }"
              type="button"
              @click="deviceStore.setPreset(preset.id)"
            >
              <span class="preset__label">{{ preset.label }}</span>
              <span class="preset__value mono">{{ preset.targets.join(' / ') }}</span>
            </button>
          </div>

          <div class="readouts">
            <div
              v-for="(axis, index) in deviceStore.activeModule.axes"
              :key="axis.key"
              class="readout"
            >
              <span class="readout__label">当前位置 · {{ axis.label }}</span>
              <span class="readout__value">
                <CountUp :value="deviceStore.currentValues[index] ?? 0" />
              </span>
              <span class="readout__unit">{{ deviceStore.activeModule.unit }}</span>
            </div>
            <div class="readout readout--target">
              <span class="readout__label">本次目标</span>
              <span class="readout__value mono">{{ targetPreview }}</span>
              <span class="readout__unit">{{ deviceStore.activeModule.unit }}</span>
            </div>
          </div>

          <div class="block-head control-head">
            <span class="block-head__title">调试控制</span>
            <span class="block-head__meta">先设目标，再执行</span>
            <span class="block-head__line" />
          </div>

          <div class="control">
            <label class="field">
              <span class="field__label">速度 / 参数</span>
              <input v-model.number="deviceStore.speed" class="input mono" type="number" />
            </label>
            <label class="field control__grow">
              <span class="field__label">测试位置（可手填，逗号分隔）</span>
              <input
                v-model="deviceStore.targetText"
                class="input mono"
                :placeholder="deviceStore.targetValues.join(', ')"
              />
            </label>
            <label class="field">
              <span class="field__label">模式</span>
              <select v-model="deviceStore.mode" class="select">
                <option v-for="[value, label] in modes" :key="value" :value="value">{{ label }}</option>
              </select>
            </label>

            <div class="control__actions">
              <button
                class="btn btn--primary exec"
                type="button"
                :disabled="deviceStore.running"
                @click="deviceStore.execute()"
              >
                <AppIcon :name="deviceStore.running ? 'refresh' : 'play'" :size="14" :class="{ spin: deviceStore.running }" />
                {{ deviceStore.running ? '执行中' : '执行' }}
              </button>
              <button class="btn btn--danger" type="button" :disabled="!deviceStore.running" @click="deviceStore.stop()">
                停止
              </button>
            </div>
          </div>

          <div class="progress-wrap">
            <div class="progress">
              <div class="progress__fill" :style="{ width: `${deviceStore.progress}%` }" />
            </div>
            <span class="progress-text mono">
              {{ deviceStore.running ? `执行中 ${deviceStore.progress}%` : '待执行' }}
            </span>
          </div>
        </div>
      </article>

      <!-- 日志 -->
      <article class="panel">
        <header class="panel__head panel__head--tight">
          <div>
            <h2 class="panel__title">调试日志</h2>
            <p class="panel__sub">{{ filteredLogs.length }} / {{ deviceStore.logs.length }} 条</p>
          </div>
          <div class="log-tools">
            <div class="seg seg--slide">
              <button
                v-for="level in levels"
                :key="level"
                class="seg__item"
                :class="{ 'is-active': activeLevel === level }"
                type="button"
                @click="activeLevel = level"
              >
                {{ level }}
              </button>
            </div>
            <label class="search">
              <AppIcon name="search" :size="13" />
              <input v-model="keyword" class="search__input" placeholder="搜索日志" />
            </label>
            <button class="btn btn--sm btn--ghost" type="button" @click="deviceStore.clearLogs()">
              清空
            </button>
          </div>
        </header>

        <div class="logbox">
          <div v-if="!filteredLogs.length" class="empty">
            <AppIcon name="terminal" :size="22" />
            <p>暂无日志</p>
          </div>
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="logline"
            :class="`logline--${log.level.toLowerCase()}`"
          >
            <span class="logline__time">{{ log.time }}</span>
            <span class="logline__level">{{ log.level }}</span>
            <span class="logline__text">{{ log.text }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.module {
  display: grid;
  grid-template-columns: var(--rail-w) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.rail-panel {
  position: sticky;
  top: 12px;
  padding: 4px;
}

.rail__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-sm);
}

.rail__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.rail__pos {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail__item {
  height: 46px;
}

.rail__item.is-active .rail__pos {
  color: var(--primary);
  opacity: 0.75;
}

.module__main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.head-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  cursor: pointer;
  transition: border-color var(--dur-1) ease, background var(--dur-1) ease,
    transform var(--dur-1) var(--ease);
}

.preset:hover {
  border-color: var(--border-glow);
  transform: translateY(-1px);
}

.preset.is-active {
  border-color: var(--primary);
  background: var(--primary-weak);
}

.preset__label {
  font-size: var(--fs-sm);
  color: var(--text-2);
}

.preset.is-active .preset__label {
  color: var(--primary);
  font-weight: 500;
}

.preset__value {
  font-size: 11px;
  color: var(--text-4);
}

.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.readout {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--sunken);
  border: 1px solid var(--border);
}

.readout--target {
  border-style: dashed;
}

.readout__label {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.readout__value {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--text);
  line-height: 1.25;
}

.readout--target .readout__value {
  font-size: var(--fs-md);
  color: var(--text-2);
}

.readout__unit {
  font-size: 11px;
  color: var(--text-4);
}

.control-head {
  margin-top: 20px;
}

.control {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.control .field {
  width: 120px;
}

.control__grow {
  flex: 1;
  min-width: 180px;
}

.control__actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.exec {
  min-width: 84px;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.progress-wrap .progress {
  flex: 1;
}

.progress-text {
  font-size: var(--fs-xs);
  color: var(--text-4);
  min-width: 78px;
  text-align: right;
}

.log-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 9px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-4);
}

.search__input {
  width: 120px;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--fs-xs);
  color: var(--text);
}

.logbox {
  height: 220px;
  overflow-y: auto;
  padding: 8px 14px;
  background: var(--sunken);
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

@media (max-width: 1080px) {
  .module {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-panel {
    position: static;
  }

  .matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
