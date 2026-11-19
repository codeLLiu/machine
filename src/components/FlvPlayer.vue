<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import mpegts from 'mpegts.js'

const props = defineProps<{
  src?: string
}>()

const emit = defineEmits<{
  status: [status: 'connecting' | 'playing' | 'error']
}>()

const video = ref<HTMLVideoElement>()
let player: mpegts.Player | null = null

async function destroyPlayer(): Promise<void> {
  if (!player) return
  player.pause()
  player.unload()
  player.detachMediaElement()
  player.destroy()
  player = null
}

async function createPlayer(url: string): Promise<void> {
  await nextTick()
  await destroyPlayer()
  if (!video.value || !url) return
  const isWsUrl = url.toLowerCase().startsWith('ws://') || url.toLowerCase().startsWith('wss://')
  const type = isWsUrl ? 'websocket-flv' : 'mpegts'
  player = mpegts.createPlayer(
    { type, isLive: true, url },
    { enableStashBuffer: false, liveBufferLatencyChasing: true },
  )
  player.attachMediaElement(video.value)
  player.on(mpegts.Events.ERROR, () => {
    emit('status', 'error')
  })
  player.on(mpegts.Events.MEDIA_INFO, () => {
    emit('status', 'playing')
    void video.value?.play().catch(() => undefined)
  })
  player.on(mpegts.Events.LOADING_COMPLETE, () => {
    emit('status', 'error')
  })
  emit('status', 'connecting')
  player.load()
  void video.value.play().catch(() => undefined)
}

watch(() => props.src, (url) => {
  if (url) void createPlayer(url)
  else void destroyPlayer()
}, { immediate: true })

onBeforeUnmount(() => {
  void destroyPlayer()
})
</script>

<template>
  <video ref="video" class="flv-player" playsinline autoplay muted controls />
</template>

<style scoped>
.flv-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
</style>
