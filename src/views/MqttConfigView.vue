<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackToTopButton from '@/components/BackToTopButton.vue'
import { fetchMqtt, saveMqtt, uploadCert } from '@/api/endpoints'
import { setMqttDemoMode, useToast } from '@/composables/toast'
import type { CertConfig, MqttConfig, OptionItem } from '@/api/types'

type CheckState = 'pass' | 'warn' | 'fail'
type CertKind = 'ca' | 'cert' | 'key'
type PendingAction = 'reload' | 'reset'

interface CheckItem {
  key: string
  label: string
  detail: string
  state: CheckState
  target: string
}

interface CertSlot {
  kind: CertKind
  key: keyof CertConfig
  title: string
  subtitle: string
  value: string
  required: boolean
}

const DEFAULT_HOST: OptionItem[] = [
  { num: 0, text: 'mqtts://', isSelected: 1 },
  { num: 1, text: 'mqtt://', isSelected: 0 },
]

const DEFAULT_QOS: OptionItem[] = [
  { num: 0, text: 'QOS 0', isSelected: 0 },
  { num: 1, text: 'QOS 1', isSelected: 0 },
  { num: 2, text: 'QOS 2', isSelected: 1 },
]

const DEFAULT_VER: OptionItem[] = [
  { num: 0, text: '3.1.1', isSelected: 1 },
  { num: 1, text: '5.0', isSelected: 0 },
]

const DEFAULT_SSL: OptionItem[] = [
  { num: 0, text: '不认证', isSelected: 0 },
  { num: 1, text: '服务器认证', isSelected: 0 },
  { num: 2, text: '双向认证', isSelected: 1 },
]

const CERT_FIELDS: Record<CertKind, keyof CertConfig> = {
  ca: 'caFile',
  cert: 'certFile',
  key: 'keyFile',
}

const DEMO_CONFIG: MqttConfig = {
  deviceId: 'JBYUAD-8AF33CB25E899',
  host: [
    { num: 0, text: 'mqtts://', isSelected: 1 },
    { num: 1, text: 'mqtt://', isSelected: 0 },
  ],
  addr: '192.168.1.10',
  port: 1883,
  clientId: 'JBYUAD-8AF33CB25E899',
  qos: [
    { num: 0, text: 'QOS 0', isSelected: 0 },
    { num: 1, text: 'QOS 1', isSelected: 0 },
    { num: 2, text: 'QOS 2', isSelected: 1 },
  ],
  keepalive: 10,
  serverId: 'server12345678',
  user: 'admin',
  passwd: 'J100y@ups.2025',
  ver: [
    { num: 0, text: '3.1.1', isSelected: 1 },
    { num: 1, text: '5.0', isSelected: 0 },
  ],
  cert: {
    caFile: 'ca-cert.pem',
    certFile: 'client-cert.pem',
    keyFile: 'client-key.pem',
  },
  ssl: [
    { num: 0, text: '不认证', isSelected: 0 },
    { num: 1, text: '服务器认证', isSelected: 0 },
    { num: 2, text: '双向认证', isSelected: 1 },
  ],
  sslEnable: 1,
}

const KEEPALIVE_PRESETS = [10, 30, 60, 120]
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const config = ref<MqttConfig | null>(null)
const original = ref<MqttConfig | null>(null)
const usingDemo = ref(false)
const loadError = ref('')
const saveError = ref('')
const loadedAt = ref(0)
const savedAt = ref(0)
const showPassword = ref(false)
const uploading = ref<CertKind | ''>('')
const confirmOpen = ref(false)
const pendingAction = ref<PendingAction>('reload')

function cloneConfig(value: MqttConfig): MqttConfig {
  return JSON.parse(JSON.stringify(value)) as MqttConfig
}

function cloneOptions(value: OptionItem[]): OptionItem[] {
  return value.map((item) => ({ ...item }))
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeOptions(input: unknown, fallback: OptionItem[]): OptionItem[] {
  const source = Array.isArray(input) ? input : []
  const options = source
    .map((entry, index) => {
      const item = asRecord(entry)
      return {
        num: toNumber(item.num, index),
        text: String(item.text ?? '').trim(),
        isSelected: toNumber(item.isSelected, 0) === 1 ? 1 : 0,
      }
    })
    .filter((item) => item.text.length > 0)

  if (!options.length) return cloneOptions(fallback)

  let selected = false
  for (const option of options) {
    if (!selected && option.isSelected === 1) {
      selected = true
    } else {
      option.isSelected = 0
    }
  }
  if (!selected) options[0].isSelected = 1
  return options
}

function normalizeConfig(rawValue: unknown): MqttConfig {
  const raw = asRecord(rawValue) as Partial<MqttConfig>
  const rawSsl = raw.ssl as unknown
  const sslRecord = !Array.isArray(rawSsl) ? asRecord(rawSsl) : {}
  const rawCert = asRecord(raw.cert)
  const sslList = Array.isArray(rawSsl) ? rawSsl : sslRecord.list
  const sslEnable = toNumber(raw.sslEnable ?? sslRecord.enable, 0) === 1 ? 1 : 0

  return {
    deviceId: typeof raw.deviceId === 'string' ? raw.deviceId : '',
    host: normalizeOptions(raw.host, DEFAULT_HOST),
    addr: typeof raw.addr === 'string' ? raw.addr : '',
    port: toNumber(raw.port, 1883),
    clientId: typeof raw.clientId === 'string' ? raw.clientId : '',
    qos: normalizeOptions(raw.qos, DEFAULT_QOS),
    keepalive: toNumber(raw.keepalive, 60),
    serverId: typeof raw.serverId === 'string' ? raw.serverId : '',
    user: typeof raw.user === 'string' ? raw.user : '',
    passwd: typeof raw.passwd === 'string' ? raw.passwd : '',
    ver: normalizeOptions(raw.ver, DEFAULT_VER),
    cert: {
      caFile: typeof rawCert.caFile === 'string' ? rawCert.caFile : '',
      certFile: typeof rawCert.certFile === 'string' ? rawCert.certFile : '',
      keyFile: typeof rawCert.keyFile === 'string' ? rawCert.keyFile : '',
    },
    ssl: normalizeOptions(sslList, DEFAULT_SSL),
    sslEnable,
  }
}

function selectedOption(list: OptionItem[]): OptionItem | null {
  return list.find((item) => item.isSelected === 1) ?? list[0] ?? null
}

function pickOption(list: OptionItem[], num: number): void {
  for (const item of list) item.isSelected = item.num === num ? 1 : 0
}

function sanitizeAddress(value: string): string {
  return value
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

function formatTime(value: number): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function fileName(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).pop() ?? value
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

const selectedHost = computed(() => (config.value ? selectedOption(config.value.host) : null))
const selectedQos = computed(() => (config.value ? selectedOption(config.value.qos) : null))
const selectedVer = computed(() => (config.value ? selectedOption(config.value.ver) : null))
const selectedSsl = computed(() => (config.value ? selectedOption(config.value.ssl) : null))
const apiOptionGroups = computed(() => {
  const current = config.value
  if (!current) return []
  const format = (list: OptionItem[]) => JSON.stringify(list)
  return [
    { key: 'host', label: 'host', count: current.host.length, value: format(current.host) },
    { key: 'qos', label: 'qos', count: current.qos.length, value: format(current.qos) },
    { key: 'ver', label: 'ver', count: current.ver.length, value: format(current.ver) },
    { key: 'ssl', label: 'ssl.list', count: current.ssl.length, value: format(current.ssl) },
  ]
})
const hostPrefix = computed(() => selectedHost.value?.text ?? 'mqtt://')
const sslEnabled = computed(() => config.value?.sslEnable === 1)
const sslModeNum = computed(() => (selectedSsl.value ? Number(selectedSsl.value.num) : -1))
const secureProtocol = computed(() => hostPrefix.value.toLowerCase().startsWith('mqtts'))
const cleanAddr = computed(() => sanitizeAddress(config.value?.addr ?? ''))
const endpointText = computed(() => {
  if (!config.value) return ''
  const address = cleanAddr.value || '未填写地址'
  return `${hostPrefix.value}${address}:${config.value.port || '—'}`
})
const isDirty = computed(
  () =>
    !!config.value &&
    !!original.value &&
    JSON.stringify(config.value) !== JSON.stringify(original.value),
)
const versionText = computed(() => selectedVer.value?.text ?? '—')
const qosText = computed(() => selectedQos.value?.text ?? '—')
const authSummary = computed(() => {
  const user = config.value?.user.trim() ?? ''
  if (!user) return '匿名'
  return `${user} / ${config.value?.passwd ? '••••••' : '空密码'}`
})

const certSlots = computed<CertSlot[]>(() => {
  const cert = config.value?.cert
  const needCa = sslEnabled.value && sslModeNum.value >= 1
  const needClientCert = sslEnabled.value && sslModeNum.value === 2
  return [
    {
      kind: 'ca',
      key: 'caFile',
      title: 'CA 证书',
      subtitle: '验证 Broker 身份',
      value: cert?.caFile ?? '',
      required: needCa,
    },
    {
      kind: 'cert',
      key: 'certFile',
      title: '客户端证书',
      subtitle: '双向认证时使用',
      value: cert?.certFile ?? '',
      required: needClientCert,
    },
    {
      kind: 'key',
      key: 'keyFile',
      title: '客户端私钥',
      subtitle: '双向认证时使用',
      value: cert?.keyFile ?? '',
      required: needClientCert,
    },
  ]
})

const checks = computed<CheckItem[]>(() => {
  const current = config.value
  if (!current) return []

  const address = cleanAddr.value
  const port = Number(current.port)
  const keepalive = Number(current.keepalive)
  const hasUser = !!current.user.trim()
  const hasPassword = !!current.passwd
  const mode = selectedSsl.value
  const modeNum = Number(mode?.num ?? -1)
  const missingCerts = certSlots.value.filter((slot) => slot.required && !slot.value.trim())
  const endpointIssue = !address
    ? '请填写 Broker 的 IP 地址或域名'
    : /[\s/:]/.test(address) && !address.startsWith('[')
      ? '地址中不要包含协议、路径或端口'
      : null

  const authState: CheckState = !hasUser && !hasPassword ? 'warn' : hasUser !== hasPassword ? 'warn' : 'pass'
  const authDetail = !hasUser && !hasPassword
    ? '未填写账号，仅适用于允许匿名连接的 Broker'
    : hasUser !== hasPassword
      ? '用户名与密码仅填写了一项，请确认 Broker 的认证方式'
      : `已配置账号 ${current.user.trim()}`

  let sslState: CheckState = 'pass'
  let sslDetail = 'SSL 未启用，证书文件不会参与连接'
  if (sslEnabled.value) {
    if (!mode) {
      sslState = 'fail'
      sslDetail = '请选择 SSL 认证方式'
    } else if (modeNum === 0) {
      sslState = 'warn'
      sslDetail = 'SSL 已启用，但未校验 Broker 证书'
    } else if (modeNum === 1) {
      sslState = missingCerts.length ? 'fail' : 'pass'
      sslDetail = missingCerts.length ? '服务器认证需要 CA 证书' : 'CA 证书已就绪'
    } else if (modeNum === 2) {
      sslState = missingCerts.length ? 'fail' : 'pass'
      sslDetail = missingCerts.length
        ? `双向认证缺少：${missingCerts.map((slot) => slot.title).join('、')}`
        : 'CA、客户端证书与私钥已就绪'
    } else {
      sslState = 'fail'
      sslDetail = 'SSL 认证选项无效，请重新选择'
    }
  }

  const protocolState: CheckState =
    sslEnabled.value === secureProtocol.value ? 'pass' : 'fail'
  const protocolDetail =
    protocolState === 'pass'
      ? sslEnabled.value
        ? 'mqtts:// 与 SSL 开关一致'
        : 'mqtt:// 与明文传输一致'
      : sslEnabled.value
        ? 'SSL 已启用但选择了 mqtt://，请切换协议或关闭 SSL'
        : '选择了 mqtts:// 但 SSL 未启用，请开启 SSL 或切换协议'

  return [
    {
      key: 'endpoint',
      label: 'Broker 地址与端口',
      detail: endpointIssue ?? `${address}:${port}`,
      state: endpointIssue || !Number.isInteger(port) || port < 1 || port > 65535 ? 'fail' : 'pass',
      target: 'mqtt-endpoint',
    },
    {
      key: 'client',
      label: '客户端标识',
      detail: current.clientId.trim() ? current.clientId.trim() : 'Client ID 不能为空',
      state: current.clientId.trim() ? 'pass' : 'fail',
      target: 'mqtt-endpoint',
    },
    {
      key: 'keepalive',
      label: '心跳周期',
      detail:
        Number.isInteger(keepalive) && keepalive >= 1 && keepalive <= 65535
          ? `${keepalive} 秒`
          : '心跳需为 1–65535 之间的整数',
      state:
        Number.isInteger(keepalive) && keepalive >= 1 && keepalive <= 65535 ? 'pass' : 'fail',
      target: 'mqtt-endpoint',
    },
    {
      key: 'protocol',
      label: '协议与 SSL 一致性',
      detail: protocolDetail,
      state: protocolState,
      target: 'mqtt-endpoint',
    },
    {
      key: 'auth',
      label: 'Broker 身份认证',
      detail: authDetail,
      state: authState,
      target: 'mqtt-auth',
    },
    {
      key: 'cert',
      label: 'SSL 证书链',
      detail: sslDetail,
      state: sslState,
      target: 'mqtt-ssl',
    },
  ]
})

const errorCount = computed(() => checks.value.filter((item) => item.state === 'fail').length)
const warnCount = computed(() => checks.value.filter((item) => item.state === 'warn').length)
const canSave = computed(
  () =>
    !!config.value &&
    !usingDemo.value &&
    errorCount.value === 0 &&
    isDirty.value &&
    !saving.value &&
    !loading.value,
)
const syncText = computed(() => {
  if (saving.value) return '正在写入设备'
  if (saveError.value) return '保存失败'
  if (usingDemo.value) return '演示数据'
  if (isDirty.value) return '有未保存修改'
  if (savedAt.value) return '已保存并同步'
  return '配置已同步'
})
const syncTone = computed(() =>
  saving.value || isDirty.value ? 'dirty' : saveError.value ? 'error' : usingDemo.value ? 'demo' : 'synced',
)
const saveButtonText = computed(() => {
  if (saving.value) return '保存中…'
  if (!config.value) return '保存配置'
  if (usingDemo.value) return '演示模式不可保存'
  if (errorCount.value) return '先处理阻塞项'
  if (!isDirty.value) return '配置已保存'
  return '保存并重连'
})
const confirmTitle = computed(() =>
  pendingAction.value === 'reload' ? '放弃修改并重新读取？' : '撤销当前修改？',
)
const confirmMessage = computed(() =>
  pendingAction.value === 'reload'
    ? '设备上的最新参数将覆盖当前未保存的修改。'
    : '表单将恢复到最近一次读取或保存时的状态。',
)
const syncFootnote = computed(() => {
  if (usingDemo.value) return '接口不可用，当前为示例配置'
  if (savedAt.value) return `上次保存 ${formatTime(savedAt.value)}`
  if (loadedAt.value) return `上次读取 ${formatTime(loadedAt.value)}`
  return '尚未从设备读取'
})

function qosDescription(num: number): string {
  if (num === 0) return '至多一次，网络拥塞时可能丢失'
  if (num === 1) return '至少一次，保证到达但可能重复'
  if (num === 2) return '恰好一次，可靠但握手开销最高'
  return '消息投递质量等级'
}

function versionDescription(num: number): string {
  if (num === 0) return '兼容性最好，适合现有 Broker'
  if (num === 1) return '支持属性、原因码与共享订阅'
  return 'MQTT 协议版本'
}

function sslDescription(num: number): string {
  if (num === 0) return '仅加密链路，不校验证书'
  if (num === 1) return '客户端校验 Broker 的 CA 证书'
  if (num === 2) return '双方互相校验证书与私钥'
  return 'SSL 认证方式'
}

function sslModeIcon(num: number): string {
  if (num === 0) return 'unlock'
  if (num === 1) return 'shield'
  return 'key'
}

function checkIcon(state: CheckState): string {
  if (state === 'pass') return 'check'
  if (state === 'warn') return 'alert'
  return 'close'
}

function applyProtocol(secure: boolean): void {
  if (!config.value) return
  const desired = secure ? 'mqtts://' : 'mqtt://'
  const target = config.value.host.find(
    (item) => item.text.trim().toLowerCase() === desired,
  )
  if (target) pickOption(config.value.host, target.num)
}

function selectHost(item: OptionItem): void {
  if (!config.value) return
  pickOption(config.value.host, item.num)
  config.value.sslEnable = item.text.toLowerCase().startsWith('mqtts') ? 1 : 0
}

function toggleSsl(event: Event): void {
  if (!config.value) return
  const enabled = (event.target as HTMLInputElement).checked
  config.value.sslEnable = enabled ? 1 : 0
  applyProtocol(enabled)
}

function normalizeAddressInput(): void {
  if (!config.value) return
  const raw = config.value.addr.trim()
  const scheme = /^(mqtts?):\/\//i.exec(raw)?.[1]?.toLowerCase()
  if (scheme) {
    const secure = scheme === 'mqtts'
    config.value.sslEnable = secure ? 1 : 0
    applyProtocol(secure)
  }
  config.value.addr = sanitizeAddress(raw)
}

async function copyEndpoint(): Promise<void> {
  if (!config.value) return
  try {
    await navigator.clipboard.writeText(endpointText.value)
    toast.success('Broker 地址已复制', endpointText.value)
  } catch {
    toast.warning('复制失败', '请手动选择地址复制')
  }
}

function scrollToTarget(target: string): void {
  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadConfig(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const next = normalizeConfig(await fetchMqtt())
    config.value = next
    original.value = cloneConfig(next)
    usingDemo.value = false
      setMqttDemoMode(false)
    loadedAt.value = Date.now()
    savedAt.value = 0
    saveError.value = ''
    showPassword.value = false
  } catch (error) {
    if (!config.value) {
      const demoConfig = normalizeConfig(DEMO_CONFIG)
      config.value = demoConfig
      original.value = cloneConfig(demoConfig)
      usingDemo.value = true
      setMqttDemoMode(true)
      loadedAt.value = 0
      savedAt.value = 0
      saveError.value = ''
      showPassword.value = false
      toast.warning('接口不可用，已显示演示配置', '请检查设备连接后重新读取；演示模式不会写入设备')
    }
    loadError.value = error instanceof Error ? error.message : '读取 MQTT 配置失败'
  } finally {
    loading.value = false
  }
}

function requestReload(): void {
  if (isDirty.value) {
    pendingAction.value = 'reload'
    confirmOpen.value = true
    return
  }
  void loadConfig()
}

function requestReset(): void {
  if (!isDirty.value) return
  pendingAction.value = 'reset'
  confirmOpen.value = true
}

function confirmPendingAction(): void {
  confirmOpen.value = false
  if (pendingAction.value === 'reload') {
    void loadConfig()
    return
  }
  if (original.value) {
    config.value = cloneConfig(original.value)
    saveError.value = ''
    toast.info('已撤销未保存的修改')
  }
}

async function handleSave(): Promise<void> {
  if (!config.value || saving.value) return
  if (usingDemo.value) {
    toast.warning('当前为演示配置', '设备接口不可用，请恢复连接后重新读取再保存')
    return
  }
  if (errorCount.value) {
    const firstError = checks.value.find((item) => item.state === 'fail')
    scrollToTarget(firstError?.target ?? 'mqtt-endpoint')
    toast.warning('配置尚未就绪', firstError ? firstError.detail : '请先处理发布前检查中的阻塞项')
    return
  }

  config.value.addr = sanitizeAddress(config.value.addr)
  config.value.port = Number(config.value.port)
  config.value.keepalive = Number(config.value.keepalive)

  const payload = cloneConfig(config.value)
  saving.value = true
  saveError.value = ''
  try {
    await saveMqtt(payload)
    config.value = cloneConfig(payload)
    original.value = cloneConfig(payload)
    savedAt.value = Date.now()
    toast.success('MQTT 参数已保存', '设备将按新参数重新连接 Broker')
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存失败'
    toast.apiError('保存 MQTT 配置失败', error, '请稍后重试')
  } finally {
    saving.value = false
  }
}

async function pickCert(kind: CertKind, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !config.value) return
  if (usingDemo.value) {
    input.value = ''
    toast.warning('当前为演示模式', '设备接口不可用，证书不会上传')
    return
  }

  uploading.value = kind
  try {
    const certNum = kind === 'ca' ? 0 : kind === 'cert' ? 1 : 2
    await uploadCert(certNum, arrayBufferToBase64(await file.arrayBuffer()))
    config.value.cert[CERT_FIELDS[kind]] = file.name
    toast.success('证书文件已上传', file.name)
  } catch (error) {
    toast.apiError('证书上传失败', error, '请检查文件格式与设备连接')
  } finally {
    uploading.value = ''
    input.value = ''
  }
}

onMounted(() => {
  void loadConfig()
})

onBeforeUnmount(() => {
  setMqttDemoMode(false)
})
</script>

<template>
  <div class="mqtt">
    <div v-if="loadError && config" class="banner banner--error">
      <span class="banner__icon"><AppIcon name="alert" :size="16" /></span>
      <div class="banner__body">
        <strong>{{ usingDemo ? '接口不可用，当前显示演示配置' : '重新读取失败，当前显示上一次成功读取的配置' }}</strong>
        <small>{{ loadError }}</small>
      </div>
      <button class="btn btn--sm" type="button" :disabled="loading" @click="requestReload">
        <AppIcon name="refresh" :size="13" :class="{ spin: loading }" />
        重试
      </button>
    </div>

    <section v-if="config" class="hero">
      <div class="hero__glow" aria-hidden="true" />
      <div class="hero__ring" aria-hidden="true" />

      <header class="hero__top">
        <span class="hero__kicker">
          <AppIcon name="radio" :size="14" />
          MQTT UPLINK
          <em>设备消息通道</em>
        </span>
        <span class="sync-pill" :class="`sync-pill--${syncTone}`">
          <i />
          {{ syncText }}
        </span>
      </header>

      <div class="hero__grid">
        <div class="hero__lead">
          <p class="hero__label">BROKER ENDPOINT</p>
          <div class="hero__endpoint">
            <span class="hero__protocol">{{ hostPrefix }}</span>
            <strong :title="cleanAddr || '未填写地址'">{{ cleanAddr || '未填写地址' }}</strong>
            <span class="hero__port">:{{ config.port || '—' }}</span>
            <button class="hero__copy" type="button" title="复制 Broker 地址" @click="copyEndpoint">
              <AppIcon name="copy" :size="14" />
            </button>
          </div>
          <div class="hero__ids">
            <span>
              <small>DEVICE ID</small>
              <b class="mono">{{ config.deviceId || '—' }}</b>
            </span>
            <span class="hero__divider" />
            <span>
              <small>CLIENT ID</small>
              <b class="mono">{{ config.clientId || '—' }}</b>
            </span>
          </div>
        </div>

        <div class="hero__stats">
          <div class="stat">
            <span class="stat__icon"><AppIcon name="layers" :size="16" /></span>
            <span>
              <small>协议版本</small>
              <b>{{ versionText }}<em>MQTT</em></b>
            </span>
          </div>
          <div class="stat">
            <span class="stat__icon"><AppIcon name="signal" :size="16" /></span>
            <span>
              <small>消息质量</small>
              <b>{{ qosText }}</b>
            </span>
          </div>
          <div class="stat">
            <span class="stat__icon"><AppIcon name="clock" :size="16" /></span>
            <span>
              <small>心跳周期</small>
              <b>{{ config.keepalive }}<em>秒</em></b>
            </span>
          </div>
          <div class="stat">
            <span class="stat__icon">
              <AppIcon :name="sslEnabled ? 'lock' : 'unlock'" :size="16" />
            </span>
            <span>
              <small>传输安全</small>
              <b>{{ sslEnabled ? selectedSsl?.text || 'SSL' : '明文' }}</b>
            </span>
          </div>
        </div>
      </div>

      <footer class="hero__foot">
        <p class="hero__hint">
          <AppIcon :name="sslEnabled ? 'shield' : 'info'" :size="14" />
          {{ sslEnabled ? 'SSL 通道已启用，凭据与证书将随连接握手使用' : '当前为明文通道，建议生产环境启用 SSL' }}
          <span>·</span>
          {{ syncFootnote }}
        </p>
        <div class="hero__actions">
          <button class="hero-btn" type="button" :disabled="loading || saving" @click="requestReload">
            <AppIcon name="refresh" :size="14" :class="{ spin: loading }" />
            重新读取
          </button>
          <button
            class="hero-btn hero-btn--primary"
            type="button"
            :disabled="!canSave"
            @click="handleSave"
          >
            <AppIcon :name="saving ? 'refresh' : 'check'" :size="14" :class="{ spin: saving }" />
            {{ saveButtonText }}
          </button>
        </div>
      </footer>
    </section>

    <div v-if="loading && !config" class="loading-card">
      <span class="loading-card__ring" />
      <strong>正在读取 MQTT 配置</strong>
      <small class="mono">GET /api/getMqtt</small>
    </div>

    <div v-else-if="!config" class="empty-card">
      <span class="empty-card__icon"><AppIcon name="alert" :size="28" /></span>
      <h2>无法读取 MQTT 配置</h2>
      <p>{{ loadError || '设备接口暂时不可达，请检查网络后重试。' }}</p>
      <button class="btn btn--primary" type="button" :disabled="loading" @click="loadConfig">
        <AppIcon name="refresh" :size="14" :class="{ spin: loading }" />
        {{ loading ? '正在读取…' : '重新读取' }}
      </button>
    </div>

    <div v-else class="workspace">
      <main class="editor">
        <section id="mqtt-endpoint" class="card">
          <header class="card__head">
            <span class="card__index">01</span>
            <div class="card__title">
              <h2>Broker 连接</h2>
              <p>协议、服务地址与客户端身份</p>
            </div>
            <span class="card__tag">必填</span>
          </header>

          <div class="card__body">
            <div>
              <p class="sect-label">传输协议</p>
              <div class="protocol-grid">
                <button
                  v-for="item in config.host"
                  :key="item.num"
                  class="protocol-card"
                  :class="{ 'is-active': item.isSelected === 1 }"
                  type="button"
                  :aria-pressed="item.isSelected === 1"
                  @click="selectHost(item)"
                >
                  <span class="protocol-card__icon">
                    <AppIcon :name="item.text.toLowerCase().startsWith('mqtts') ? 'lock' : 'unlock'" :size="17" />
                  </span>
                  <span class="protocol-card__text">
                    <b class="mono">{{ item.text }}</b>
                    <small>
                      {{ item.text.toLowerCase().startsWith('mqtts') ? 'SSL 加密传输，适合公网接入' : '明文传输，仅建议内网调试使用' }}
                    </small>
                  </span>
                  <span class="protocol-card__check"><AppIcon name="check" :size="12" /></span>
                </button>
              </div>
              <div v-if="usingDemo" class="demo-host-list">
                <span class="demo-host-list__label">演示 host 数组</span>
                <code v-for="item in config.host" :key="item.num">
                  {
                    num: {{ item.num }},
                    text: "{{ item.text }}",
                    isSelected: {{ item.isSelected }}
                  }
                </code>
              </div>
            </div>

            <div class="endpoint-row">
              <label class="field">
                <span class="field__label">服务器地址</span>
                <span class="endpoint-input">
                  <span class="endpoint-input__prefix">{{ hostPrefix }}</span>
                  <input
                    v-model="config.addr"
                    class="mono"
                    type="text"
                    placeholder="192.168.1.10 或 broker.example.com"
                    autocomplete="off"
                    spellcheck="false"
                    @blur="normalizeAddressInput"
                  />
                </span>
                <span class="field__hint">IP 或域名，不含协议前缀与端口</span>
              </label>

              <label class="field endpoint-row__port">
                <span class="field__label">端口</span>
                <input v-model.number="config.port" class="input mono" type="number" min="1" max="65535" />
                <span class="field__hint">SSL 常用 8883</span>
              </label>
            </div>

            <div class="two-col">
              <label class="field">
                <span class="field__label">Client ID</span>
                <input
                  v-model="config.clientId"
                  class="input mono"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="设备唯一客户端标识"
                />
                <span class="field__hint">同一 Broker 下不可与其他客户端重复</span>
              </label>

              <label class="field">
                <span class="field__label">
                  Server ID
                  <span class="field__optional">可选</span>
                </span>
                <input
                  v-model="config.serverId"
                  class="input mono"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="服务端标识"
                />
                <span class="field__hint">用于标识目标 MQTT 服务端</span>
              </label>
            </div>

            <div class="keepalive">
              <label class="field keepalive__field">
                <span class="field__label">心跳周期</span>
                <span class="keepalive__input">
                  <input v-model.number="config.keepalive" class="input mono" type="number" min="1" max="65535" />
                  <em>秒</em>
                </span>
                <span class="field__hint">超过 1.5 倍心跳未响应时，设备判定连接断开</span>
              </label>
              <div class="keepalive__presets" aria-label="心跳快捷值">
                <button
                  v-for="value in KEEPALIVE_PRESETS"
                  :key="value"
                  class="quick-chip"
                  :class="{ 'is-active': Number(config.keepalive) === value }"
                  type="button"
                  @click="config.keepalive = value"
                >
                  {{ value }}s
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="mqtt-protocol" class="card">
          <header class="card__head">
            <span class="card__index">02</span>
            <div class="card__title">
              <h2>协议与消息</h2>
              <p>选择 MQTT 版本与消息投递质量</p>
            </div>
            <span class="card__tag card__tag--blue">会话行为</span>
          </header>

          <div class="card__body">
            <div>
              <p class="sect-label">协议版本</p>
              <div class="choice-grid">
                <button
                  v-for="item in config.ver"
                  :key="item.num"
                  class="choice-card"
                  :class="{ 'is-active': item.isSelected === 1 }"
                  type="button"
                  :aria-pressed="item.isSelected === 1"
                  @click="pickOption(config.ver, item.num)"
                >
                  <span class="choice-card__top">
                    <b>MQTT {{ item.text }}</b>
                    <span class="choice-card__radio" />
                  </span>
                  <small>{{ versionDescription(item.num) }}</small>
                </button>
              </div>
            </div>

            <div>
              <p class="sect-label">QoS 等级</p>
              <div class="qos-grid">
                <button
                  v-for="item in config.qos"
                  :key="item.num"
                  class="qos-card"
                  :class="{ 'is-active': item.isSelected === 1 }"
                  type="button"
                  :aria-pressed="item.isSelected === 1"
                  @click="pickOption(config.qos, item.num)"
                >
                  <span class="qos-card__num">{{ item.num }}</span>
                  <span class="qos-card__text">
                    <b>{{ item.text }}</b>
                    <small>{{ qosDescription(item.num) }}</small>
                  </span>
                  <span class="choice-card__radio" />
                </button>
              </div>
            </div>

            <div class="inline-note">
              <AppIcon name="info" :size="15" />
              <span>
                QoS 当前为 <b>{{ qosText }}</b>，协议版本为 <b>MQTT {{ versionText }}</b>。
                提升可靠性会增加握手与确认开销，请按上报频率选择。
              </span>
            </div>
          </div>
        </section>

        <section id="mqtt-auth" class="card">
          <header class="card__head">
            <span class="card__index">03</span>
            <div class="card__title">
              <h2>身份认证</h2>
              <p>Broker 用户名与密码</p>
            </div>
            <span class="card__tag card__tag--muted">凭据</span>
          </header>

          <div class="card__body">
            <div class="two-col">
              <label class="field">
                <span class="field__label">用户名</span>
                <input
                  v-model="config.user"
                  class="input"
                  type="text"
                  autocomplete="username"
                  spellcheck="false"
                  placeholder="Broker 用户名"
                />
              </label>

              <label class="field">
                <span class="field__label">密码</span>
                <span class="input-wrap">
                  <input
                    v-model="config.passwd"
                    class="input"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Broker 密码"
                  />
                  <button
                    class="input-wrap__btn"
                    type="button"
                    :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                    :title="showPassword ? '隐藏密码' : '显示密码'"
                    @click="showPassword = !showPassword"
                  >
                    <AppIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="15" />
                  </button>
                </span>
              </label>
            </div>

            <div class="inline-note">
              <AppIcon name="key" :size="15" />
              <span>
                当前认证方式：<b>{{ authSummary }}</b>。账号与密码会随保存接口提交到设备；
                若 Broker 允许匿名接入，可同时留空。
              </span>
            </div>
          </div>
        </section>

        <section id="mqtt-ssl" class="card">
          <header class="card__head">
            <span class="card__index">04</span>
            <div class="card__title">
              <h2>SSL 与证书</h2>
              <p>链路加密、服务端校验与双向认证</p>
            </div>
            <label class="switch ssl-switch">
              <input type="checkbox" :checked="sslEnabled" @change="toggleSsl" />
              <span class="switch__track" />
              <span>{{ sslEnabled ? '已启用' : '未启用' }}</span>
            </label>
          </header>

          <div class="card__body">
            <div class="ssl-body" :class="{ 'is-disabled': !sslEnabled }">
              <div>
                <p class="sect-label">认证方式</p>
                <div class="ssl-mode-grid">
                  <button
                    v-for="item in config.ssl"
                    :key="item.num"
                    class="ssl-mode"
                    :class="{ 'is-active': item.isSelected === 1 }"
                    type="button"
                    :disabled="!sslEnabled"
                    :aria-pressed="item.isSelected === 1"
                    @click="pickOption(config.ssl, item.num)"
                  >
                    <span class="ssl-mode__icon">
                      <AppIcon :name="sslModeIcon(item.num)" :size="16" />
                    </span>
                    <span>
                      <b>{{ item.text }}</b>
                      <small>{{ sslDescription(item.num) }}</small>
                    </span>
                    <span class="choice-card__radio" />
                  </button>
                </div>
              </div>

              <div>
                <p class="sect-label">证书文件</p>
                <div class="cert-grid">
                  <div
                    v-for="slot in certSlots"
                    :key="slot.kind"
                    class="cert-card"
                    :class="{ 'is-missing': slot.required && !slot.value.trim() }"
                  >
                    <header class="cert-card__head">
                      <span class="cert-card__icon">
                        <AppIcon name="certificate" :size="16" />
                      </span>
                      <span class="cert-card__title">
                        <b>{{ slot.title }}</b>
                        <small>{{ slot.subtitle }}</small>
                      </span>
                      <span v-if="slot.required" class="cert-card__required">必填</span>
                    </header>

                    <p class="cert-card__file mono" :title="slot.value">
                      {{ slot.value ? fileName(slot.value) : '尚未上传文件' }}
                    </p>

                    <label class="cert-card__pick" :class="{ 'is-busy': uploading === slot.kind }">
                      <AppIcon
                        :name="uploading === slot.kind ? 'refresh' : 'upload'"
                        :size="13"
                        :class="{ spin: uploading === slot.kind }"
                      />
                      {{ uploading === slot.kind ? '上传中…' : slot.value ? '替换文件' : '选择文件' }}
                      <input
                        class="cert-card__input"
                        type="file"
                        accept=".pem,.crt,.cer,.key"
                        :aria-label="`上传${slot.title}`"
                        :disabled="uploading === slot.kind"
                        @change="pickCert(slot.kind, $event)"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <p class="ssl-note">
                <AppIcon name="shield" :size="14" />
                证书文件通过设备证书接口上传，保存时仅提交文件名。
                服务器认证需要 CA 证书；双向认证还需要客户端证书与私钥。
              </p>
            </div>

            <div v-if="!sslEnabled" class="ssl-off-note">
              <AppIcon name="info" :size="15" />
              关闭 SSL 后，认证方式与证书不会参与连接；已上传文件会保留在设备中。
            </div>
          </div>
        </section>

        <footer class="editor-foot">
          <div class="editor-foot__state">
            <span class="editor-foot__icon" :class="{ 'is-dirty': isDirty, 'is-saved': !isDirty }">
              <AppIcon :name="isDirty ? 'alert' : 'check'" :size="15" />
            </span>
            <div>
              <b>{{ usingDemo ? '接口不可用 · 演示模式' : isDirty ? '更改尚未写入设备' : '当前值与设备一致' }}</b>
              <small>{{ saveError || syncFootnote }}</small>
            </div>
          </div>
          <div class="editor-foot__actions">
            <button class="btn" type="button" :disabled="!isDirty || saving" @click="requestReset">
              撤销修改
            </button>
            <button class="btn btn--primary" type="button" :disabled="!canSave" @click="handleSave">
              <AppIcon :name="saving ? 'refresh' : 'check'" :size="14" :class="{ spin: saving }" />
              {{ saveButtonText }}
            </button>
          </div>
        </footer>
      </main>

      <aside class="rail">
        <section class="card rail-card">
          <header class="rail-card__head">
            <div>
              <h3><AppIcon name="shield" :size="15" /> 发布前检查</h3>
              <p>本地校验，不会主动连接 Broker</p>
            </div>
            <span
              class="check-badge"
              :class="errorCount ? 'check-badge--error' : warnCount ? 'check-badge--warn' : 'check-badge--pass'"
            >
              {{ errorCount ? `${errorCount} 项阻塞` : warnCount ? `${warnCount} 项提醒` : '全部通过' }}
            </span>
          </header>

          <div class="checklist">
            <button
              v-for="item in checks"
              :key="item.key"
              class="check-row"
              type="button"
              @click="scrollToTarget(item.target)"
            >
              <span class="check-row__dot" :class="`check-row__dot--${item.state}`">
                <AppIcon :name="checkIcon(item.state)" :size="11" />
              </span>
              <span class="check-row__text">
                <b>{{ item.label }}</b>
                <small>{{ item.detail }}</small>
              </span>
              <AppIcon name="chevronRight" :size="13" class="check-row__arrow" />
            </button>
          </div>

          <footer class="rail-card__foot">
            <span class="dot" :class="errorCount ? 'dot--err' : warnCount ? 'dot--warn' : 'dot--live'" />
            {{
              usingDemo
                ? '演示模式仅供预览，不能保存'
                : errorCount
                  ? '修正红色项目后即可保存'
                  : warnCount
                    ? '可以保存，但建议确认提醒项'
                    : '配置完整，可以保存到设备'
            }}
          </footer>
        </section>

        <section class="card rail-card">
          <header class="rail-card__head">
            <div>
              <h3><AppIcon name="link" :size="15" /> 链路预览</h3>
              <p>设备到 Broker 的当前连接参数</p>
            </div>
            <span class="mini-tag">{{ sslEnabled ? 'SSL' : 'TCP' }}</span>
          </header>

          <div class="linkmap">
            <div class="linkmap__node">
              <span class="linkmap__icon linkmap__icon--device"><AppIcon name="cpu" :size="18" /></span>
              <b>机巢</b>
              <small>Publisher</small>
            </div>
            <div class="linkmap__wire">
              <span>{{ sslEnabled ? 'SSL' : 'TCP' }}</span>
              <i />
            </div>
            <div class="linkmap__node">
              <span class="linkmap__icon linkmap__icon--broker"><AppIcon name="server" :size="18" /></span>
              <b>Broker</b>
              <small>{{ selectedVer?.text || '—' }}</small>
            </div>
          </div>

          <p class="preview-endpoint mono" :title="endpointText">{{ endpointText }}</p>

          <div class="preview-rows">
            <div><span>Client ID</span><b class="mono">{{ config.clientId || '—' }}</b></div>
            <div><span>心跳</span><b>{{ config.keepalive }} 秒</b></div>
            <div><span>QoS</span><b>{{ qosText }}</b></div>
            <div><span>认证</span><b>{{ authSummary }}</b></div>
            <div><span>证书模式</span><b>{{ sslEnabled ? selectedSsl?.text || '—' : '未启用' }}</b></div>
          </div>
        </section>

        <section class="card rail-card api-card">
          <header class="rail-card__head">
            <div>
              <h3><AppIcon name="terminal" :size="15" /> 接口说明</h3>
              <p>配置读取与保存使用独立请求</p>
            </div>
          </header>

          <div class="api-list">
            <div class="api-row">
              <span class="method method--get">GET</span>
              <code>/api/getMqtt</code>
              <small>读取</small>
            </div>
            <div class="api-row">
              <span class="method method--post">POST</span>
              <code>/api/setMqtt</code>
              <small>保存</small>
            </div>
          </div>

          <p class="api-note">
            <b>GET 返回：</b><code>host</code>、<code>qos</code>、<code>ver</code>、<code>ssl</code> 均为数组。<br />
            <b>POST 提交：</b><code>host</code>、<code>qos</code>、<code>ver</code> 原样提交；
            <code>ssl</code> 按接口文档转换为 <code>{ enable, list }</code>，其中 <code>list</code> 为数组。<br />
            返回 <code>code: 1</code> 表示写入成功。保存后设备将重新连接 Broker。
          </p>

          <div class="api-arrays">
            <div v-for="group in apiOptionGroups" :key="group.key" class="api-array">
              <div class="api-array__head">
                <code>{{ group.label }}</code>
                <span>{{ group.count }} 项</span>
              </div>
              <pre>{{ group.value }}</pre>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <AppConfirm
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-text="确认放弃"
      @update:open="confirmOpen = $event"
      @confirm="confirmPendingAction"
    />

    <BackToTopButton />
  </div>
</template>

<style scoped>
.mqtt {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.banner {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--danger) 22%, transparent);
  background: var(--danger-weak);
}

.banner__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--danger) 11%, #fff);
  color: var(--danger);
}

.banner__body {
  flex: 1;
  min-width: 0;
}

.banner__body strong,
.banner__body small {
  display: block;
}

.banner__body strong {
  font-size: 12.5px;
  color: var(--text);
}

.banner__body small {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
  word-break: break-all;
}

/* ---------- 顶部连接概览 ---------- */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 20px 24px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    radial-gradient(620px 360px at 88% -10%, rgba(87, 165, 255, 0.42), transparent 68%),
    linear-gradient(118deg, #102654 0%, #164394 46%, #1f6bff 100%);
  color: #fff;
  box-shadow: 0 24px 54px -30px rgba(20, 68, 160, 0.72);
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.22;
  background-image: radial-gradient(rgba(255, 255, 255, 0.5) 0.7px, transparent 0.7px);
  background-size: 18px 18px;
  mask-image: linear-gradient(90deg, transparent 18%, #000 72%);
}

.hero__glow {
  position: absolute;
  right: -90px;
  top: -130px;
  z-index: -1;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(121, 191, 255, 0.36), transparent 66%);
}

.hero__ring {
  position: absolute;
  right: 86px;
  bottom: -152px;
  z-index: -1;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow:
    0 0 0 34px rgba(255, 255, 255, 0.035),
    0 0 0 74px rgba(255, 255, 255, 0.022);
}

.hero__top,
.hero__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.hero__kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.13em;
  color: rgba(255, 255, 255, 0.72);
}

.hero__kicker svg {
  color: #9dd0ff;
}

.hero__kicker em {
  padding-left: 9px;
  border-left: 1px solid rgba(255, 255, 255, 0.18);
  font-family: inherit;
  font-style: normal;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.54);
}

.sync-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}

.sync-pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #75e8c0;
  box-shadow: 0 0 0 3px rgba(117, 232, 192, 0.13);
}

.sync-pill--dirty {
  border-color: rgba(255, 213, 128, 0.26);
  background: rgba(255, 192, 73, 0.13);
  color: #ffe6b8;
}

.sync-pill--dirty i {
  background: #ffd27d;
  box-shadow: 0 0 0 3px rgba(255, 210, 125, 0.14);
}

.sync-pill--error {
  border-color: rgba(255, 151, 160, 0.28);
  background: rgba(255, 91, 107, 0.15);
  color: #ffd5d9;
}

.sync-pill--error i {
  background: #ff8e99;
  box-shadow: 0 0 0 3px rgba(255, 142, 153, 0.14);
}

.sync-pill--demo {
  border-color: rgba(255, 213, 128, 0.3);
  background: rgba(255, 192, 73, 0.16);
  color: #ffe6b8;
}

.sync-pill--demo i {
  background: #ffd27d;
  box-shadow: 0 0 0 3px rgba(255, 210, 125, 0.14);
}

.hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(390px, 0.82fr);
  gap: 28px;
  align-items: end;
  margin-top: 17px;
}

.hero__lead {
  min-width: 0;
}

.hero__label {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.46);
}

.hero__endpoint {
  display: flex;
  align-items: baseline;
  gap: 0;
  min-width: 0;
  margin-top: 3px;
  font-family: var(--mono);
  font-size: 34px;
  font-weight: 750;
  line-height: 1.24;
  letter-spacing: -0.035em;
}

.hero__protocol {
  flex: 0 0 auto;
  color: #9fd2ff;
}

.hero__endpoint strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: inherit;
}

.hero__port {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.72em;
  font-weight: 650;
}

.hero__copy {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: 10px;
  align-self: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}

.hero__copy:hover {
  border-color: rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.hero__ids {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
  margin-top: 12px;
}

.hero__ids > span:not(.hero__divider) {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.hero__ids small {
  flex: 0 0 auto;
  font-family: var(--mono);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.42);
}

.hero__ids b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.78);
}

.hero__divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.14);
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.075);
  backdrop-filter: blur(7px);
}

.stat__icon {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.11);
  color: #b9ddff;
}

.stat > span:last-child {
  min-width: 0;
}

.stat small,
.stat b {
  display: block;
}

.stat small {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.46);
}

.stat b {
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.stat b em {
  margin-left: 4px;
  font-size: 9px;
  font-style: normal;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.43);
}

.hero__foot {
  margin-top: 16px;
  padding-top: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.11);
}

.hero__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.55);
}

.hero__hint svg {
  flex: 0 0 auto;
  color: #9fd2ff;
}

.hero__hint span {
  color: rgba(255, 255, 255, 0.27);
}

.hero__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(255, 255, 255, 0.19);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}

.hero-btn:hover:not([disabled]) {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.15);
}

.hero-btn--primary {
  border-color: #fff;
  background: #fff;
  color: #1552c6;
  box-shadow: 0 8px 20px -12px rgba(3, 20, 58, 0.7);
}

.hero-btn--primary:hover:not([disabled]) {
  border-color: #fff;
  background: #f3f8ff;
  color: #1248b7;
}

.hero-btn[disabled] {
  opacity: 0.44;
  cursor: not-allowed;
}

/* ---------- 加载 / 空态 ---------- */
.loading-card,
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 330px;
  padding: 36px 24px;
  border-radius: 22px;
  border: 1px solid var(--edge);
  background: var(--surface);
  box-shadow: var(--shadow-md);
  text-align: center;
}

.loading-card__ring {
  width: 34px;
  height: 34px;
  margin-bottom: 14px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-card strong {
  font-size: 14px;
}

.loading-card small {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 11px;
}

.empty-card__icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  margin-bottom: 15px;
  border-radius: 19px;
  background: var(--warning-weak);
  color: var(--warning);
}

.empty-card h2 {
  font-size: 18px;
  font-weight: 750;
}

.empty-card p {
  max-width: 520px;
  margin: 7px 0 18px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.7;
  word-break: break-all;
}

/* ---------- 工作区 ---------- */
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 354px;
  gap: 18px;
  align-items: start;
}

.editor,
.rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.card {
  scroll-margin-top: 18px;
  overflow: hidden;
  border: 1px solid var(--edge);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 21px 14px;
  border-bottom: 1px solid var(--border);
}

.card__index {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 10px;
  background: var(--primary-weak);
  color: var(--primary);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.card__title {
  flex: 1;
  min-width: 0;
}

.card__title h2 {
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.card__title p {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}

.card__tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 20px;
  background: var(--warning-weak);
  color: var(--warning);
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}

.card__tag--blue {
  background: var(--primary-weak);
  color: var(--primary);
}

.card__tag--muted {
  background: var(--surface-3);
  color: var(--text-3);
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 21px 21px;
}

.card__body .sect-label {
  margin-bottom: 10px;
}

.protocol-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.demo-host-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  margin-top: 10px;
}

.demo-host-list__label {
  font-size: 10px;
  font-weight: 700;
  color: var(--warning);
}

.demo-host-list code {
  padding: 4px 7px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 9px;
}

.protocol-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--border-strong);
  border-radius: 13px;
  background: linear-gradient(180deg, #fff, #fbfdff);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.protocol-card:hover {
  border-color: var(--border-glow);
  background: var(--surface-2);
}

.protocol-card.is-active {
  border-color: #78a9ff;
  background: linear-gradient(135deg, #f3f8ff, #e8f1ff);
  box-shadow: 0 8px 20px -16px rgba(31, 107, 255, 0.65);
}

.protocol-card__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 10px;
  background: var(--surface-3);
  color: var(--text-3);
}

.protocol-card.is-active .protocol-card__icon {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 4px 10px rgba(31, 107, 255, 0.1);
}

.protocol-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-right: 14px;
}

.protocol-card__text b {
  font-size: 12.5px;
  font-weight: 750;
}

.protocol-card__text small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: var(--text-3);
}

.protocol-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
}

.protocol-card.is-active .protocol-card__check {
  display: grid;
}

.endpoint-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 142px;
  gap: 14px;
}

.endpoint-input {
  display: flex;
  align-items: stretch;
  height: 38px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--surface);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.endpoint-input:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(31, 107, 255, 0.12);
}

.endpoint-input__prefix {
  display: flex;
  align-items: center;
  padding: 0 9px;
  border-right: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--primary);
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}

.endpoint-input input {
  flex: 1;
  min-width: 0;
  padding: 0 11px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
}

.endpoint-input input::placeholder {
  color: var(--text-4);
}

.two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field__optional {
  margin-left: 5px;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-4);
}

.keepalive {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
}

.keepalive__input {
  position: relative;
  display: block;
}

.keepalive__input .input {
  padding-right: 38px;
}

.keepalive__input em {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10.5px;
  font-style: normal;
  color: var(--text-4);
}

.keepalive__presets {
  display: flex;
  gap: 5px;
}

.quick-chip {
  height: 29px;
  padding: 0 9px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.quick-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.quick-chip.is-active {
  border-color: var(--primary);
  background: var(--primary-weak);
  color: var(--primary);
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.choice-card,
.qos-card,
.ssl-mode {
  position: relative;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.choice-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 13px;
}

.choice-card:hover,
.qos-card:hover,
.ssl-mode:hover:not([disabled]) {
  border-color: var(--border-glow);
  background: var(--surface-2);
}

.choice-card.is-active,
.qos-card.is-active,
.ssl-mode.is-active {
  border-color: #78a9ff;
  background: linear-gradient(135deg, #f4f8ff, #eaf2ff);
  box-shadow: 0 7px 18px -16px rgba(31, 107, 255, 0.6);
}

.choice-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.choice-card b,
.qos-card b,
.ssl-mode b {
  font-size: 12px;
  font-weight: 700;
}

.choice-card small,
.qos-card small,
.ssl-mode small {
  font-size: 10px;
  color: var(--text-3);
  line-height: 1.45;
}

.choice-card__radio {
  position: relative;
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border: 1.5px solid var(--border-strong);
  border-radius: 50%;
  background: #fff;
}

.choice-card.is-active .choice-card__radio,
.qos-card.is-active .choice-card__radio,
.ssl-mode.is-active .choice-card__radio {
  border-color: var(--primary);
}

.choice-card.is-active .choice-card__radio::after,
.qos-card.is-active .choice-card__radio::after,
.ssl-mode.is-active .choice-card__radio::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
}

.qos-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.qos-card {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px;
}

.qos-card__num {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border-radius: 8px;
  background: var(--surface-3);
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 800;
}

.qos-card.is-active .qos-card__num {
  background: var(--primary);
  color: #fff;
}

.qos-card__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.qos-card .choice-card__radio {
  position: absolute;
  top: 10px;
  right: 10px;
}

.inline-note,
.ssl-note,
.ssl-off-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 10.5px;
  line-height: 1.65;
}

.inline-note {
  border: 1px solid rgba(31, 107, 255, 0.12);
  background: var(--primary-weak);
  color: var(--text-2);
}

.inline-note svg,
.ssl-note svg,
.ssl-off-note svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--primary);
}

.inline-note b {
  color: var(--primary);
}

.input-wrap {
  position: relative;
  display: block;
}

.input-wrap .input {
  padding-right: 42px;
}

.input-wrap__btn {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-4);
  cursor: pointer;
}

.input-wrap__btn:hover {
  background: var(--surface-3);
  color: var(--text-2);
}

.ssl-switch {
  flex: 0 0 auto;
  font-size: 10.5px;
  font-weight: 650;
}

.ssl-body {
  display: flex;
  flex-direction: column;
  gap: 17px;
  transition: opacity 0.18s ease;
}

.ssl-body.is-disabled {
  opacity: 0.58;
  user-select: none;
}

.ssl-body.is-disabled .ssl-mode-grid {
  pointer-events: none;
}

.ssl-mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.ssl-mode {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
}

.ssl-mode__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 8px;
  background: var(--surface-3);
  color: var(--text-3);
}

.ssl-mode.is-active .ssl-mode__icon {
  background: #fff;
  color: var(--primary);
}

.ssl-mode > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 12px;
}

.ssl-mode .choice-card__radio {
  position: absolute;
  top: 9px;
  right: 9px;
}

.cert-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.cert-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  padding: 11px;
  border: 1px dashed var(--border-strong);
  border-radius: 12px;
  background: var(--surface-2);
}

.cert-card.is-missing {
  border-color: color-mix(in srgb, var(--warning) 55%, transparent);
  background: color-mix(in srgb, var(--warning-weak) 55%, var(--surface));
}

.cert-card__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.cert-card__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.cert-card__title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.cert-card__title b {
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}

.cert-card__title small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
  color: var(--text-3);
}

.cert-card__required {
  flex: 0 0 auto;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--warning-weak);
  color: var(--warning);
  font-size: 8px;
  font-weight: 700;
}

.cert-card__file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 7px 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 9.5px;
}

.cert-card:not(.is-missing) .cert-card__file {
  color: var(--text-3);
}

.cert-card__pick {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 27px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 9.5px;
  font-weight: 650;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.cert-card__pick:hover {
  border-color: var(--primary);
  background: var(--primary-weak);
  color: var(--primary);
}

.cert-card__pick.is-busy {
  opacity: 0.6;
  pointer-events: none;
}

.cert-card__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.ssl-note {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-3);
}

.ssl-off-note {
  border: 1px solid rgba(31, 107, 255, 0.12);
  background: var(--primary-weak);
  color: var(--text-2);
}

.editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 16px;
  border: 1px solid var(--edge);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(12px);
}

.editor-foot__state {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.editor-foot__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 9px;
}

.editor-foot__icon.is-dirty {
  background: var(--warning-weak);
  color: var(--warning);
}

.editor-foot__icon.is-saved {
  background: var(--success-weak);
  color: var(--success);
}

.editor-foot__state b,
.editor-foot__state small {
  display: block;
}

.editor-foot__state b {
  font-size: 11px;
  font-weight: 700;
}

.editor-foot__state small {
  margin-top: 1px;
  font-size: 9.5px;
  color: var(--text-3);
}

.editor-foot__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

/* ---------- 右侧栏 ---------- */
.rail-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 12px;
}

.rail-card__head h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 750;
}

.rail-card__head h3 svg {
  color: var(--primary);
}

.rail-card__head p {
  margin-top: 3px;
  font-size: 10.5px;
  color: var(--text-3);
}

.check-badge,
.mini-tag {
  display: inline-flex;
  align-items: center;
  height: 21px;
  padding: 0 8px;
  border-radius: 20px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}

.check-badge--pass {
  background: var(--success-weak);
  color: var(--success);
}

.check-badge--warn {
  background: var(--warning-weak);
  color: var(--warning);
}

.check-badge--error {
  background: var(--danger-weak);
  color: var(--danger);
}

.mini-tag {
  background: var(--primary-weak);
  color: var(--primary);
  font-family: var(--mono);
  letter-spacing: 0.05em;
}

.checklist {
  display: flex;
  flex-direction: column;
  padding: 0 8px 5px;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  padding: 9px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.check-row:hover {
  background: var(--surface-2);
}

.check-row__dot {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  flex: 0 0 19px;
  margin-top: 1px;
  border-radius: 50%;
}

.check-row__dot--pass {
  background: var(--success-weak);
  color: var(--success);
}

.check-row__dot--warn {
  background: var(--warning-weak);
  color: var(--warning);
}

.check-row__dot--fail {
  background: var(--danger-weak);
  color: var(--danger);
}

.check-row__text {
  flex: 1;
  min-width: 0;
}

.check-row__text b,
.check-row__text small {
  display: block;
}

.check-row__text b {
  font-size: 11.5px;
  font-weight: 700;
}

.check-row__text small {
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: var(--text-3);
}

.check-row__arrow {
  flex: 0 0 auto;
  margin-top: 4px;
  color: var(--text-4);
  opacity: 0.65;
}

.rail-card__foot {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px 13px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 10px;
}

.linkmap {
  display: grid;
  grid-template-columns: auto minmax(48px, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 5px 17px 14px;
}

.linkmap__node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 54px;
}

.linkmap__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 2px;
  border-radius: 13px;
}

.linkmap__icon--device {
  background: var(--primary-weak);
  color: var(--primary);
  box-shadow: inset 0 0 0 1px rgba(31, 107, 255, 0.1);
}

.linkmap__icon--broker {
  background: var(--accent-weak);
  color: var(--accent);
  box-shadow: inset 0 0 0 1px rgba(36, 194, 214, 0.13);
}

.linkmap__node b {
  font-size: 10.5px;
  font-weight: 700;
}

.linkmap__node small {
  font-family: var(--mono);
  font-size: 8.5px;
  color: var(--text-4);
}

.linkmap__wire {
  position: relative;
  height: 1px;
  border-top: 1px dashed var(--border-glow);
}

.linkmap__wire span {
  position: absolute;
  left: 50%;
  top: -8px;
  transform: translateX(-50%);
  padding: 0 5px;
  background: var(--surface);
  color: var(--text-4);
  font-family: var(--mono);
  font-size: 7.5px;
  font-weight: 700;
}

.linkmap__wire i {
  position: absolute;
  right: -1px;
  top: -3px;
  width: 5px;
  height: 5px;
  border-top: 1px solid var(--border-glow);
  border-right: 1px solid var(--border-glow);
  transform: rotate(45deg);
}

.preview-endpoint {
  margin: 0 16px 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 8px 9px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 10.5px;
  text-align: center;
}

.preview-rows {
  padding: 0 16px 13px;
}

.preview-rows > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-top: 1px dashed var(--border);
  font-size: 10.5px;
}

.preview-rows span {
  flex: 0 0 auto;
  color: var(--text-3);
}

.preview-rows b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
  font-size: 10.5px;
  font-weight: 650;
  text-align: right;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 14px 12px;
}

.api-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 9px;
  border-radius: 9px;
  background: var(--surface-2);
}

.method {
  display: grid;
  place-items: center;
  width: 37px;
  height: 19px;
  flex: 0 0 37px;
  border-radius: 5px;
  font-family: var(--mono);
  font-size: 8px;
  font-weight: 800;
}

.method--get {
  background: var(--primary-weak);
  color: var(--primary);
}

.method--post {
  background: var(--success-weak);
  color: var(--success);
}

.api-row code {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-2);
}

.api-row small {
  flex: 0 0 auto;
  font-size: 9px;
  color: var(--text-4);
}

.api-note {
  margin: 0 16px 16px;
  padding-top: 11px;
  border-top: 1px dashed var(--border);
  color: var(--text-3);
  font-size: 10.5px;
  line-height: 1.75;
}

.api-note code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 9.5px;
}

.api-arrays {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
}

.api-array {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-2);
}

.api-array__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 9px;
  border-bottom: 1px solid var(--border);
}

.api-array__head code {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--primary);
}

.api-array__head span {
  font-size: 9px;
  color: var(--text-4);
}

.api-array pre {
  max-height: 108px;
  margin: 0;
  padding: 8px 9px;
  overflow: auto;
  background: transparent;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 9px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 1360px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr) 326px;
  }

  .hero__grid {
    grid-template-columns: minmax(0, 1fr) minmax(350px, 0.8fr);
  }

  .hero__endpoint {
    font-size: 30px;
  }
}

@media (max-width: 1180px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .rail-card:first-child {
    grid-row: span 2;
  }
}

@media (max-width: 1060px) {
  .hero__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .hero__stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .stat {
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
  }

  .hero__endpoint {
    font-size: 34px;
  }
}

@media (max-width: 860px) {
  .hero {
    padding: 18px 18px 15px;
    border-radius: 20px;
  }

  .hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat {
    flex-direction: row;
    align-items: center;
    gap: 9px;
  }

  .stat__icon {
    width: 29px;
    height: 29px;
    flex-basis: 29px;
  }

  .hero__foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .protocol-grid,
  .qos-grid,
  .ssl-mode-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .cert-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-card:first-child {
    grid-row: auto;
  }

  .editor-foot {
    align-items: flex-start;
    flex-direction: column;
  }

  .editor-foot__actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 680px) {
  .hero__top {
    align-items: flex-start;
  }

  .hero__kicker em {
    display: none;
  }

  .hero__endpoint {
    flex-wrap: nowrap;
    font-size: 19px;
  }

  .hero__ids {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .hero__divider {
    display: none;
  }

  .hero__ids > span:not(.hero__divider) {
    max-width: 100%;
  }

  .endpoint-row,
  .two-col {
    grid-template-columns: minmax(0, 1fr);
  }

  .endpoint-row__port {
    max-width: 180px;
  }

  .keepalive {
    grid-template-columns: minmax(0, 1fr);
  }

  .keepalive__presets {
    flex-wrap: wrap;
  }

  .choice-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .card__head,
  .card__body {
    padding-right: 16px;
    padding-left: 16px;
  }
}

</style>
