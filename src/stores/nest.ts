import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCameras, fetchPlcErrors, fetchRunStatus } from '@/api/endpoints'
import type { AxisError, CameraInfo, RunStatus, RuntimeMode } from '@/api/types'

const STATUS_TEXT: Record<number, string> = {
  0: '空闲待命',
  1: '运行中',
  2: '故障',
}

export const DOOR_TEXT: Record<number, string> = {
  10: '已打开',
  20: '已关闭',
  30: '打开中',
  40: '关闭中',
  50: '舱门故障',
}

export const LIFT_TEXT: Record<number, string> = {
  10: '已降落',
  11: '升起中',
  20: '已升起',
  21: '下降中',
}

export const useNestStore = defineStore('nest', () => {
  const runStatus = ref<RunStatus | null>(null)
  const plcErrors = ref<AxisError[]>([])
  const cameras = ref<CameraInfo[]>([])
  const loading = ref(false)
  const errorMessage = ref('')
  const lastUpdated = ref<number>(0)
  const mode = ref<RuntimeMode>('offline')

  let statusTimer = 0
  let errorTimer = 0

  const isHealthy = computed(() => {
    const status = runStatus.value
    if (!status || mode.value !== 'live') return false
    if (status.emgStop === 1 || status.door === 50 || status.workStatus === 2) return false
    return !plcErrors.value.some((axis) =>
      [axis.axisPowerErr, axis.axisStatusErr, axis.servoErrorErr, axis.servoAxisErr].some(
        (code) => code && code !== '0',
      ),
    )
  })

  const workStatusText = computed(() => STATUS_TEXT[runStatus.value?.workStatus ?? 0] ?? '未知')
  const doorText = computed(() => DOOR_TEXT[runStatus.value?.door ?? 20] ?? '未知')
  const liftText = computed(() => LIFT_TEXT[runStatus.value?.lift ?? 10] ?? '未知')
  const batteryInstalled = computed(
    () => runStatus.value?.battery?.filter((slot) => slot.exist === 1).length ?? 0,
  )
  const batteryTotal = computed(() => runStatus.value?.battery?.length ?? 0)
  const publishingCount = computed(
    () => cameras.value.filter((camera) => camera.isPushing).length,
  )

  async function refreshStatus(): Promise<void> {
    loading.value = true
    try {
      runStatus.value = await fetchRunStatus()
      lastUpdated.value = Date.now()
      errorMessage.value = ''
      mode.value = 'live'
    } catch (error) {
      mode.value = 'offline'
      errorMessage.value = error instanceof Error ? error.message : '获取运行状态失败'
    } finally {
      loading.value = false
    }
  }

  async function refreshErrors(): Promise<void> {
    try {
      plcErrors.value = await fetchPlcErrors()
    } catch {
      /* 静默失败，不打断看板 */
    }
  }

  async function refreshCameras(): Promise<void> {
    try {
      cameras.value = await fetchCameras()
    } catch {
      /* 页面级操作负责显示错误，不打断全局状态轮询 */
    }
  }

  function setCameras(next: CameraInfo[]): void {
    cameras.value = next.map((camera) => ({ ...camera }))
  }

  function startPolling(interval = 5000): void {
    stopPolling()
    void refreshStatus()
    void refreshErrors()
    void refreshCameras()
    statusTimer = window.setInterval(() => void refreshStatus(), interval)
    errorTimer = window.setInterval(() => void refreshErrors(), interval * 3)
  }

  function stopPolling(): void {
    if (statusTimer) window.clearInterval(statusTimer)
    if (errorTimer) window.clearInterval(errorTimer)
    statusTimer = 0
    errorTimer = 0
  }

  return {
    runStatus,
    plcErrors,
    cameras,
    loading,
    errorMessage,
    lastUpdated,
    mode,
    isHealthy,
    workStatusText,
    doorText,
    liftText,
    batteryInstalled,
    batteryTotal,
    publishingCount,
    refreshStatus,
    refreshErrors,
    refreshCameras,
    setCameras,
    startPolling,
    stopPolling,
  }
})
