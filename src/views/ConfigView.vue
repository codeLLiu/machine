<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import FlvPlayer from '@/components/FlvPlayer.vue'
import {
  fetchCameras,
  fetchMqtt,
  fetchPlc,
  readRegisters,
  saveCameras,
  saveMqtt,
  savePlc,
  stopStream,
  startStream,
  uploadCert,
  writeRegisters,
} from '@/api/endpoints'
import { useToast } from '@/composables/toast'
import type { CameraInfo, MqttConfig, OptionItem, PlcConfig } from '@/api/types'
import { useNestStore } from '@/stores/nest'

type TabKey = 'plc' | 'mqtt' | 'camera'

const toast = useToast()
const route = useRoute()
const nestStore = useNestStore()

const hints: Record<TabKey, string> = {
  plc: '与下位机 PLC 的通讯参数',
  mqtt: '平台接入与证书配置',
  camera: '三路视频源地址',
}

const active = computed<TabKey>(() => {
  const section = route.meta.section
  if (section === 'mqtt' || section === 'camera' || section === 'plc') return section
  return 'plc'
})
const loading = ref(false)
const saving = ref(false)

/* ---------- PLC ---------- */
const plc = reactive<PlcConfig>({ ip: '', port: 502 })

/* ---------- MQTT ---------- */
const mqtt = ref<MqttConfig | null>(null)
const uploading = ref('')

/* ---------- 摄像头 ---------- */
const cameras = ref<CameraInfo[]>([])
const previewEnabled = ref(false)
const previewLoading = ref(false)
const singleLoading = ref<Record<number, 'start' | 'stop' | null>>({})
const previewError = ref('')
const previewStreams = ref<Record<number, string>>({})

/* ---------- 连通性自检 ---------- */
const testing = ref(false)
const writingRegister = ref(false)
const registerId = ref(1000)
const registerCount = ref(1)
const registerValues = ref('0')
const testState = ref<'idle' | 'ok' | 'fail'>('idle')
const testMessage = ref('')
const testAt = ref(0)

const activeHint = computed(() => hints[active.value])

const certSlots = computed(() => {
  const cert = mqtt.value?.cert
  return [
    { key: 'ca' as const, label: '服务器证书', value: cert?.caFile ?? '' },
    { key: 'cert' as const, label: '客户凭据', value: cert?.certFile ?? '' },
    { key: 'key' as const, label: '客户密钥', value: cert?.keyFile ?? '' },
  ]
})

function toggleSsl(event: Event): void {
  if (!mqtt.value) return
  mqtt.value.sslEnable = (event.target as HTMLInputElement).checked ? 1 : 0
}

async function toggleDisabled(camera: CameraInfo, event: Event): Promise<void> {
  const disabled = (event.target as HTMLInputElement).checked ? 1 : 0
  const wasDisabled = camera.disabled === 1
  camera.disabled = disabled

  if (!previewEnabled.value || wasDisabled === (disabled === 1) || !Number.isFinite(camera.id)) return

  singleLoading.value[camera.id] = disabled === 1 ? 'stop' : 'start'
  try {
    const results = disabled === 1 ? await stopStream([camera.id]) : await startStream([camera.id])
    const result = results.find((item) => item.id === camera.id)
    const success = result?.result === true || result?.result === 1

    if (disabled === 1) {
      delete previewStreams.value[camera.id]
    }
    if (disabled !== 1 && success && (result?.ws || result?.http)) {
      previewStreams.value[camera.id] = result.ws || result.http!
    }
    if (!success && disabled !== 1) {
      toast.error('视频流启动失败', '请检查摄像头连接和配置')
    }
    if (!success && disabled === 1) {
      toast.warning('视频流已停止播放', '后端停流可能未成功，请稍后检查推流状态')
    }
  } catch (error) {
    delete previewStreams.value[camera.id]
    toast.apiError(disabled === 1 ? '视频流已停止播放' : '视频流启动失败', error, '请检查设备连接')
  } finally {
    singleLoading.value[camera.id] = null
  }
}

async function togglePreview(event: Event): Promise<void> {
  const enabled = (event.target as HTMLInputElement).checked
  previewEnabled.value = enabled
  previewError.value = ''

  if (!enabled) {
    const stopIds = cameras.value
      .filter((camera) => camera.disabled !== 1 && Number.isFinite(camera.id))
      .map((camera) => camera.id)
    previewStreams.value = {}
    if (!stopIds.length) return

    try {
      const results = await stopStream(stopIds)
      const failed = results.filter((result) => !(result.result === true || result.result === 1))
      if (failed.length) {
        toast.warning('视频流已关闭播放', `${failed.length} 路后端停流可能未成功`)
      }
    } catch (error) {
      toast.apiError('视频流已关闭播放', error, '后端停流请求失败')
    }
    return
  }

  previewStreams.value = {}
  const ids = cameras.value
    .filter((camera) => camera.disabled !== 1 && Number.isFinite(camera.id))
    .map((camera) => camera.id)
  if (!ids.length) {
    previewError.value = '已开启播放 · 暂无启用通道'
    return
  }

  previewLoading.value = true
  try {
    const results = await startStream(ids)
    const streams: Record<number, string> = {}
    for (const result of results) {
      const url = result.ws || result.http
      if (url && (result.result === true || result.result === 1)) streams[result.id] = url
    }
    previewStreams.value = streams
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : '视频流启动失败'
    previewEnabled.value = false
  } finally {
    previewLoading.value = false
  }
}

function selectOption(list: OptionItem[] | undefined, num: number): void {
  list?.forEach((item) => {
    item.isSelected = item.num === num ? 1 : 0
  })
}

async function loadAll(): Promise<void> {
  loading.value = true
  try {
    if (active.value === 'plc') {
      const result = await fetchPlc()
      plc.ip = result?.ip ?? ''
      plc.port = Number(result?.port ?? 502)
    } else if (active.value === 'mqtt') {
      mqtt.value = await fetchMqtt()
    } else {
      cameras.value = await fetchCameras()
    }
  } catch (error) {
    toast.apiError('读取配置失败', error, '请检查设备连接')
  } finally {
    loading.value = false
  }
}

async function handleTestPlc(): Promise<void> {
  if (!Number.isInteger(registerId.value) || registerId.value < 0 || !Number.isInteger(registerCount.value) || registerCount.value < 1) {
    toast.warning('寄存器起始地址和读取数量必须是有效的非负整数')
    return
  }
  testing.value = true
  try {
    const result = await readRegisters({ registerId: registerId.value, count: registerCount.value, functionCode: 3 })
    testState.value = 'ok'
    testMessage.value = `读取成功 · ${result.value.join(', ') || '接口返回空值'}`
    toast.success('PLC 读取成功', `已读取 ${result.value.length} 个寄存器`)
  } catch (error) {
    testState.value = 'fail'
    testMessage.value = error instanceof Error ? error.message : '连接失败'
    toast.apiError('寄存器读取失败', error, testMessage.value)
  } finally {
    testing.value = false
    testAt.value = Date.now()
  }
}

async function handleWriteRegisters(): Promise<void> {
  const values = registerValues.value.split(/[,，\s]+/).filter(Boolean).map(Number)
  if (!Number.isInteger(registerId.value) || registerId.value < 0 || !values.length || values.some((value) => !Number.isInteger(value) || value < 0 || value > 65535)) {
    toast.warning('请填写有效地址和 0–65535 的整数写入值，多个值用逗号分隔')
    return
  }
  writingRegister.value = true
  try {
    await writeRegisters({ registerId: registerId.value, values })
    toast.success('寄存器写入成功', `地址 ${registerId.value}，写入 ${values.length} 个值`)
  } catch (error) {
    toast.apiError('寄存器写入失败', error, '请检查设备连接')
  } finally {
    writingRegister.value = false
  }
}

async function handleSavePlc(): Promise<void> {
  if (!plc.ip.trim()) {
    toast.warning('请填写 PLC 地址')
    return
  }
  const port = Number(plc.port)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    toast.warning('端口需为 1–65535 之间的整数')
    return
  }
  saving.value = true
  try {
    await savePlc({ ip: plc.ip.trim(), port })
    toast.success('PLC 参数已保存', `${plc.ip.trim()}:${port}`)
  } catch (error) {
    toast.apiError('保存失败', error, '请稍后重试')
  } finally {
    saving.value = false
  }
}

async function handleSaveMqtt(): Promise<void> {  if (!mqtt.value) return
  if (!mqtt.value.addr.trim()) {
    toast.warning('请填写 MQTT 服务器地址')
    return
  }
  saving.value = true
  try {
    await saveMqtt(mqtt.value)
    toast.success('MQTT 参数已保存', '重连后生效')
  } catch (error) {
    toast.apiError('保存失败', error, '请稍后重试')
  } finally {
    saving.value = false
  }
}

async function handleSaveCameras(): Promise<void> {
  saving.value = true
  try {
    await saveCameras(cameras.value)
    nestStore.setCameras(cameras.value)
    toast.success('摄像头配置已保存', `${cameras.value.length} 路`)
  } catch (error) {
    toast.apiError('保存失败', error, '请稍后重试')
  } finally {
    saving.value = false
  }
}

async function pickCert(kind: 'ca' | 'cert' | 'key', event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !mqtt.value) return
  uploading.value = kind
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
    const certNum = kind === 'ca' ? 0 : kind === 'cert' ? 1 : 2
    await uploadCert(certNum, btoa(binary))
    if (kind === 'ca') mqtt.value.cert.caFile = file.name
    if (kind === 'cert') mqtt.value.cert.certFile = file.name
    if (kind === 'key') mqtt.value.cert.keyFile = file.name
    toast.success('证书已上传', file.name)
  } catch (error) {
    toast.apiError('上传失败', error, '请检查文件格式')
  } finally {
    uploading.value = ''
    input.value = ''
  }
}

watch(active, () => void loadAll(), { immediate: true })

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="page">
    <section class="tabs">
      <p class="hint hint--bar">
        <AppIcon name="target" :size="13" />
        {{ activeHint }}
      </p>
      <div class="tabs__spacer" />
      <button class="btn btn--sm btn--ghost" type="button" :disabled="loading" @click="loadAll">
        <AppIcon name="refresh" :size="13" :class="{ spin: loading }" />
        重新读取
      </button>
    </section>

    <!-- PLC -->
    <section v-if="active === 'plc'" class="plc">
      <article class="panel panel--corner">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">PLC 通讯参数</h2>
            <p class="panel__sub">修改后需重新连接，动作指令将下发到该地址</p>
          </div>
          <span class="tag tag--muted mono">Modbus TCP</span>
        </header>
        <div class="panel__body form">
          <div class="form__grid">
            <label class="field">
              <span class="field__label">PLC 地址</span>
              <input v-model="plc.ip" class="input mono" placeholder="192.168.10.88" />
              <span class="field__hint">下位机 PLC 的 IPv4 地址</span>
            </label>
            <label class="field">
              <span class="field__label">端口</span>
              <input v-model.number="plc.port" class="input mono" type="number" placeholder="502" />
              <span class="field__hint">Modbus TCP 默认 502</span>
            </label>
          </div>

          <div class="form__foot">
            <p class="form__tip">保存后立即生效，连接会短暂中断 1–2 秒</p>
            <button class="btn btn--primary" type="button" :disabled="saving" @click="handleSavePlc">
              <AppIcon :name="saving ? 'refresh' : 'check'" :size="14" :class="{ spin: saving }" />
              保存参数
            </button>
          </div>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">连接自检</h2>
            <p class="panel__sub">POST /api/testRead · 功能码 3 读取保持寄存器</p>
          </div>
          <span
            class="tag"
            :class="
              testState === 'ok' ? 'tag--success' : testState === 'fail' ? 'tag--danger' : 'tag--muted'
            "
          >
            {{ testState === 'ok' ? '正常' : testState === 'fail' ? '失败' : '未测试' }}
          </span>
        </header>

        <div class="panel__body self-test">
          <div class="self-test__state" :class="`self-test__state--${testState}`">
            <AppIcon
              :name="testState === 'ok' ? 'check' : testState === 'fail' ? 'alert' : 'plug'"
              :size="24"
            />
            <strong>
              {{ testState === 'ok' ? '链路正常' : testState === 'fail' ? '链路异常' : '等待测试' }}
            </strong>
            <small>{{ testMessage || '发起一次探测，确认 PLC 可达' }}</small>
          </div>

          <div class="register-form">
            <label class="field">
              <span class="field__label">起始地址</span>
              <input v-model.number="registerId" class="input mono" type="number" min="0" />
            </label>
            <label class="field">
              <span class="field__label">读取数量</span>
              <input v-model.number="registerCount" class="input mono" type="number" min="1" />
            </label>
          </div>

          <p class="self-test__time mono">
            最近读取 {{ testAt ? new Date(testAt).toLocaleTimeString('zh-CN', { hour12: false }) : '—' }}
          </p>

          <button class="btn btn--block" type="button" :disabled="testing" @click="handleTestPlc">
            <AppIcon :name="testing ? 'refresh' : 'plug'" :size="14" :class="{ spin: testing }" />
            {{ testing ? '读取中…' : '读取寄存器' }}
          </button>

          <div class="register-form register-form--write">
            <label class="field">
              <span class="field__label">写入起始地址</span>
              <input v-model.number="registerId" class="input mono" type="number" min="0" />
            </label>
            <label class="field">
              <span class="field__label">写入值（逗号分隔）</span>
              <input v-model="registerValues" class="input mono" placeholder="9090, 1111, 11110" />
            </label>
          </div>
          <button class="btn btn--block" type="button" :disabled="writingRegister" @click="handleWriteRegisters">
            <AppIcon :name="writingRegister ? 'refresh' : 'check'" :size="14" :class="{ spin: writingRegister }" />
            {{ writingRegister ? '写入中…' : '写入寄存器' }}
          </button>
        </div>
      </article>
    </section>

    <!-- MQTT -->
    <article v-if="active === 'mqtt' && mqtt" class="panel panel--corner">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">MQTT 上报配置</h2>
          <p class="panel__sub">设备编号 {{ mqtt.deviceId || '—' }}</p>
        </div>
        <span class="tag" :class="mqtt.sslEnable === 1 ? 'tag--success' : 'tag--muted'">
          {{ mqtt.sslEnable === 1 ? 'SSL 已启用' : 'SSL 未启用' }}
        </span>
      </header>

      <div class="panel__body form">
        <div class="form__section">
          <p class="sect-label">连接</p>
          <div class="form__grid form__grid--3">
            <label class="field">
              <span class="field__label">协议</span>
              <div class="seg">
                <button
                  v-for="item in mqtt.host"
                  :key="item.num"
                  class="seg__item"
                  :class="{ 'is-active': item.isSelected === 1 }"
                  type="button"
                  @click="selectOption(mqtt.host, item.num)"
                >
                  {{ item.text }}
                </button>
              </div>
            </label>
            <label class="field">
              <span class="field__label">服务器地址</span>
              <input v-model="mqtt.addr" class="input mono" placeholder="192.168.1.10" />
            </label>
            <label class="field">
              <span class="field__label">端口</span>
              <input v-model.number="mqtt.port" class="input mono" type="number" placeholder="1883" />
            </label>
          </div>

          <div class="form__grid form__grid--3">
            <label class="field">
              <span class="field__label">Client ID</span>
              <input v-model="mqtt.clientId" class="input mono" />
            </label>
            <label class="field">
              <span class="field__label">Server ID</span>
              <input v-model="mqtt.serverId" class="input mono" />
            </label>
            <label class="field">
              <span class="field__label">心跳（秒）</span>
              <input v-model.number="mqtt.keepalive" class="input mono" type="number" />
            </label>
          </div>

          <div class="form__grid form__grid--2">
            <label class="field">
              <span class="field__label">协议版本</span>
              <div class="seg">
                <button
                  v-for="item in mqtt.ver"
                  :key="item.num"
                  class="seg__item"
                  :class="{ 'is-active': item.isSelected === 1 }"
                  type="button"
                  @click="selectOption(mqtt.ver, item.num)"
                >
                  {{ item.text }}
                </button>
              </div>
            </label>
            <label class="field">
              <span class="field__label">QoS</span>
              <div class="seg">
                <button
                  v-for="item in mqtt.qos"
                  :key="item.num"
                  class="seg__item"
                  :class="{ 'is-active': item.isSelected === 1 }"
                  type="button"
                  @click="selectOption(mqtt.qos, item.num)"
                >
                  {{ item.text }}
                </button>
              </div>
            </label>
          </div>
        </div>

        <div class="form__section">
          <p class="sect-label">认证</p>
          <div class="form__grid form__grid--2">
            <label class="field">
              <span class="field__label">用户名</span>
              <input v-model="mqtt.user" class="input" autocomplete="off" />
            </label>
            <label class="field">
              <span class="field__label">密码</span>
              <input v-model="mqtt.passwd" class="input" type="password" autocomplete="new-password" />
            </label>
          </div>
        </div>

        <div class="form__section">
          <p class="sect-label">安全</p>
          <div class="ssl">
            <label class="switch">
              <input
                type="checkbox"
                :checked="mqtt.sslEnable === 1"
                @change="toggleSsl"
              />
              <span class="switch__track" />
              启用 SSL / TLS
            </label>

            <div class="ssl__certs">
              <div v-for="cert in certSlots" :key="cert.key" class="cert">
                <span class="cert__label">{{ cert.label }}</span>
                <span class="cert__value mono">{{ cert.value || '未上传' }}</span>
                <label class="btn btn--sm btn--ghost cert__pick">
                  <AppIcon
                    :name="uploading === cert.key ? 'refresh' : 'upload'"
                    :size="12"
                    :class="{ spin: uploading === cert.key }"
                  />
                  选择文件
                  <input
                    type="file"
                    class="cert__input"
                    accept=".pem,.crt,.cer,.key"
                    @change="pickCert(cert.key, $event)"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="form__foot">
          <p class="form__tip">保存后 MQTT 客户端将按新参数重连</p>
          <button class="btn btn--primary" type="button" :disabled="saving" @click="handleSaveMqtt">
            <AppIcon :name="saving ? 'refresh' : 'check'" :size="14" :class="{ spin: saving }" />
            保存配置
          </button>
        </div>
      </div>
    </article>

    <!-- 摄像头 -->
    <article v-if="active === 'camera'" class="panel panel--corner">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">摄像头通道</h2>
          <p class="panel__sub">修改 RTSP 地址、预览视频流或禁用通道</p>
        </div>
        <span class="tag tag--muted">{{ cameras.length }} 路</span>
      </header>

      <div class="panel__body">
        <div class="cam__preview-bar">
          <label class="switch">
            <input
              type="checkbox"
              :checked="previewEnabled"
              :disabled="previewLoading"
              @change="togglePreview"
            />
            <span class="switch__track" />
            {{ previewEnabled ? '关闭播放' : '开启播放' }}
          </label>
          <p v-if="previewError" class="cam__preview-error">{{ previewError }}</p>
        </div>

        <div class="cam">
          <div v-for="camera in cameras" :key="camera.id" class="cam__row">
            <div class="cam__head">
              <span class="cam__id mono">CAM-{{ String(camera.id).padStart(2, '0') }}</span>
              <strong>{{ camera.name }}</strong>
              <span class="tag" :class="camera.disabled ? 'tag--muted' : 'tag--success'">
                {{ camera.disabled ? '已禁用' : '启用' }}
              </span>
            </div>

            <div class="cam__body">
              <label class="field cam__field">
                <span class="field__label">RTSP 地址</span>
                <input v-model="camera.rtsp" class="input mono" placeholder="rtsp://..." />
              </label>

              <label class="switch cam__switch">
                <input
                  type="checkbox"
                  :checked="camera.disabled === 1"
                  :disabled="singleLoading[camera.id] === 'start' || singleLoading[camera.id] === 'stop'"
                  @change="toggleDisabled(camera, $event)"
                />
                <span class="switch__track" />
                禁用推流
              </label>
            </div>

            <div v-if="previewEnabled && camera.disabled !== 1" class="cam__preview">
              <FlvPlayer v-if="previewStreams[camera.id]" :src="previewStreams[camera.id]" />
              <div v-else-if="previewLoading || singleLoading[camera.id] === 'start'" class="cam__preview-state">
                <AppIcon name="refresh" :size="18" />
                <span>正在启动视频流…</span>
              </div>
              <div v-else class="cam__preview-state">
                <AppIcon name="camera" :size="18" />
                <span>{{ singleLoading[camera.id] === 'stop' ? '正在停止视频流…' : '视频流启动失败' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form__foot">
          <p class="form__tip">禁用后该通道不会建立推流，但仍可查看历史配置</p>
          <button class="btn btn--primary" type="button" :disabled="saving" @click="handleSaveCameras">
            <AppIcon :name="saving ? 'refresh' : 'check'" :size="14" :class="{ spin: saving }" />
            保存全部
          </button>
        </div>
      </div>
    </article>
  </div>

  <button v-if="active === 'camera'" class="cam__top-btn" type="button" aria-label="回到顶部" @click="scrollToTop">
    <AppIcon name="chevronUp" :size="18" />
  </button>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Tabs */
.tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--text-3);
  font-size: var(--fs-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}

.tab:hover {
  color: var(--text);
  background: var(--surface-2);
}

.tab.is-active {
  color: var(--primary);
  background: var(--primary-weak);
  border-color: color-mix(in srgb, var(--primary) 35%, transparent);
  box-shadow: none;
}

.tabs__spacer {
  flex: 1;
}

.hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0 8px;
  font-size: var(--fs-xs);
  color: var(--text-4);
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form__section + .form__section {
  padding-top: 4px;
}

.form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form__grid + .form__grid {
  margin-top: 14px;
}

.form__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.form__tip {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

/* PLC 双栏 */
.plc {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.self-test {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 左栏表单撑满卡片高度，操作按钮贴底，与右栏按钮对齐 */
.plc > .panel {
  display: flex;
  flex-direction: column;
}

.plc > .panel > .panel__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.plc .form__foot {
  margin-top: auto;
}

.self-test__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 14px;
  border-radius: 12px;
  border: 1px dashed var(--border-strong);
  background: var(--surface-2);
  color: var(--text-4);
  text-align: center;
}

.self-test__state strong {
  font-size: var(--fs-base);
  font-weight: 650;
  color: var(--text);
}

.self-test__state small {
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: var(--text-3);
}

.self-test__state--ok {
  border-color: color-mix(in srgb, var(--success) 32%, transparent);
  background: var(--success-weak);
  color: var(--success);
}

.self-test__state--fail {
  border-color: color-mix(in srgb, var(--danger) 32%, transparent);
  background: var(--danger-weak);
  color: var(--danger);
}

.self-test__time {
  font-size: var(--fs-xs);
  color: var(--text-4);
  text-align: center;
}

.register-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.register-form--write {
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

/* SSL */
.ssl {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.ssl__certs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.cert {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border-radius: 9px;
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
}

.cert__label {
  font-size: var(--fs-xs);
  color: var(--text-3);
}

.cert__value {
  font-size: var(--fs-xs);
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cert__pick {
  position: relative;
  margin-top: 2px;
  width: fit-content;
  cursor: pointer;
}

.cert__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* 摄像头 */
.cam {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cam__row {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.cam__preview-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.cam__preview-error {
  color: var(--danger);
  font-size: var(--fs-xs);
}

.cam__preview {
  margin-top: 12px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-3);
  border: 1px solid var(--border);
}

.cam__preview-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-4);
  font-size: var(--fs-xs);
}

.cam__head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
}

.cam__id {
  font-size: var(--fs-xs);
  color: var(--text-4);
  letter-spacing: 0.8px;
}

.cam__head strong {
  font-size: var(--fs-sm);
  font-weight: 600;
  flex: 1;
}

.cam__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

.cam__switch {
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .plc {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .form__grid--2,
  .form__grid--3,
  .ssl__certs {
    grid-template-columns: minmax(0, 1fr);
  }

  .cam__body {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .tabs {
    overflow-x: auto;
  }

  .tab span {
    display: none;
  }
}

.cam__top-btn {
  position: fixed;
  right: 28px;
  bottom: 24px;
  z-index: 20;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-2);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.cam__top-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
  color: var(--primary);
}
</style>
