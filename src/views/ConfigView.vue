<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import CameraPanel from '@/components/CameraPanel.vue'
import {
  fetchMqtt,
  fetchPlc,
  saveMqtt,
  savePlc,
  uploadCert,
} from '@/api/endpoints'
import { useToast } from '@/composables/toast'
import type { MqttConfig, OptionItem, PlcConfig } from '@/api/types'

type TabKey = 'plc' | 'mqtt' | 'camera'

const toast = useToast()
const route = useRoute()

const hints: Record<TabKey, string> = {
  plc: '与下位机 PLC 的通讯参数',
  mqtt: '平台接入与证书配置',
  camera: '三路视频通道的实时画面与推流控制',
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
const savedPlc = reactive<PlcConfig>({ ip: '', port: 502 })
const plcDirty = computed(() => {
  return plc.ip.trim() !== savedPlc.ip.trim() || Number(plc.port) !== Number(savedPlc.port)
})

/* ---------- MQTT ---------- */
const mqtt = ref<MqttConfig | null>(null)
const uploading = ref('')

/* ---------- 连通性自检 ---------- */
const testing = ref(false)
const testState = ref<'idle' | 'ok' | 'fail'>('idle')
const testMessage = ref('')
const testAt = ref(0)

const activeHint = computed(() => hints[active.value])
const plcTestTitle = computed(() => {
  if (testing.value) return '正在读取配置…'
  if (testState.value === 'ok') return '链路正常'
  if (testState.value === 'fail') return '链路异常'
  return plcDirty.value ? '参数已修改' : '等待测试'
})
const plcTestLabel = computed(() => {
  if (testing.value) return '测试中'
  if (testState.value === 'ok') return '正常'
  if (testState.value === 'fail') return '失败'
  return '未测试'
})

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
      const ip = result?.ip ?? ''
      const port = Number(result?.port ?? 502)
      plc.ip = ip
      plc.port = port
      savedPlc.ip = ip
      savedPlc.port = port
      resetPlcTest('尚未测试')
    } else if (active.value === 'mqtt') {
      mqtt.value = await fetchMqtt()
    }
  } catch (error) {
    toast.apiError('读取配置失败', error, '请检查设备连接')
  } finally {
    loading.value = false
  }
}

function resetPlcTest(message: string): void {
  testState.value = 'idle'
  testMessage.value = message
  testAt.value = 0
}

async function handleTestPlc(): Promise<void> {
  testing.value = true
  testMessage.value = 'GET /api/getPlc · 正在验证已保存参数'
  try {
    const result = await fetchPlc()
    const wasDirty = plcDirty.value
    const ip = String(result?.ip ?? savedPlc.ip ?? '').trim()
    const port = Number(result?.port ?? savedPlc.port)
    if (ip && Number.isInteger(port) && port > 0 && port <= 65535) {
      savedPlc.ip = ip
      savedPlc.port = port
      if (!wasDirty) {
        plc.ip = ip
        plc.port = port
      }
    }
    testState.value = 'ok'
    testMessage.value = `配置读取成功 · ${savedPlc.ip || '—'}:${savedPlc.port}`
    toast.success('PLC 连接正常', '配置读取成功')
  } catch (error) {
    testState.value = 'fail'
    testMessage.value = error instanceof Error ? error.message : '连接失败'
    toast.apiError('PLC 连接失败', error, testMessage.value)
  } finally {
    testing.value = false
    testAt.value = Date.now()
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
    savedPlc.ip = plc.ip.trim()
    savedPlc.port = port
    resetPlcTest('参数已保存，可发起连接自检确认参数可用')
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
watch(plcDirty, (dirty) => {
  if (dirty && !testing.value) {
    testState.value = 'idle'
    testMessage.value = '当前修改未保存 · 自检仍基于已保存参数'
    testAt.value = 0
  }
})

</script>

<template>
  <div class="page">
    <section class="tabs">
      <p class="hint hint--bar">
        <AppIcon name="target" :size="13" />
        {{ activeHint }}
      </p>
      <div class="tabs__spacer" />
      <button
        v-if="active !== 'camera'"
        class="btn btn--sm btn--ghost"
        type="button"
        :disabled="loading"
        @click="loadAll"
      >
        <AppIcon name="refresh" :size="13" :class="{ spin: loading }" />
        重新读取
      </button>
      <span v-else class="tabs__sync"><i /> 状态自动同步</span>
    </section>

    <!-- PLC -->
    <section v-if="active === 'plc'" class="plc">
      <article class="panel panel--corner">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">PLC 通讯参数</h2>
            <p class="panel__sub">POST /api/setPlc · 修改后需重新连接，动作指令下发至该地址</p>
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
            <p class="form__tip save-state" :class="{ 'save-state--dirty': plcDirty }">
              <i class="save-state__dot" aria-hidden="true" />
              {{ plcDirty ? '有未保存修改 · 自检将使用旧参数' : '已保存 · 与设备配置一致' }}
            </p>
            <button class="btn btn--primary" type="button" :disabled="saving" @click="handleSavePlc">
              <AppIcon :name="saving ? 'refresh' : 'check'" :size="14" :class="{ spin: saving }" />
              保存参数
            </button>
          </div>
        </div>
      </article>

      <article class="panel panel--corner">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">连接自检</h2>
            <p class="panel__sub">GET /api/getPlc · 使用已保存参数探测</p>
          </div>
          <span
            class="tag"
            :class="
              testState === 'ok'
                ? 'tag--success'
                : testState === 'fail'
                  ? 'tag--danger'
                  : testing
                    ? 'tag--warning'
                    : 'tag--muted'
            "
          >
            {{ plcTestLabel }}
          </span>
        </header>

        <div class="panel__body self-test">
          <div class="self-test__state self-test__state--inline" :class="`self-test__state--${testState}`">
            <AppIcon
              :name="testing ? 'refresh' : testState === 'ok' ? 'check' : testState === 'fail' ? 'alert' : 'plug'"
              :size="20"
              :class="{ spin: testing }"
            />
            <span>
              {{ plcTestTitle }}
            </span>
            <small>{{ testMessage || '尚未测试' }}</small>
          </div>

          <p class="self-test__time">
            最近测试 {{ testAt ? new Date(testAt).toLocaleTimeString('zh-CN', { hour12: false }) : '—' }}
          </p>

          <button class="btn btn--primary" type="button" :disabled="testing" @click="handleTestPlc">
            <AppIcon :name="testing ? 'refresh' : 'plug'" :size="14" :class="{ spin: testing }" />
            {{ testing ? '测试中…' : '测试连接' }}
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
    <CameraPanel v-if="active === 'camera'" />
  </div>
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

.tabs__sync {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  font-size: var(--fs-xs);
  color: var(--text-4);
  white-space: nowrap;
}

.tabs__sync i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 14%, transparent);
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

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.save-state__dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 14%, transparent);
}

.save-state--dirty {
  color: var(--warning);
}

.save-state--dirty .save-state__dot {
  background: var(--warning);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning) 14%, transparent);
}

/* PLC */
.plc {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.self-test {
  flex-direction: row;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
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

.self-test__state--inline {
  flex: 1;
  flex-direction: row;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 10px;
}

.self-test__state--inline small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.self-test__time {
  flex: none;
  font-size: var(--fs-xs);
  color: var(--text-4);
  white-space: nowrap;
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

@media (max-width: 1100px) {
  .plc {
    gap: 12px;
  }
}

@media (max-width: 900px) {
  .self-test {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .self-test__state--inline {
    flex: none;
  }
}

@media (max-width: 900px) {
  .form__grid--2,
  .form__grid--3,
  .ssl__certs {
    grid-template-columns: minmax(0, 1fr);
  }

  .tabs {
    overflow-x: auto;
  }

  .tab span {
    display: none;
  }
}
</style>
