import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  COORD_GROUPS,
  INITIAL_POSITIONS,
  MODULES,
  SIGNALS,
  makeLog,
  seedLogs,
  type LogItem,
  type SignalDef,
} from '@/data/fixtures'

export type RunMode = 'position' | 'speed' | 'servo'

export const MODE_TEXT: Record<RunMode, string> = {
  position: '位置模式',
  speed: '速度模式',
  servo: '伺服使能',
}

/** 成对单步操作：与原系统「功能调试」的开/关一一对应 */
export const STEP_PAIRS = [
  { key: 'door', label: '舱门', on: '开舱门', off: '关舱门', icon: 'layers' },
  { key: 'platform', label: '平台', on: '开平台', off: '关平台', icon: 'arrowUp' },
  { key: 'align', label: '规整', on: '开规整', off: '关规整', icon: 'expand' },
  { key: 'alignX', label: '左右规整', on: '开左右规整', off: '关左右规整', icon: 'chevronLeft' },
  { key: 'alignY', label: '前后规整', on: '开前后规整', off: '关前后规整', icon: 'chevronRight' },
] as const

export const useDeviceStore = defineStore('device', () => {
  const positions = reactive<Record<string, number>>({ ...INITIAL_POSITIONS })
  const signalList = ref<SignalDef[]>(SIGNALS.map((item) => ({ ...item })))
  const changed = ref<string[]>([])

  const activeKey = ref('xz')
  const presetId = ref(1)
  const speed = ref(6)
  const targetText = ref('')
  const mode = ref<RunMode>('servo')
  const running = ref(false)
  const progress = ref(0)

  const logs = ref<LogItem[]>(seedLogs())

  let timer = 0

  const activeModule = computed(() => MODULES.find((item) => item.key === activeKey.value) ?? MODULES[0])
  const activePreset = computed(
    () => activeModule.value.presets.find((item) => item.id === presetId.value) ?? activeModule.value.presets[0],
  )
  const currentValues = computed(() =>
    activeModule.value.axes.map((axis) => positions[axis.key] ?? 0),
  )
  const targetValues = computed(() => {
    if (targetText.value.trim()) {
      return targetText.value
        .split(/[,，\s]+/)
        .map((item) => Number(item))
        .filter((value) => Number.isFinite(value))
    }
    return activePreset.value?.targets ?? []
  })
  const coords = computed(() => COORD_GROUPS)

  function appendLog(level: LogItem['level'], text: string): void {
    logs.value.unshift(makeLog(level, text))
    if (logs.value.length > 120) logs.value.pop()
  }

  function clearLogs(): void {
    logs.value = []
  }

  function flash(names: string[]): void {
    changed.value = names
    window.setTimeout(() => {
      changed.value = []
    }, 900)
  }

  function syncSignals(): void {
    const map: Record<string, number> = {
      xz_pos: positions.xz ?? 0,
      yz_pos: positions.yz ?? 0,
      zz_pos: positions.zz ?? 0,
      j_pos: positions.j_pos ?? 0,
      d_pos: positions.d_pos ?? 0,
      dh_pos: positions.dh_pos ?? 0,
      zy_pos: positions.zy_pos ?? 0,
      db_pos: positions.db_pos ?? 0,
      qcm_pos: positions.qcm_pos ?? 0,
      hcm_pos: positions.hcm_pos ?? 0,
    }
    signalList.value.forEach((signal) => {
      if (signal.kind === 'num' && signal.name in map) signal.value = map[signal.name]
    })
  }

  function selectModule(key: string): void {
    activeKey.value = key
    presetId.value = 1
    targetText.value = ''
    mode.value = (MODULES.find((item) => item.key === key)?.mode ?? 'servo') as RunMode
    speed.value = MODULES.find((item) => item.key === key)?.speed ?? 6
    appendLog('INFO', `切换模块 → ${MODULES.find((item) => item.key === key)?.name ?? key}`)
  }

  function setPreset(id: number): void {
    presetId.value = id
    targetText.value = ''
  }

  /** 模拟一次执行：按轴补间到目标值，同时刷新信号与日志 */
  function execute(): void {
    if (running.value) return
    const targets = targetValues.value
    const axes = activeModule.value.axes
    if (!targets.length || targets.length !== axes.length) {
      appendLog('WARN', `目标位置数量与轴数不匹配（${targets.length} / ${axes.length}）`)
      return
    }

    running.value = true
    progress.value = 0
    const from = axes.map((axis) => positions[axis.key] ?? 0)
    const started = performance.now()
    const duration = 1400
    appendLog('INFO', `执行 → ${activeModule.value.name} 目标 ${targets.join(', ')}`)

    timer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      axes.forEach((axis, index) => {
        positions[axis.key] = Math.round(from[index] + (targets[index] - from[index]) * eased)
      })
      progress.value = Math.round(eased * 100)
      syncSignals()
      if (t >= 1) {
        window.clearInterval(timer)
        running.value = false
        progress.value = 100
        flash(activeModule.value.axes.map((axis) => `${axis.key}_pos`))
        appendLog('INFO', `到位 → ${axes.map((axis) => `${axis.label}:${positions[axis.key]}`).join(' ')}`)
      }
    }, 48)
  }

  function stop(): void {
    if (!running.value) return
    window.clearInterval(timer)
    running.value = false
    progress.value = 0
    appendLog('WARN', `中止 → ${activeModule.value.name} 停留在 ${activeModule.value.axes.map((axis) => positions[axis.key]).join(', ')}`)
  }

  function resetAll(): void {
    MODULES.forEach((module) => {
      module.presets
        .filter((preset) => preset.label === '初始位')
        .forEach((preset) => {
          module.axes.forEach((axis, index) => {
            const value = preset.targets[index]
            if (Number.isFinite(value)) positions[axis.key] = value
          })
        })
    })
    syncSignals()
    appendLog('INFO', '全部模块回初始位')
  }

  return {
    positions,
    signalList,
    changed,
    activeKey,
    activeModule,
    activePreset,
    presetId,
    speed,
    targetText,
    targetValues,
    currentValues,
    mode,
    running,
    progress,
    logs,
    coords,
    appendLog,
    clearLogs,
    selectModule,
    setPreset,
    execute,
    stop,
    resetAll,
  }
})
