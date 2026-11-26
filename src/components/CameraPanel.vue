<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackToTopButton from '@/components/BackToTopButton.vue'
import FlvPlayer from '@/components/FlvPlayer.vue'
import { fetchCameras, saveCameras, startStream, stopStream } from '@/api/endpoints'
import { useToast } from '@/composables/toast'
import { useNestStore } from '@/stores/nest'
import type { CameraInfo } from '@/api/types'

type PreviewStatus = 'idle' | 'connecting' | 'playing' | 'error'
type BusyKind = 'start' | 'stop' | 'disable' | null
type BatchKind = '' | 'start' | 'stop' | 'disable' | 'enable'
type ConfirmKind = 'disable-all' | 'stop-all' | null

const CHANNELS: Record<number, { name: string; scene: string }> = {
  0: { name: '舱内摄像头', scene: '舱内 · 设备舱' },
  1: { name: '舱门摄像头', scene: '舱门 · 进出通道' },
  2: { name: '舱外摄像头', scene: '舱外 · 周边环境' },
  3: { name: '东侧停机坪摄像头', scene: '机巢 · 东侧停机坪' },
  4: { name: '西侧停机坪摄像头', scene: '机巢 · 西侧停机坪' },
  5: { name: '充电区摄像头', scene: '充电区 · 电池仓' },
  6: { name: '起降区摄像头', scene: '起降区 · 无人机' },
  7: { name: '环境监测摄像头', scene: '周边 · 环境气象' },
}

const toast = useToast()
const nestStore = useNestStore()

const cameras = ref<CameraInfo[]>([])
const loading = ref(false)
const loadError = ref('')
const lastRefresh = ref(0)
const batchBusy = ref<BatchKind>('')
const busy = reactive<Record<number, BusyKind>>({})
const previewEnabled = ref(true)
const previewStatus = reactive<Record<number, PreviewStatus>>({})
const retryTick = reactive<Record<number, number>>({})
const streamUrls = reactive<Record<number, string>>({})
const confirmKind = ref<ConfirmKind>(null)
const clock = ref(new Date())

const editOpen = ref(false)
const editSaving = ref(false)
const editError = ref('')
const editForm = reactive({
  id: 0,
  name: '',
  rtsp: '',
  disabled: false,
})

let pollTimer = 0
let clockTimer = 0
let refreshTimer = 0

const enabledCameras = computed(() => cameras.value.filter((camera) => camera.disabled !== 1))
const pushingCount = computed(
  () => cameras.value.filter((camera) => camera.disabled !== 1 && camera.isPushing).length,
)
const disabledCount = computed(() => cameras.value.filter((camera) => camera.disabled === 1).length)
const idleCount = computed(
  () => cameras.value.filter((camera) => camera.disabled !== 1 && !camera.isPushing).length,
)
const allEnabled = computed(
  () => cameras.value.length > 0 && cameras.value.every((camera) => camera.disabled !== 1),
)
const isAnyBusy = computed(
  () => Boolean(batchBusy.value) || Object.values(busy).some((value) => value !== null),
)
const lastRefreshText = computed(() =>
  lastRefresh.value
    ? new Date(lastRefresh.value).toLocaleTimeString('zh-CN', { hour12: false })
    : '—',
)
const clockText = computed(() => clock.value.toLocaleTimeString('zh-CN', { hour12: false }))

const confirmMeta = computed(() => {
  if (confirmKind.value === 'disable-all') {
    return {
      title: '禁用全部视频通道',
      message: '将停止并禁用全部摄像头推流，确认继续？',
      detail: '禁用后所有通道均无法启动，需要重新启用后才能恢复画面。',
      confirmText: '确认禁用',
      danger: true,
    }
  }
  if (confirmKind.value === 'stop-all') {
    return {
      title: '停止全部视频推流',
      message: `将停止当前 ${pushingCount.value} 路推流，确认继续？`,
      detail: '实时画面会同步中断，可随时重新启动推流。',
      confirmText: '确认停止',
      danger: true,
    }
  }
  return null
})

function channelOf(id: number): { name: string; scene: string } {
  return CHANNELS[id] ?? { name: `摄像头 ${id + 1}`, scene: '自定义通道' }
}

function cameraName(camera: CameraInfo): string {
  return camera.name?.trim() || channelOf(camera.id).name
}

function statusTone(camera: CameraInfo): 'live' | 'idle' | 'disabled' | 'error' {
  if (camera.disabled === 1) return 'disabled'
  if (camera.isPushing) return previewStatus[camera.id] === 'error' ? 'error' : 'live'
  return 'idle'
}

function statusLabel(camera: CameraInfo): string {
  const tone = statusTone(camera)
  if (tone === 'disabled') return '已禁用'
  if (tone === 'live') return '推流中'
  if (tone === 'error') return '画面异常'
  return '未推流'
}

function previewSrc(camera: CameraInfo): string {
  if (!previewEnabled.value || camera.disabled === 1) return ''
  return streamUrls[camera.id] || camera.flv || ''
}

function showPlayer(camera: CameraInfo): boolean {
  return Boolean(previewSrc(camera)) && previewStatus[camera.id] !== 'error'
}

function posterHidden(camera: CameraInfo): boolean {
  return previewEnabled.value && previewStatus[camera.id] === 'playing'
}

function previewPaused(camera: CameraInfo): boolean {
  return !previewEnabled.value && camera.isPushing && camera.disabled !== 1
}

function playerKey(camera: CameraInfo): string {
  return `${previewSrc(camera)}#${retryTick[camera.id] ?? 0}`
}

function previewTitle(camera: CameraInfo): string {
  if (busy[camera.id] === 'start') return '正在启动推流'
  if (busy[camera.id] === 'stop') return '正在停止推流'
  if (camera.disabled === 1) return '通道已禁用'
  if (!camera.isPushing) return '尚未推流'
  if (!previewEnabled.value) return '实时预览已暂停'
  if (previewStatus[camera.id] === 'error') return '画面加载失败'
  if (previewStatus[camera.id] === 'playing') return '实时画面'
  if (previewStatus[camera.id] === 'connecting') return '正在连接画面'
  if (!previewSrc(camera)) return '暂无播放地址'
  return '推流中'
}

function previewHint(camera: CameraInfo): string {
  if (busy[camera.id] === 'start') return '正在建立视频通道，请稍候'
  if (busy[camera.id] === 'stop') return '正在关闭该路视频流'
  if (camera.disabled === 1) return '启用通道后可恢复推流与实时画面'
  if (!camera.isPushing) return '启动推流后即可在此查看实时画面'
  if (!previewEnabled.value) return '打开实时预览即可查看当前画面'
  if (previewStatus[camera.id] === 'error') return '请检查视频流地址或点击重试'
  if (previewStatus[camera.id] === 'connecting') return '拉取 FLV 视频流中'
  if (!previewSrc(camera)) return '接口未返回可播放的 FLV 地址'
  return '视频流已就绪'
}

function applyPreviewPresence(): void {
  for (const camera of cameras.value) {
    if (!previewEnabled.value) {
      previewStatus[camera.id] = 'idle'
    } else if (camera.isPushing && camera.disabled !== 1 && (streamUrls[camera.id] || camera.flv)) {
      previewStatus[camera.id] = 'connecting'
    }
  }
}

function togglePreview(event: Event): void {
  previewEnabled.value = (event.target as HTMLInputElement).checked
  applyPreviewPresence()
}

function enablePreview(): void {
  previewEnabled.value = true
  applyPreviewPresence()
}

function onPreviewStatus(id: number, status: PreviewStatus): void {
  previewStatus[id] = status
}

function retryPreview(camera: CameraInfo): void {
  retryTick[camera.id] = (retryTick[camera.id] ?? 0) + 1
  previewStatus[camera.id] = 'connecting'
}

async function toggleFullscreen(camera: CameraInfo): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => undefined)
    return
  }
  const element = document.querySelector(`[data-cam-id="${camera.id}"]`) as HTMLElement | null
  await element?.requestFullscreen?.().catch(() => undefined)
}

function syncMediaState(): void {
  const known = new Set(cameras.value.map((camera) => camera.id))
  for (const key of Object.keys(streamUrls)) {
    if (!known.has(Number(key))) delete streamUrls[Number(key)]
  }

  for (const camera of cameras.value) {
    if (camera.disabled === 1 || !camera.isPushing) {
      delete streamUrls[camera.id]
      previewStatus[camera.id] = 'idle'
      continue
    }
    if (!streamUrls[camera.id] && camera.flv) streamUrls[camera.id] = camera.flv
    if (previewStatus[camera.id] !== 'playing' && previewStatus[camera.id] !== 'error') {
      previewStatus[camera.id] = previewSrc(camera) ? 'connecting' : 'idle'
    }
  }
}

async function loadCameras(silent = false): Promise<void> {
  if (loading.value) return
  loading.value = true
  if (!silent) loadError.value = ''
  try {
    const list = await fetchCameras()
    cameras.value = list
    loadError.value = ''
    syncMediaState()
    nestStore.setCameras(cameras.value)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取摄像头失败'
    if (!silent) toast.apiError('读取摄像头失败', error, '请检查设备连接')
  } finally {
    loading.value = false
    lastRefresh.value = Date.now()
  }
}

function scheduleRefresh(delay = 1500): void {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0
    void loadCameras(true)
  }, delay)
}

function isSuccess(result: { result: number | boolean } | undefined): boolean {
  return result?.result === true || result?.result === 1
}

async function startCameras(ids: number[]): Promise<void> {
  if (batchBusy.value) return
  const targets = cameras.value.filter(
    (camera) => ids.includes(camera.id) && camera.disabled !== 1 && !busy[camera.id],
  )
  if (!targets.length) {
    toast.warning('没有可启动的通道', '已禁用的通道需要先启用')
    return
  }

  const isBatch = targets.length > 1
  if (isBatch) batchBusy.value = 'start'
  targets.forEach((camera) => {
    busy[camera.id] = 'start'
  })

  try {
    const results = await startStream(targets.map((camera) => camera.id))
    let succeeded = 0
    const failed: string[] = []

    for (const camera of targets) {
      const result = results.find((item) => item.id === camera.id)
      if (!isSuccess(result)) {
        failed.push(cameraName(camera))
        continue
      }
      succeeded += 1
      camera.isPushing = true
      const url = result?.ws || result?.http || camera.flv
      if (url) {
        streamUrls[camera.id] = url
        previewStatus[camera.id] = 'connecting'
      } else {
        previewStatus[camera.id] = 'idle'
      }
    }

    nestStore.setCameras(cameras.value)
    if (succeeded) {
      toast.success(
        succeeded > 1 ? `已启动 ${succeeded} 路推流` : '推流已启动',
        succeeded > 1 ? '实时画面正在加载' : cameraName(targets[0]),
      )
    }
    if (failed.length) {
      toast.warning(`${failed.length} 路启动失败`, failed.join('、'))
    }
  } catch (error) {
    toast.apiError('启动推流失败', error, '请检查摄像头连接与设备状态')
  } finally {
    targets.forEach((camera) => {
      busy[camera.id] = null
    })
    if (isBatch) batchBusy.value = ''
    scheduleRefresh()
  }
}

async function stopCameras(ids: number[]): Promise<void> {
  if (batchBusy.value) return
  const targets = cameras.value.filter(
    (camera) => ids.includes(camera.id) && camera.isPushing && !busy[camera.id],
  )
  if (!targets.length) {
    toast.info('当前没有正在推流的通道')
    return
  }

  const isBatch = targets.length > 1
  if (isBatch) batchBusy.value = 'stop'
  targets.forEach((camera) => {
    busy[camera.id] = 'stop'
  })

  try {
    const results = await stopStream(targets.map((camera) => camera.id))
    let succeeded = 0
    const failed: string[] = []

    for (const camera of targets) {
      const result = results.find((item) => item.id === camera.id)
      const success = results.length === 0 || isSuccess(result)
      if (!success) {
        failed.push(cameraName(camera))
        continue
      }
      succeeded += 1
      camera.isPushing = false
      delete streamUrls[camera.id]
      previewStatus[camera.id] = 'idle'
    }

    nestStore.setCameras(cameras.value)
    if (succeeded) {
      toast.info(succeeded > 1 ? `已停止 ${succeeded} 路推流` : '推流已停止', '实时画面已关闭')
    }
    if (failed.length) toast.warning(`${failed.length} 路停止失败`, failed.join('、'))
  } catch (error) {
    toast.apiError('停止推流失败', error, '请检查设备连接')
  } finally {
    targets.forEach((camera) => {
      busy[camera.id] = null
    })
    if (isBatch) batchBusy.value = ''
    scheduleRefresh()
  }
}

function startAll(): void {
  if (!enabledCameras.value.length) {
    toast.warning('没有已启用的通道', '请先启用摄像头后再启动推流')
    return
  }
  const idle = enabledCameras.value.filter((camera) => !camera.isPushing)
  if (!idle.length) {
    toast.info('所有已启用通道均在推流中')
    return
  }
  void startCameras(idle.map((camera) => camera.id))
}

function requestStopAll(): void {
  if (!pushingCount.value) {
    toast.info('当前没有正在推流的通道')
    return
  }
  confirmKind.value = 'stop-all'
}

async function setDisabledOne(camera: CameraInfo, next: 0 | 1): Promise<void> {
  if (busy[camera.id] || batchBusy.value || camera.disabled === next) return
  const previous = camera.disabled
  camera.disabled = next
  busy[camera.id] = 'disable'

  try {
    await saveCameras([camera])
    if (next === 1 && camera.isPushing) {
      camera.isPushing = false
      delete streamUrls[camera.id]
      previewStatus[camera.id] = 'idle'
      await stopStream([camera.id]).catch(() => undefined)
    }
    nestStore.setCameras(cameras.value)
    toast.success(next === 1 ? '已禁用推流' : '已启用推流', cameraName(camera))
  } catch (error) {
    camera.disabled = previous
    toast.apiError(next === 1 ? '禁用失败' : '启用失败', error, '请稍后重试')
  } finally {
    busy[camera.id] = null
  }
}

function onToggleDisabled(camera: CameraInfo, event: Event): void {
  const next = (event.target as HTMLInputElement).checked ? 1 : 0
  void setDisabledOne(camera, next)
}

async function applyAllDisabled(disabled: 0 | 1): Promise<void> {
  if (!cameras.value.length || batchBusy.value) return
  if (disabled === 1 ? disabledCount.value === cameras.value.length : allEnabled.value) {
    toast.info(disabled === 1 ? '全部通道已禁用' : '全部通道已启用')
    return
  }

  const previous = cameras.value.map((camera) => ({ ...camera }))
  cameras.value = cameras.value.map((camera) => ({ ...camera, disabled }))
  batchBusy.value = disabled === 1 ? 'disable' : 'enable'

  try {
    await saveCameras(cameras.value)
    if (disabled === 1) {
      const pushingIds = previous.filter((camera) => camera.isPushing).map((camera) => camera.id)
      if (pushingIds.length) {
        await stopStream(pushingIds).catch(() => undefined)
      }
      for (const camera of cameras.value) {
        camera.isPushing = false
        delete streamUrls[camera.id]
        previewStatus[camera.id] = 'idle'
      }
    }
    nestStore.setCameras(cameras.value)
    toast.success(
      disabled === 1 ? '已禁用全部通道' : '已启用全部通道',
      `共 ${cameras.value.length} 路`,
    )
  } catch (error) {
    cameras.value = previous
    nestStore.setCameras(cameras.value)
    toast.apiError('批量设置失败', error, '请稍后重试')
  } finally {
    batchBusy.value = ''
  }
}

function openEdit(camera: CameraInfo): void {
  editForm.id = camera.id
  editForm.name = cameraName(camera)
  editForm.rtsp = camera.rtsp
  editForm.disabled = camera.disabled === 1
  editError.value = ''
  editOpen.value = true
}

function closeEdit(): void {
  if (editSaving.value) return
  editOpen.value = false
}

async function saveEdit(): Promise<void> {
  const name = editForm.name.trim()
  const rtsp = editForm.rtsp.trim()
  editError.value = ''

  if (!name) {
    editError.value = '请填写摄像头名称'
    return
  }
  if (!rtsp) {
    editError.value = '请填写 RTSP 地址'
    return
  }
  if (!/^(rtsp|rtsps|https?):\/\//i.test(rtsp)) {
    editError.value = '地址需以 rtsp:// 或 http(s):// 开头'
    return
  }

  const camera = cameras.value.find((item) => item.id === editForm.id)
  if (!camera) {
    editError.value = '通道不存在，请刷新后重试'
    return
  }

  const nextDisabled = editForm.disabled ? 1 : 0
  const rtspChanged = rtsp !== camera.rtsp
  editSaving.value = true

  try {
    await saveCameras([{ ...camera, name, rtsp, disabled: nextDisabled }])
    const wasPushing = camera.isPushing
    camera.name = name
    camera.rtsp = rtsp
    camera.disabled = nextDisabled

    if (wasPushing && (nextDisabled === 1 || rtspChanged)) {
      camera.isPushing = false
      delete streamUrls[camera.id]
      previewStatus[camera.id] = 'idle'
      await stopStream([camera.id]).catch(() => undefined)
    }

    nestStore.setCameras(cameras.value)
    editOpen.value = false
    toast.success('摄像头配置已保存', rtspChanged && wasPushing ? '地址已更新，请重新启动推流' : name)
  } catch (error) {
    editError.value = error instanceof Error ? error.message : '保存失败，请稍后重试'
    toast.apiError('保存摄像头配置失败', error, '请稍后重试')
  } finally {
    editSaving.value = false
  }
}

async function copyRtsp(camera: CameraInfo): Promise<void> {
  const text = camera.rtsp?.trim()
  if (!text) {
    toast.warning('该通道尚未配置 RTSP 地址')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success('已复制 RTSP 地址', cameraName(camera))
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (copied) {
      toast.success('已复制 RTSP 地址', cameraName(camera))
    } else {
      toast.error('复制失败', '当前浏览器不允许访问剪贴板')
    }
  }
}

async function runConfirm(): Promise<void> {
  const kind = confirmKind.value
  if (!kind) return
  try {
    if (kind === 'disable-all') {
      await applyAllDisabled(1)
    } else if (kind === 'stop-all') {
      await stopCameras(cameras.value.filter((camera) => camera.isPushing).map((camera) => camera.id))
    }
  } finally {
    confirmKind.value = null
  }
}

function closeConfirm(): void {
  if (isAnyBusy.value) return
  confirmKind.value = null
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (editOpen.value) closeEdit()
  else if (confirmKind.value) closeConfirm()
}

watch(editOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  void loadCameras()
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && !isAnyBusy.value && !editOpen.value) {
      void loadCameras(true)
    }
  }, 15000)
  clockTimer = window.setInterval(() => {
    clock.value = new Date()
  }, 1000)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  if (clockTimer) window.clearInterval(clockTimer)
  if (refreshTimer) window.clearTimeout(refreshTimer)
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="cam-page">
    <section class="cam-command">
      <div class="cam-command__stats">
        <article class="cam-kpi cam-kpi--blue">
          <span class="cam-kpi__icon"><AppIcon name="camera" :size="20" /></span>
          <div class="cam-kpi__body">
            <small>通道总数</small>
            <strong class="cam-kpi__value">{{ loading && !cameras.length ? '—' : cameras.length }}<em>路</em></strong>
          </div>
        </article>
        <article class="cam-kpi cam-kpi--green">
          <span class="cam-kpi__icon"><AppIcon name="radio" :size="20" /></span>
          <div class="cam-kpi__body">
            <small>正在推流</small>
            <strong class="cam-kpi__value">{{ pushingCount }}<em>路</em></strong>
          </div>
        </article>
        <article class="cam-kpi cam-kpi--amber">
          <span class="cam-kpi__icon"><AppIcon name="signalOff" :size="20" /></span>
          <div class="cam-kpi__body">
            <small>未推流</small>
            <strong class="cam-kpi__value">{{ idleCount }}<em>路</em></strong>
          </div>
        </article>
        <article class="cam-kpi cam-kpi--violet">
          <span class="cam-kpi__icon"><AppIcon name="lock" :size="20" /></span>
          <div class="cam-kpi__body">
            <small>已禁用</small>
            <strong class="cam-kpi__value">{{ disabledCount }}<em>路</em></strong>
          </div>
        </article>
      </div>

      <div class="cam-command__actions">
        <label class="cam-preview-toggle">
          <input type="checkbox" :checked="previewEnabled" @change="togglePreview" />
          <span class="switch__track" />
          <span>
            <strong>实时预览</strong>
            <small>{{ previewEnabled ? '画面自动加载' : '已暂停拉流' }}</small>
          </span>
        </label>

        <button class="cam-ctl" type="button" :disabled="loading" @click="loadCameras()">
          <AppIcon name="refresh" :size="14" :class="{ spin: loading }" />
          刷新
        </button>
        <button
          class="cam-ctl cam-ctl--primary"
          type="button"
          :disabled="isAnyBusy || !enabledCameras.length || !idleCount"
          @click="startAll"
        >
          <AppIcon :name="batchBusy === 'start' ? 'refresh' : 'play'" :size="14" :class="{ spin: batchBusy === 'start' }" />
          {{ batchBusy === 'start' ? '启动中' : '全部启动' }}
        </button>
        <button
          class="cam-ctl"
          type="button"
          :disabled="isAnyBusy || !pushingCount"
          @click="requestStopAll"
        >
          <AppIcon :name="batchBusy === 'stop' ? 'refresh' : 'stop'" :size="13" :class="{ spin: batchBusy === 'stop' }" />
          {{ batchBusy === 'stop' ? '停止中' : '全部停止' }}
        </button>
      </div>
    </section>

    <section class="cam-list">
      <header class="cam-list__head">
        <div>
          <h2>视频通道</h2>
          <p>
            {{ cameras.length }} 路通道 · {{ enabledCameras.length }} 路已启用 ·
            <span class="cam-list__sync">刷新于 {{ lastRefreshText }}</span>
          </p>
        </div>
        <div class="cam-list__batch">
          <button
            class="cam-ctl cam-ctl--sm"
            type="button"
            :disabled="isAnyBusy || !cameras.length || allEnabled"
            @click="applyAllDisabled(0)"
          >
            <AppIcon name="unlock" :size="13" />
            {{ batchBusy === 'enable' ? '启用中' : '启用全部推流' }}
          </button>
          <button
            class="cam-ctl cam-ctl--sm cam-ctl--warn"
            type="button"
            :disabled="isAnyBusy || !cameras.length || disabledCount === cameras.length"
            @click="confirmKind = 'disable-all'"
          >
            <AppIcon name="lock" :size="13" />
            {{ batchBusy === 'disable' ? '禁用中' : '禁用全部推流' }}
          </button>
        </div>
      </header>

      <div v-if="loadError && cameras.length" class="cam-alert">
        <AppIcon name="alert" :size="16" />
        <span>状态同步失败：{{ loadError }}</span>
        <button type="button" @click="loadCameras()">重新读取</button>
      </div>

      <div class="cam-grid">
        <template v-if="loading && !cameras.length">
          <article v-for="index in 8" :key="`skeleton-${index}`" class="cam-card cam-card--skeleton">
            <div class="cam-skeleton__media" />
            <div class="cam-skeleton__body">
              <span class="cam-skeleton__line cam-skeleton__line--lg" />
              <span class="cam-skeleton__line" />
              <span class="cam-skeleton__line cam-skeleton__line--sm" />
            </div>
          </article>
        </template>

        <article
          v-for="camera in cameras"
          :key="camera.id"
          class="cam-card"
          :class="{
            'cam-card--disabled': camera.disabled === 1,
            'cam-card--live': camera.isPushing && camera.disabled !== 1,
          }"
        >
          <div class="cam-media" :data-cam-id="camera.id">
            <FlvPlayer
              v-if="showPlayer(camera)"
              :key="playerKey(camera)"
              class="cam-media__player"
              :class="{ 'is-playing': previewStatus[camera.id] === 'playing' }"
              :src="previewSrc(camera)"
              @status="(status) => onPreviewStatus(camera.id, status)"
            />

            <div class="cam-media__poster" :class="{ 'is-hidden': posterHidden(camera) }">
              <span class="cam-media__orb" :class="{ 'is-busy': busy[camera.id] === 'start' }">
                <AppIcon
                  :name="
                    busy[camera.id] === 'start'
                      ? 'refresh'
                      : camera.disabled === 1
                        ? 'lock'
                        : previewStatus[camera.id] === 'error'
                          ? 'signalOff'
                          : 'camera'
                  "
                  :size="26"
                  :class="{ spin: busy[camera.id] === 'start' || previewStatus[camera.id] === 'connecting' }"
                />
              </span>
              <strong>{{ previewTitle(camera) }}</strong>
              <small>{{ previewHint(camera) }}</small>

              <button
                v-if="camera.disabled === 1 && !busy[camera.id]"
                class="cam-media__btn"
                type="button"
                :disabled="isAnyBusy"
                @click="setDisabledOne(camera, 0)"
              >
                启用通道
              </button>
              <button
                v-else-if="!camera.isPushing && !busy[camera.id]"
                class="cam-media__btn"
                type="button"
                :disabled="isAnyBusy"
                @click="startCameras([camera.id])"
              >
                <AppIcon name="play" :size="12" />
                启动推流
              </button>
              <button
                v-else-if="previewStatus[camera.id] === 'error'"
                class="cam-media__btn"
                type="button"
                @click="retryPreview(camera)"
              >
                <AppIcon name="refresh" :size="12" />
                重试画面
              </button>
              <button
                v-else-if="previewPaused(camera)"
                class="cam-media__btn"
                type="button"
                @click="enablePreview"
              >
                <AppIcon name="eye" :size="12" />
                打开预览
              </button>
            </div>

            <div class="cam-media__top">
              <span class="cam-live" :class="`cam-live--${statusTone(camera)}`">
                <i />
                {{ statusLabel(camera) }}
              </span>
              <span class="cam-media__top-right">
                <button
                  v-if="previewStatus[camera.id] === 'playing'"
                  class="cam-media__icon-btn"
                  type="button"
                  title="全屏查看"
                  aria-label="全屏查看"
                  @click="toggleFullscreen(camera)"
                >
                  <AppIcon name="expand" :size="12" />
                </button>
                <span class="cam-id mono">CAM-{{ String(camera.id).padStart(2, '0') }}</span>
              </span>
            </div>

            <div class="cam-media__foot">
              <div class="cam-media__name">
                <strong>{{ cameraName(camera) }}</strong>
                <span>{{ channelOf(camera.id).scene }}</span>
              </div>
              <span v-if="camera.isPushing && camera.disabled !== 1" class="cam-media__time mono">
                {{ clockText }}
              </span>
            </div>
          </div>

          <div class="cam-card__body">
            <div class="cam-card__head">
              <div class="cam-card__title">
                <h3>{{ cameraName(camera) }}</h3>
                <p>CH {{ String(camera.id).padStart(2, '0') }} · {{ channelOf(camera.id).scene }}</p>
              </div>
              <button
                class="cam-edit"
                type="button"
                title="编辑摄像头"
                aria-label="编辑摄像头"
                :disabled="isAnyBusy"
                @click="openEdit(camera)"
              >
                <AppIcon name="edit" :size="15" />
              </button>
            </div>

            <div class="cam-url" :title="camera.rtsp || '未配置 RTSP 地址'">
              <span class="cam-url__label"><AppIcon name="link" :size="12" /> RTSP</span>
              <code>{{ camera.rtsp || '未配置 RTSP 地址' }}</code>
              <button type="button" title="复制 RTSP 地址" @click="copyRtsp(camera)">
                <AppIcon name="copy" :size="13" />
              </button>
            </div>

            <div class="cam-card__foot">
              <div class="cam-card__state-row">
                <span class="cam-state" :class="`cam-state--${statusTone(camera)}`">
                  <i />
                  {{ statusLabel(camera) }}
                </span>
                <label class="switch cam-toggle">
                  <input
                    type="checkbox"
                    :checked="camera.disabled === 1"
                    :disabled="isAnyBusy"
                    @change="onToggleDisabled(camera, $event)"
                  />
                  <span class="switch__track" />
                  禁用推流
                </label>
              </div>

              <button
                v-if="camera.isPushing"
                class="cam-card__action cam-card__action--stop"
                type="button"
                :disabled="isAnyBusy"
                @click="stopCameras([camera.id])"
              >
                <AppIcon :name="busy[camera.id] === 'stop' ? 'refresh' : 'stop'" :size="14" :class="{ spin: busy[camera.id] === 'stop' }" />
                {{ busy[camera.id] === 'stop' ? '正在停止…' : '停止推流' }}
              </button>
              <button
                v-else
                class="cam-card__action"
                type="button"
                :disabled="isAnyBusy || camera.disabled === 1"
                @click="startCameras([camera.id])"
              >
                <AppIcon :name="busy[camera.id] === 'start' ? 'refresh' : 'play'" :size="14" :class="{ spin: busy[camera.id] === 'start' }" />
                {{
                  busy[camera.id] === 'start'
                    ? '正在启动…'
                    : camera.disabled === 1
                      ? '通道已禁用'
                      : '启动推流'
                }}
              </button>
            </div>
          </div>
        </article>

        <article v-if="!loading && !cameras.length" class="cam-empty">
          <span class="cam-empty__orb"><AppIcon name="camera" :size="30" /></span>
          <h3>{{ loadError ? '暂时无法读取摄像头' : '未发现摄像头通道' }}</h3>
          <p>
            {{
              loadError
                ? loadError
                : '请确认设备服务已启动，并检查三路摄像头是否已接入。'
            }}
          </p>
          <button class="cam-ctl cam-ctl--primary" type="button" :disabled="loading" @click="loadCameras()">
            <AppIcon name="refresh" :size="14" :class="{ spin: loading }" />
            重新读取
          </button>
        </article>
      </div>
    </section>

    <AppConfirm
      v-if="confirmMeta"
      :open="confirmKind !== null"
      :title="confirmMeta.title"
      :message="confirmMeta.message"
      :detail="confirmMeta.detail"
      :confirm-text="confirmMeta.confirmText"
      :danger="confirmMeta.danger"
      :busy="isAnyBusy"
      @update:open="(value) => !value && closeConfirm()"
      @confirm="runConfirm"
    />

    <Teleport to="body">
      <Transition name="cam-dialog">
        <div v-if="editOpen" class="cam-mask" @click.self="closeEdit">
          <div class="cam-dialog" role="dialog" aria-modal="true" aria-labelledby="cam-dialog-title">
            <header class="cam-dialog__head">
              <span class="cam-dialog__icon"><AppIcon name="camera" :size="21" /></span>
              <div class="cam-dialog__heading">
                <h3 id="cam-dialog-title">编辑摄像头</h3>
                <p>CAM-{{ String(editForm.id).padStart(2, '0') }} · {{ channelOf(editForm.id).scene }}</p>
              </div>
              <button class="cam-dialog__close" type="button" aria-label="关闭" @click="closeEdit">
                <AppIcon name="close" :size="16" />
              </button>
            </header>

            <div class="cam-dialog__body">
              <label class="field">
                <span class="field__label">摄像头名称</span>
                <input v-model="editForm.name" class="input" maxlength="32" placeholder="例如：舱内摄像头" />
                <span class="field__hint">用于通道卡片与状态列表中的显示名称</span>
              </label>

              <label class="field">
                <span class="field__label">RTSP 地址</span>
                <input
                  v-model="editForm.rtsp"
                  class="input mono"
                  spellcheck="false"
                  placeholder="rtsp://admin:password@192.168.10.64:554/..."
                />
                <span class="field__hint">修改地址后，正在推流的画面会自动停止，需重新启动</span>
              </label>

              <div class="cam-dialog__switch">
                <div>
                  <strong>禁用推流</strong>
                  <small>禁用后该通道不会对外提供视频流</small>
                </div>
                <label class="switch">
                  <input v-model="editForm.disabled" type="checkbox" />
                  <span class="switch__track" />
                </label>
              </div>

              <p v-if="editError" class="cam-dialog__error">
                <AppIcon name="alert" :size="14" />
                {{ editError }}
              </p>
            </div>

            <footer class="cam-dialog__foot">
              <button class="btn" type="button" :disabled="editSaving" @click="closeEdit">取消</button>
              <button class="btn btn--primary" type="button" :disabled="editSaving" @click="saveEdit">
                <AppIcon :name="editSaving ? 'refresh' : 'check'" :size="14" :class="{ spin: editSaving }" />
                {{ editSaving ? '保存中…' : '保存配置' }}
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>

    <BackToTopButton />
  </div>
</template>

<style scoped>
.cam-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  --cam-blue: #3c6df0;
  --cam-violet: #7658ee;
  --cam-ink: #1d2b43;
}

/* ===== 顶部总览与控制 ===== */
.cam-command {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: wrap;
}

.cam-command__stats {
  flex: 1 1 620px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.cam-kpi {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #e3ecfa;
  background: linear-gradient(140deg, #ffffff 0%, #f7faff 100%);
  box-shadow: 0 10px 30px -26px rgba(42, 84, 165, 0.55);
  overflow: hidden;
}

.cam-kpi::after {
  content: '';
  position: absolute;
  right: -22px;
  top: -26px;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(94, 145, 255, 0.13), transparent 68%);
  pointer-events: none;
}

.cam-kpi__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 13px;
  color: var(--cam-blue);
  background: linear-gradient(145deg, #eef5ff, #dfeaff);
  border: 1px solid #d4e3fb;
}

.cam-kpi--green .cam-kpi__icon {
  color: #26946a;
  background: linear-gradient(145deg, #eefaf5, #d9f2e8);
  border-color: #cceadb;
}

.cam-kpi--amber .cam-kpi__icon {
  color: #b57a1f;
  background: linear-gradient(145deg, #fff9ec, #fce9c8);
  border-color: #f3ddb6;
}

.cam-kpi--violet .cam-kpi__icon {
  color: #7055dc;
  background: linear-gradient(145deg, #f4f1ff, #e7e0ff);
  border-color: #ddd3fb;
}

.cam-kpi__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cam-kpi__body small {
  font-size: 11px;
  color: #8090a8;
  letter-spacing: 0.3px;
}

.cam-kpi__value {
  font-family: var(--mono);
  font-size: 23px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--cam-ink);
  letter-spacing: -0.5px;
}

.cam-kpi__value em {
  margin-left: 4px;
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
  color: #93a0b5;
  letter-spacing: 0;
}

.cam-command__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid #e1ebfa;
  background: linear-gradient(140deg, #ffffff 0%, #f4f8ff 100%);
  box-shadow: 0 10px 30px -26px rgba(42, 84, 165, 0.55);
}

.cam-preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-right: 10px;
  margin-right: 2px;
  border-right: 1px solid #e6edf8;
  cursor: pointer;
  user-select: none;
}

.cam-preview-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.cam-preview-toggle strong,
.cam-preview-toggle small {
  display: block;
}

.cam-preview-toggle strong {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: #465b7d;
}

.cam-preview-toggle small {
  font-size: 10px;
  line-height: 1.35;
  color: #94a2b7;
  white-space: nowrap;
}

.cam-preview-toggle .switch__track {
  width: 34px;
  height: 19px;
  flex-basis: 34px;
  background: #e6ebf4;
  border-color: #d7dfec;
}

.cam-preview-toggle .switch__track::after {
  width: 13px;
  height: 13px;
  background: #9aa9be;
}

.cam-preview-toggle input:checked + .switch__track {
  background: var(--cam-blue);
  border-color: var(--cam-blue);
}

.cam-preview-toggle input:checked + .switch__track::after {
  transform: translateX(15px);
  background: #fff;
}

.cam-ctl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #dbe5f5;
  border-radius: 10px;
  background: #fff;
  color: #4d6488;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease,
    box-shadow 0.16s ease;
}

.cam-ctl:hover:not(:disabled) {
  border-color: #b9d2f7;
  color: #2f5fd0;
  background: #f7faff;
}

.cam-ctl:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cam-ctl--primary {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, #4b7cf5 0%, #7259ee 100%);
  box-shadow: 0 8px 18px -12px rgba(69, 107, 229, 0.75);
}

.cam-ctl--primary:hover:not(:disabled) {
  color: #fff;
  background: linear-gradient(135deg, #4272ea 0%, #684fe2 100%);
  box-shadow: 0 10px 22px -12px rgba(69, 107, 229, 0.8);
}

.cam-ctl--warn {
  color: #b15d36;
  border-color: #f2ddcf;
  background: #fffaf6;
}

.cam-ctl--warn:hover:not(:disabled) {
  color: #a34d27;
  border-color: #ecc5ae;
  background: #fff7f1;
}

.cam-ctl--sm {
  height: 32px;
  padding: 0 11px;
  font-size: 11px;
  border-radius: 9px;
}

/* ===== 列表头 ===== */
.cam-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cam-list__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px;
}

.cam-list__head h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.2px;
  color: var(--cam-ink);
}

.cam-list__head h2::before {
  content: '';
  width: 3px;
  height: 15px;
  border-radius: 2px;
  background: linear-gradient(180deg, #5d8af8, #7658ee);
}

.cam-list__head p {
  margin-top: 3px;
  font-size: 11px;
  color: #8b98ac;
}

.cam-list__sync {
  color: #7185a5;
  font-family: var(--mono);
}

.cam-list__batch {
  display: flex;
  gap: 8px;
}

.cam-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border-radius: 11px;
  border: 1px solid #f4d9d9;
  background: #fff8f8;
  color: #a64a53;
  font-size: 12px;
}

.cam-alert span {
  flex: 1;
  min-width: 0;
}

.cam-alert button {
  border: none;
  background: transparent;
  color: #b4404e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* ===== 摄像头卡片 ===== */
.cam-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.cam-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 18px;
  border: 1px solid #e2eaf6;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 16px 38px -34px rgba(31, 62, 120, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.cam-card:hover {
  transform: translateY(-2px);
  border-color: #c9dcf8;
  box-shadow: 0 22px 46px -32px rgba(31, 62, 120, 0.55);
}

.cam-card--live {
  border-color: #d5e5fb;
}

.cam-card--disabled {
  background: #fbfcfe;
}

.cam-media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background:
    radial-gradient(120% 130% at 18% 0%, #203c63 0%, #101d33 48%, #080f1c 100%);
}

.cam-media::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5, 12, 24, 0.38) 0%, transparent 26%),
    linear-gradient(0deg, rgba(4, 10, 20, 0.72) 0%, transparent 38%);
}

.cam-media::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(122, 168, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(122, 168, 255, 0.06) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(circle at 50% 46%, #000 0%, transparent 72%);
}

.cam-card--disabled .cam-media {
  filter: saturate(0.35) brightness(0.92);
}

.cam-media__player {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease;
}

.cam-media__player.is-playing {
  opacity: 1;
  visibility: visible;
}

.cam-media:fullscreen {
  aspect-ratio: auto;
  width: 100vw;
  height: 100vh;
  background: #050b15;
}

.cam-media:fullscreen .cam-media__player {
  object-fit: contain;
}

.cam-media__poster {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 34px 20px 38px;
  text-align: center;
  color: #e3edff;
  transition: opacity 0.3s ease;
}

.cam-media__poster.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.cam-media__orb {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 2px;
  border-radius: 18px;
  color: #95bdfb;
  background: rgba(104, 158, 255, 0.11);
  border: 1px solid rgba(135, 179, 255, 0.26);
  box-shadow: inset 0 0 26px rgba(78, 139, 255, 0.18);
}

.cam-media__orb.is-busy {
  color: #bcd5ff;
}

.cam-media__poster strong {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.cam-media__poster small {
  max-width: 240px;
  font-size: 10px;
  line-height: 1.55;
  color: rgba(198, 216, 244, 0.62);
}

.cam-media__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  margin-top: 4px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 187, 255, 0.35);
  background: rgba(86, 136, 235, 0.2);
  color: #e5efff;
  font-size: 11px;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.cam-media__btn:hover:not(:disabled) {
  background: rgba(96, 148, 250, 0.34);
  border-color: rgba(166, 201, 255, 0.55);
}

.cam-media__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cam-media__top,
.cam-media__foot {
  position: absolute;
  left: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}

.cam-media__top {
  top: 11px;
}

.cam-media__top-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}

.cam-media__icon-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 17, 32, 0.52);
  backdrop-filter: blur(8px);
  color: rgba(218, 232, 252, 0.8);
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}

.cam-media__icon-btn:hover {
  color: #fff;
  background: rgba(48, 88, 158, 0.68);
}

.cam-media__foot {
  bottom: 10px;
  align-items: flex-end;
}

.cam-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 23px;
  padding: 0 9px;
  border-radius: 99px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 17, 32, 0.58);
  backdrop-filter: blur(8px);
  color: #e8f1ff;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.cam-live i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ee29a;
  box-shadow: 0 0 0 3px rgba(94, 226, 154, 0.15);
}

.cam-live--idle i {
  background: #f2bd64;
  box-shadow: 0 0 0 3px rgba(242, 189, 100, 0.14);
}

.cam-live--disabled i {
  background: #93a2b8;
  box-shadow: none;
}

.cam-live--error i {
  background: #ff7d88;
  box-shadow: 0 0 0 3px rgba(255, 125, 136, 0.14);
}

.cam-id {
  padding: 4px 8px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: rgba(8, 17, 32, 0.52);
  backdrop-filter: blur(8px);
  color: rgba(218, 232, 252, 0.78);
  font-size: 9px;
  letter-spacing: 0.8px;
}

.cam-media__name {
  display: flex;
  flex-direction: column;
  min-width: 0;
  pointer-events: auto;
  color: #fff;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.45);
}

.cam-media__name strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cam-media__name span {
  font-size: 9px;
  letter-spacing: 0.5px;
  color: rgba(215, 229, 249, 0.62);
}

.cam-media__name:hover span {
  font-size: 12px;
  color: #fff;
}

.cam-media__time {
  flex: 0 0 auto;
  font-size: 9px;
  letter-spacing: 0.4px;
  color: rgba(215, 229, 249, 0.66);
}

.cam-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 11px;
  padding: 13px 15px 15px;
}

.cam-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.cam-card__title {
  min-width: 0;
}

.cam-card__title h3 {
  overflow: hidden;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--cam-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cam-card__title p {
  margin-top: 1px;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.45px;
  color: #94a1b5;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: font-size 0.16s ease, color 0.16s ease;
}

.cam-card__head:hover .cam-card__title p {
  font-size: 12px;
  color: #6f7f96;
}

.cam-edit {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 9px;
  border: 1px solid #e5edf9;
  background: #f8fbff;
  color: #6d84a8;
  cursor: pointer;
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.cam-edit:hover:not(:disabled) {
  color: var(--cam-blue);
  border-color: #c8dcfa;
  background: #eef5ff;
}

.cam-edit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cam-url {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 9px;
  border-radius: 9px;
  border: 1px solid #e9eef7;
  background: #f8fafd;
}

.cam-url__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.5px;
  color: #7d8da5;
}

.cam-url code {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #546a8c;
  font-family: var(--mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cam-url button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8b9bb3;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease;
}

.cam-url button:hover {
  color: var(--cam-blue);
  background: #eaf1fc;
}

.cam-card__foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed #e8eef7;
}

.cam-card__state-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cam-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #7c8ca4;
  white-space: nowrap;
}

.cam-state i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a5b1c3;
}

.cam-state--live {
  color: #2b8b62;
}

.cam-state--live i {
  background: #34b37c;
  box-shadow: 0 0 0 3px rgba(52, 179, 124, 0.12);
}
.cam-live--live i,
.cam-state--live i {
  position: relative;
  display: inline-block;
}

.cam-live--live i::after,
.cam-state--live i::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: inherit;
  animation: cam-live-ripple 1.8s ease-out infinite;
  pointer-events: none;
}

@keyframes cam-live-ripple {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }

  100% {
    transform: scale(3.4);
    opacity: 0;
  }
}

.cam-state--idle i {
  background: #e0a13e;
}

.cam-state--error {
  color: #bf4c58;
}

.cam-state--error i {
  background: #d55b67;
}

.cam-toggle {
  gap: 7px;
  font-size: 12px;
  color: #8392a8;
}

.cam-toggle .switch__track {
  width: 33px;
  height: 18px;
  flex-basis: 33px;
}

.cam-toggle .switch__track::after {
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
}

.cam-toggle input:checked + .switch__track::after {
  transform: translateX(15px);
}

.cam-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: linear-gradient(135deg, #4b7cf5 0%, #7259ee 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 550;
  cursor: pointer;
  box-shadow: 0 8px 18px -14px rgba(69, 107, 229, 0.85);
  transition: filter 0.16s ease, opacity 0.16s ease;
}

.cam-card__action:hover:not(:disabled) {
  filter: brightness(1.05);
}

.cam-card__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.cam-card__action--stop {
  color: #b64b56;
  border-color: #f3d8dc;
  background: #fff7f8;
  box-shadow: none;
}

.cam-card__action--stop:hover:not(:disabled) {
  filter: none;
  background: #fff0f2;
}

/* ===== 空状态 / 骨架 ===== */
.cam-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 320px;
  padding: 40px 24px;
  border-radius: 18px;
  border: 1px dashed #cfdcf0;
  background: linear-gradient(160deg, #ffffff 0%, #f5f9ff 100%);
  text-align: center;
}

.cam-empty__orb {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  margin-bottom: 2px;
  border-radius: 20px;
  color: #6f94d6;
  background: linear-gradient(145deg, #eef5ff, #dfeaff);
  border: 1px solid #d5e3f9;
}

.cam-empty h3 {
  font-size: 15px;
  font-weight: 650;
  color: var(--cam-ink);
}

.cam-empty p {
  max-width: 420px;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 1.65;
  color: #8190a6;
}

.cam-card--skeleton {
  pointer-events: none;
}

.cam-skeleton__media {
  aspect-ratio: 16 / 9;
  background: linear-gradient(100deg, #eef2f8 20%, #f7f9fc 40%, #eef2f8 60%);
  background-size: 220% 100%;
  animation: cam-shimmer 1.5s ease-in-out infinite;
}

.cam-skeleton__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.cam-skeleton__line {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(100deg, #eef2f8 20%, #f7f9fc 40%, #eef2f8 60%);
  background-size: 220% 100%;
  animation: cam-shimmer 1.5s ease-in-out infinite;
}

.cam-skeleton__line--lg {
  width: 46%;
  height: 14px;
}

.cam-skeleton__line--sm {
  width: 64%;
}

@keyframes cam-shimmer {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -120% 0;
  }
}

/* ===== 编辑弹窗 ===== */
.cam-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(22, 36, 61, 0.42);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.cam-dialog {
  width: min(520px, 100%);
  max-height: min(90vh, 720px);
  overflow: auto;
  border-radius: 20px;
  border: 1px solid rgba(219, 232, 250, 0.9);
  background: #fff;
  box-shadow: 0 30px 80px -30px rgba(24, 48, 95, 0.5);
}

.cam-dialog__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #eef2f8;
}

.cam-dialog__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(140deg, #5c8bf9, #7a5cf0);
  box-shadow: 0 10px 20px -14px rgba(78, 112, 230, 0.9);
}

.cam-dialog__heading {
  flex: 1;
  min-width: 0;
}

.cam-dialog__heading h3 {
  font-size: 16px;
  font-weight: 650;
  color: var(--cam-ink);
}

.cam-dialog__heading p {
  margin-top: 2px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.4px;
  color: #93a1b5;
}

.cam-dialog__close {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e8eef8;
  border-radius: 9px;
  background: #f9fbfe;
  color: #8190a6;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease;
}

.cam-dialog__close:hover {
  color: #4d6488;
  background: #f1f6fd;
}

.cam-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 17px;
  padding: 20px 22px;
}

.cam-dialog__switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 14px;
  border-radius: 12px;
  border: 1px solid #e8eef8;
  background: #f8fbff;
}

.cam-dialog__switch strong,
.cam-dialog__switch small {
  display: block;
}

.cam-dialog__switch strong {
  font-size: 12px;
  font-weight: 600;
  color: #405573;
}

.cam-dialog__switch small {
  margin-top: 2px;
  font-size: 10px;
  color: #8e9cb1;
}

.cam-dialog__error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border-radius: 9px;
  border: 1px solid #f3d6d9;
  background: #fff7f8;
  color: #b4404e;
  font-size: 11px;
  line-height: 1.5;
}

.cam-dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding: 15px 22px 20px;
  border-top: 1px solid #eef2f8;
  background: #fcfdff;
}

.cam-dialog-enter-active,
.cam-dialog-leave-active {
  transition: opacity 0.2s ease;
}

.cam-dialog-enter-active .cam-dialog,
.cam-dialog-leave-active .cam-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.cam-dialog-enter-from,
.cam-dialog-leave-to {
  opacity: 0;
}

.cam-dialog-enter-from .cam-dialog,
.cam-dialog-leave-to .cam-dialog {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 1440px) {
  .cam-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .cam-command__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cam-command__actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 900px) {
  .cam-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .cam-command__actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .cam-preview-toggle {
    flex: 1 0 100%;
    padding: 0 0 8px;
    margin: 0 0 2px;
    border-right: none;
    border-bottom: 1px solid #e6edf8;
  }
}

@media (max-width: 640px) {
  .cam-command__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .cam-kpi {
    padding: 12px;
    gap: 9px;
  }

  .cam-kpi__icon {
    width: 36px;
    height: 36px;
    flex-basis: 36px;
    border-radius: 11px;
  }

  .cam-kpi__value {
    font-size: 20px;
  }

  .cam-list__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .cam-list__batch {
    width: 100%;
  }

  .cam-list__batch .cam-ctl {
    flex: 1;
  }

  .cam-command__actions .cam-ctl {
    flex: 1;
  }

  .cam-mask {
    padding: 12px;
  }
}
</style>
