<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { startStream, stopStream } from '@/api/endpoints'
import { useToast } from '@/composables/toast'
import { useNestStore } from '@/stores/nest'
import type { CameraInfo } from '@/api/types'

const nestStore = useNestStore()
const toast = useToast()

const cameras = ref<CameraInfo[]>([])
const streamLinks = ref<Record<number, string[]>>({})
const busy = ref<number[]>([])
const now = ref(new Date())
let ticker = 0

const liveCount = computed(() => cameras.value.filter((camera) => camera.isPushing).length)

watch(
  () => nestStore.cameras,
  (list) => {
    cameras.value = list.map((camera) => ({ ...camera }))
  },
  { immediate: true, deep: true },
)

function isBusy(id: number): boolean {
  return busy.value.includes(id)
}

function setBusy(id: number, value: boolean): void {
  busy.value = value ? [...busy.value, id] : busy.value.filter((item) => item !== id)
}

async function start(ids: number[]): Promise<void> {
  ids.forEach((id) => setBusy(id, true))
  try {
    const results = await startStream(ids)
    results.forEach((result) => {
      const camera = cameras.value.find((item) => item.id === result.id)
      if (camera) camera.isPushing = Boolean(result.result)
      const links = [result.http, result.ws, result.rtmp].filter((link): link is string => Boolean(link))
      streamLinks.value = { ...streamLinks.value, [result.id]: links }
    })
    const ok = results.filter((result) => result.result).length
    if (ok) {
      toast.success(`已启动 ${ok} 路视频`, '可在播放器中查看实时画面')
    } else {
      toast.warning('推流未启动', '请检查摄像头是否被禁用或设备离线')
    }
  } catch (error) {
    toast.error('推流失败', error instanceof Error ? error.message : '请检查网络')
  } finally {
    ids.forEach((id) => setBusy(id, false))
    void nestStore.refreshCameras()
  }
}

async function stop(ids: number[]): Promise<void> {
  ids.forEach((id) => setBusy(id, true))
  try {
    await stopStream(ids)
    ids.forEach((id) => {
      const camera = cameras.value.find((item) => item.id === id)
      if (camera) camera.isPushing = false
      const next = { ...streamLinks.value }
      delete next[id]
      streamLinks.value = next
    })
    toast.info('已停止推流', `共 ${ids.length} 路`)
  } catch (error) {
    toast.error('停止失败', error instanceof Error ? error.message : '请检查网络')
  } finally {
    ids.forEach((id) => setBusy(id, false))
    void nestStore.refreshCameras()
  }
}

function startAll(): void {
  void start(cameras.value.filter((camera) => !camera.disabled).map((camera) => camera.id))
}

function stopAll(): void {
  const ids = cameras.value.filter((camera) => camera.isPushing).map((camera) => camera.id)
  if (ids.length) void stop(ids)
}

async function copyAddress(camera: CameraInfo): Promise<void> {
  try {
    await navigator.clipboard.writeText(camera.rtsp)
    toast.success('已复制 RTSP 地址', camera.rtsp)
  } catch {
    toast.error('复制失败', '当前浏览器不允许访问剪贴板')
  }
}

const clock = computed(() =>
  now.value.toLocaleTimeString('zh-CN', { hour12: false }),
)

onMounted(() => {
  ticker = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
  void nestStore.refreshCameras()
})

onBeforeUnmount(() => {
  if (ticker) window.clearInterval(ticker)
})
</script>

<template>
  <div class="page">
    <section class="toolbar">
      <div class="toolbar__info">
        <span class="tag" :class="liveCount ? 'tag--info' : 'tag--muted'">
          <span class="dot" :class="liveCount ? 'dot--live' : 'dot--idle'" />
          {{ liveCount }} 路推流中
        </span>
        <span class="toolbar__hint">共 {{ cameras.length }} 路摄像头 · 支持 RTSP / WS-FLV</span>
      </div>
      <div class="toolbar__actions">
        <button class="btn btn--sm btn--ghost" type="button" @click="nestStore.refreshCameras()">
          <AppIcon name="refresh" :size="13" />
          刷新
        </button>
        <button class="btn btn--sm" type="button" @click="stopAll">
          <AppIcon name="pause" :size="13" />
          全部停止
        </button>
        <button class="btn btn--sm btn--primary" type="button" @click="startAll">
          <AppIcon name="play" :size="13" />
          全部推流
        </button>
      </div>
    </section>

    <section class="grid">
      <article v-for="camera in cameras" :key="camera.id" class="panel camera">
        <header class="camera__head">
          <div class="camera__title">
            <span class="camera__id mono">CAM-{{ String(camera.id).padStart(2, '0') }}</span>
            <strong>{{ camera.name }}</strong>
          </div>
          <span
            class="tag"
            :class="camera.disabled ? 'tag--muted' : camera.isPushing ? 'tag--success' : 'tag--muted'"
          >
            {{ camera.disabled ? '已禁用' : camera.isPushing ? '推流中' : '待机' }}
          </span>
        </header>

        <div class="screen" :class="{ 'is-live': camera.isPushing && !camera.disabled }">
          <div class="screen__bg" />
          <div class="screen__grid" />
          <div class="screen__scan" />

          <div class="screen__cross">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="50" y1="4" x2="50" y2="14" />
              <line x1="50" y1="86" x2="50" y2="96" />
              <line x1="4" y1="50" x2="14" y2="50" />
              <line x1="86" y1="50" x2="96" y2="50" />
              <circle cx="50" cy="50" r="16" />
            </svg>
          </div>

          <div class="screen__hud screen__hud--tl">
            <span class="rec" />
            LIVE
          </div>
          <div class="screen__hud screen__hud--tr mono">{{ clock }}</div>
          <div v-if="camera.isPushing" class="screen__stream">
            <strong>推流已启动</strong>
            <a
              v-for="url in streamLinks[camera.id] ?? []"
              :key="url"
              :href="url"
              target="_blank"
              rel="noreferrer"
              class="mono"
            >
              {{ url }}
            </a>
            <small v-if="!streamLinks[camera.id]?.length">接口未返回播放地址；当前仅显示推流状态</small>
          </div>

          <div class="screen__idle">
            <AppIcon :name="camera.disabled ? 'lock' : 'camera'" :size="26" />
            <p>{{ camera.disabled ? '该通道已禁用' : '画面未推送' }}</p>
            <button
              v-if="!camera.disabled"
              class="btn btn--sm"
              type="button"
              :disabled="isBusy(camera.id)"
              @click="start([camera.id])"
            >
              <AppIcon :name="isBusy(camera.id) ? 'refresh' : 'play'" :size="12" :class="{ spin: isBusy(camera.id) }" />
              启动推流
            </button>
          </div>
        </div>

        <footer class="camera__foot">
          <p class="camera__rtsp mono" :title="camera.rtsp">{{ camera.rtsp }}</p>
          <div class="camera__actions">
            <button class="icon-btn" type="button" title="复制 RTSP" @click="copyAddress(camera)">
              <AppIcon name="copy" :size="14" />
            </button>
            <button
              v-if="camera.isPushing"
              class="btn btn--sm"
              type="button"
              :disabled="isBusy(camera.id)"
              @click="stop([camera.id])"
            >
              停止推流
            </button>
          </div>
        </footer>
      </article>

      <article v-if="!cameras.length" class="panel camera camera--empty">
        <AppIcon name="camera" :size="26" />
        <p>正在读取摄像头配置…</p>
      </article>
    </section>

    <article class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">通道清单</h2>
          <p class="panel__sub">完整地址可直接复制到播放器或 NVR</p>
        </div>
        <span class="tag tag--muted">{{ cameras.length }} 个通道</span>
      </header>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>通道</th>
              <th>名称</th>
              <th>推流状态</th>
              <th>启用状态</th>
              <th>RTSP 地址</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="camera in cameras" :key="camera.id">
              <td class="mono dim">CAM-{{ String(camera.id).padStart(2, '0') }}</td>
              <td>{{ camera.name }}</td>
              <td>
                <span class="tag" :class="camera.isPushing ? 'tag--success' : 'tag--muted'">
                  {{ camera.isPushing ? '推流中' : '待机' }}
                </span>
              </td>
              <td>
                <span class="tag" :class="camera.disabled ? 'tag--muted' : 'tag--info'">
                  {{ camera.disabled ? '已禁用' : '已启用' }}
                </span>
              </td>
              <td class="mono dim rtsp-cell" :title="camera.rtsp">{{ camera.rtsp }}</td>
              <td>
                <button class="btn btn--sm btn--ghost" type="button" @click="copyAddress(camera)">
                  <AppIcon name="copy" :size="12" />
                  复制
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.toolbar__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar__hint {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.toolbar__actions {
  display: flex;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.camera {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.camera__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.camera__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.camera__id {
  font-size: var(--fs-xs);
  color: var(--text-4);
  letter-spacing: 0.8px;
}

.camera__title strong {
  font-size: var(--fs-sm);
  font-weight: 600;
}

/* 画面 */
.screen {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--surface-3);
  overflow: hidden;
}

.is-live .screen {
  background: var(--feed-bg);
}

.screen__bg {
  position: absolute;
  inset: 0;
  background: none;
}

.is-live .screen__bg {
  background: linear-gradient(165deg, #151a22, #0c0f14 70%);
}

.screen__grid {
  position: absolute;
  inset: 0;
  background: none;
}

.screen__scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 42%;
  top: -42%;
  background: linear-gradient(180deg, transparent, rgba(47, 107, 255, 0.09), transparent);
  opacity: 0;
}

.is-live .screen__scan {
  opacity: 0;
}

@keyframes scan {
  0% {
    top: -42%;
  }
  100% {
    top: 100%;
  }
}

.screen__cross {
  position: absolute;
  inset: 14%;
  opacity: 0.28;
}

.screen__cross svg {
  width: 100%;
  height: 100%;
  stroke: var(--border-strong);
  stroke-width: 0.5;
  fill: none;
}

.is-live .screen__cross svg {
  stroke: rgba(210, 222, 240, 0.5);
}

.screen__hud {
  position: absolute;
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: rgba(214, 224, 240, 0.75);
  padding: 3px 6px;
  border-radius: 4px;
  background: rgba(8, 11, 16, 0.62);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.is-live .screen__hud {
  opacity: 1;
}

.screen__hud--tl {
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #f0a3ac;
  border: 1px solid rgba(224, 128, 140, 0.4);
}

.rec {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e0838e;
}

@keyframes rec-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.screen__hud--tr {
  top: 8px;
  right: 8px;
}

.screen__hud--bl {
  bottom: 8px;
  left: 8px;
}

.screen__hud--br {
  bottom: 8px;
  right: 8px;
}

.screen__stream {
  position: absolute;
  inset: 38px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  color: #e5edfa;
  text-align: center;
}

.screen__stream strong {
  font-size: var(--fs-sm);
}

.screen__stream a {
  max-width: 100%;
  overflow: hidden;
  color: #91bcff;
  font-size: var(--fs-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.screen__stream small {
  color: rgba(229, 237, 250, 0.7);
  font-size: var(--fs-xs);
  line-height: 1.5;
}

.screen__idle {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-4);
  background: transparent;
  transition: opacity 0.25s ease;
}

.screen__idle p {
  font-size: var(--fs-xs);
  color: var(--text-3);
}

.is-live .screen__idle {
  opacity: 0;
  pointer-events: none;
}

.camera__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.camera__rtsp {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-xs);
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
}

.table .dim {
  color: var(--text-3);
}

.rtsp-cell {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-xs);
}

.camera__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.camera--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  color: var(--text-4);
  font-size: var(--fs-xs);
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
