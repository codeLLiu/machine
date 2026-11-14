<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import { fetchAxisPosition, fetchRunStatus, jobDebug, stepDebug } from '@/api/endpoints'
import type { DebugPayload, RunStatus } from '@/api/types'
import { useToast } from '@/composables/toast'

interface StepCommand {
  cmd: string
  label: string
  desc: string
  precondition?: string
  icon: string
}

interface StepGroup {
  key: string
  title: string
  commands: StepCommand[]
}

interface DebugLog {
  id: number
  cmd: string
  label: string
  at: number
  status: 'running' | 'success' | 'fail'
  message?: string
}

const STEP_GROUPS: StepGroup[] = [
  {
    key: 'pad',
    title: '停机坪',
    commands: [
      { cmd: 'liftUp', label: '停机坪升起', desc: '将停机坪升起，作为换电流程起始动作', icon: 'arrowUp' },
      { cmd: 'center', label: '归中', desc: '执行一次归中动作', precondition: '停机坪需停在上方', icon: 'target' },
      { cmd: 'propeller', label: '收桨', desc: 'M400 执行一次收桨', precondition: '需等归中结束', icon: 'reset' },
    ],
  },
  {
    key: 'arm',
    title: '机械臂移动',
    commands: [
      { cmd: 'armToHome', label: '回到 Home 点', desc: '机械臂移动至 Home 点', icon: 'landing' },
      { cmd: 'armHomeToZero', label: 'Home → 工作区原点', desc: '从 Home 点推出至工作区原点', precondition: '机械臂需在 Home 点', icon: 'arrowRight' },
      { cmd: 'armWorkToZero', label: '工作区 → 工作区原点', desc: '从工作区回到工作区原点', precondition: '机械臂需在工作区', icon: 'arrowDown' },
      { cmd: 'armToBattery1', label: '电池仓 1', desc: '移动至电池仓 1 号位', precondition: '如不在原点，先手动回工作原点', icon: 'battery' },
      { cmd: 'armToBattery2', label: '电池仓 2', desc: '移动至电池仓 2 号位', precondition: '如不在原点，先手动回工作原点', icon: 'battery' },
      { cmd: 'armToBattery3', label: '电池仓 3', desc: '移动至电池仓 3 号位', precondition: '如不在原点，先手动回工作原点', icon: 'battery' },
      { cmd: 'armToUav', label: 'M400 上方', desc: '移动至 M400 上方', precondition: '如不在原点，先手动回工作原点', icon: 'takeoff' },
    ],
  },
  {
    key: 'jaw',
    title: '夹爪操作',
    commands: [
      { cmd: 'jawGrabFromBattSlot', label: '从电池仓抓取', desc: '夹爪下探抓起电池仓内的电池', precondition: '机械臂需已到电池仓上方', icon: 'battery' },
      { cmd: 'jawReleaseToBattSlot', label: '放入电池仓', desc: '夹爪下探把电池放入电池仓', precondition: '机械臂需已到电池仓上方', icon: 'battery' },
      { cmd: 'jawGrabFromUav', label: '抓取 M400 电池', desc: '夹爪下探抓起 M400 的电池', precondition: '机械臂需已到无人机上方', icon: 'battery' },
      { cmd: 'jawReleaseToUav', label: '放入 M400', desc: '夹爪下探把电池放回 M400', precondition: '机械臂需已到无人机上方', icon: 'battery' },
    ],
  },
  {
    key: 'uav',
    title: '无人机电池',
    commands: [
      { cmd: 'jawUavPower', label: '无人机电池长按 3 秒', desc: '用于 M400 开机 / 关机', precondition: '机械臂需已到无人机上方', icon: 'power' },
      { cmd: 'jawUavMatch', label: '无人机电池长按 5 秒', desc: '用于 M400 电池对频', precondition: '如不在原点，先手动回工作原点', icon: 'radio' },
    ],
  },
]

const toast = useToast()
const busy = ref(false)
const loadingStatus = ref(false)
const advancedOpen = ref(false)

const runStatus = ref<RunStatus | null>(null)
const axisPosition = ref('')
const gripHasBattery = ref<boolean | null>(null)
const statusError = ref('')

const pendingStep = ref<StepCommand | null>(null)
const pendingJob = ref(false)
const pendingManual = ref(false)
const manualCmd = ref('')
const manualData = ref('{}')

const logs = ref<DebugLog[]>([])
let logSeed = 0

const statusItems = computed(() => {
  const liftTextMap: Record<number, string> = {
    10: '已降落',
    11: '升起中',
    20: '已升起',
    21: '下降中',
  }
  const batteryText = runStatus.value?.battery?.length
    ? runStatus.value.battery.map((item) => item.exist ? `${item.num + 1}有` : `${item.num + 1}空`).join(' / ')
    : '—'

  return [
    { label: '无人机在舱', value: runStatus.value ? (runStatus.value.haveUav ? '有' : '无') : '—' },
    { label: '停机坪', value: runStatus.value ? (liftTextMap[runStatus.value.lift] ?? '未知') : '—' },
    { label: '夹爪电池', value: gripHasBattery.value === null ? '未知' : gripHasBattery.value ? '已夹取' : '空爪' },
    { label: '电池槽', value: batteryText },
  ]
})

const pendingDetail = computed(() => {
  const command = pendingStep.value
  if (pendingJob.value) {
    return '接口文档尚未定义点动方向、目标轴或停止方式；请确认现场安全后再继续。'
  }
  if (pendingManual.value) {
    return '自定义命令会直接提交到 /api/stepDebug，请核对命令与参数。'
  }
  if (command?.cmd === 'jawUavPower') {
    return '该动作会对 M400 电池按键长按 3 秒，可能导致无人机开 / 关机。'
  }
  if (command?.cmd === 'jawUavMatch') {
    return '该动作会对 M400 电池按键长按 5 秒，用于电池对频。'
  }
  return '该指令会直接影响机构动作，请先核对现场安全状态。'
})

const pendingMessage = computed(() => {
  if (pendingStep.value) {
    const precondition = pendingStep.value.precondition ? `前提：${pendingStep.value.precondition}。` : ''
    return `${pendingStep.value.desc}。${precondition}`
  }
  if (pendingJob.value) return '将按当前接口约定提交空对象到 /api/jobDebug。'
  return '将提交自定义命令到 /api/stepDebug。'
})

function findBooleanKey(source: unknown, key: string): boolean | null {
  if (!source || typeof source !== 'object') return null
  const record = source as Record<string, unknown>
  if (key in record) {
    const value = record[key]
    if (typeof value === 'boolean') return value
    if (value === 1 || value === '1' || value === 'true') return true
    if (value === 0 || value === '0' || value === 'false') return false
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const result = findBooleanKey(value, key)
      if (result !== null) return result
    }
  }
  return null
}

function appendLog(command: string, label: string, status: DebugLog['status'], message?: string): void {
  logs.value.unshift({ id: ++logSeed, cmd: command, label, at: Date.now(), status, message })
  if (logs.value.length > 60) logs.value.pop()
}

async function loadStatus(): Promise<void> {
  loadingStatus.value = true
  statusError.value = ''
  try {
    runStatus.value = await fetchRunStatus()
    const axisPayload = await fetchAxisPosition()
    axisPosition.value = JSON.stringify(axisPayload, null, 2)
    gripHasBattery.value = findBooleanKey(axisPayload, 'isGripHaveBattery')
  } catch (error) {
    statusError.value = error instanceof Error ? error.message : '请检查设备连接'
    toast.error('读取状态失败', statusError.value)
  } finally {
    loadingStatus.value = false
  }
}

function askStep(command: StepCommand): void {
  pendingStep.value = command
}

function askJob(): void {
  pendingJob.value = true
}

function askManual(): void {
  if (!manualCmd.value.trim()) {
    toast.warning('请填写自定义命令')
    return
  }
  try {
    const data: unknown = JSON.parse(manualData.value)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      toast.warning('data 必须是 JSON 对象，例如 {}')
      return
    }
    pendingManual.value = true
  } catch {
    toast.warning('data 不是有效的 JSON')
  }
}

function closePending(): void {
  pendingStep.value = null
  pendingJob.value = false
  pendingManual.value = false
}

async function confirmRun(): Promise<void> {
  const stepCommand = pendingStep.value
  const isJob = pendingJob.value
  const isManual = pendingManual.value
  closePending()
  busy.value = true

  try {
    if (stepCommand) {
      const payload: DebugPayload = { cmd: stepCommand.cmd, data: {} }
      appendLog(payload.cmd, stepCommand.label, 'running')
      const response = await stepDebug(payload)
      appendLog(payload.cmd, stepCommand.label, 'success', response.msg || '指令已下发')
      toast.success(`${stepCommand.label} 已下发`, response.msg || payload.cmd)
    } else if (isJob) {
      appendLog('__job__', '点动调试', 'running')
      const response = await jobDebug()
      appendLog('__job__', '点动调试', 'success', response.msg || '请求已提交')
      toast.success('点动调试已下发', response.msg || '接口返回成功')
    } else if (isManual) {
      const payload: DebugPayload = {
        cmd: manualCmd.value.trim(),
        data: JSON.parse(manualData.value) as Record<string, unknown>,
      }
      appendLog(payload.cmd, payload.cmd, 'running')
      const response = await stepDebug(payload)
      appendLog(payload.cmd, payload.cmd, 'success', response.msg || '指令已下发')
      toast.success('自定义命令已下发', response.msg || payload.cmd)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请检查设备连接'
    if (stepCommand) appendLog(stepCommand.cmd, stepCommand.label, 'fail', message)
    else if (isJob) appendLog('__job__', '点动调试', 'fail', message)
    else if (isManual) appendLog(manualCmd.value.trim(), manualCmd.value.trim(), 'fail', message)
    toast.error('调试请求失败', message)
  } finally {
    busy.value = false
  }
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  void loadStatus()
})
</script>

<template>
  <div class="page">
    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">单步调试状态</h2>
          <p class="panel__sub">运行状态来自 /api/getRunStatus，夹爪电池按 isGripHaveBattery 间接判断</p>
        </div>
        <button class="btn btn--sm btn--ghost" type="button" :disabled="loadingStatus" @click="loadStatus">
          <AppIcon :name="loadingStatus ? 'refresh' : 'target'" :size="13" :class="{ spin: loadingStatus }" />
          刷新状态
        </button>
      </header>
      <div class="panel__body">
        <div class="status-strip">
          <div v-for="item in statusItems" :key="item.label" class="status-cell">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <p v-if="statusError" class="status-error">{{ statusError }}</p>
      </div>
    </section>

    <section v-for="group in STEP_GROUPS" :key="group.key" class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">{{ group.title }}</h2>
          <p class="panel__sub">POST /api/stepDebug · 按业务前提确认后执行</p>
        </div>
        <span class="tag tag--muted">{{ group.commands.length }} 项</span>
      </header>
      <div class="commands">
        <button
          v-for="command in group.commands"
          :key="command.cmd"
          class="command"
          type="button"
          :disabled="busy"
          @click="askStep(command)"
        >
          <AppIcon :name="command.icon" :size="16" />
          <span class="command__copy">
            <strong>{{ command.label }}</strong>
            <small>{{ command.desc }}</small>
            <small v-if="command.precondition" class="precondition">前提：{{ command.precondition }}</small>
          </span>
        </button>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">自定义命令</h2>
          <p class="panel__sub">用于接口后续新增命令时的手动提交入口</p>
        </div>
        <button class="btn btn--sm btn--ghost" type="button" @click="advancedOpen = !advancedOpen">
          {{ advancedOpen ? '收起' : '展开' }}
        </button>
      </header>
      <div v-if="advancedOpen" class="panel__body form">
        <label class="field">
          <span class="field__label">调试命令</span>
          <input v-model="manualCmd" class="input mono" placeholder="例如 armToHome" />
        </label>
        <label class="field">
          <span class="field__label">data（JSON 对象）</span>
          <textarea v-model="manualData" class="input mono json-input" spellcheck="false" />
        </label>
        <button class="btn btn--primary" type="button" :disabled="busy" @click="askManual">
          <AppIcon name="play" :size="14" /> 提交自定义命令
        </button>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">点动调试</h2>
          <p class="panel__sub">POST /api/jobDebug · 当前按文档提交空对象</p>
        </div>
        <span class="tag tag--warning">待补充参数</span>
      </header>
      <div class="panel__body job">
        <p>接口文档尚未定义点动方向、目标轴、速度或停止命令；当前仅发送 {} 请求，等待接口补充后再扩展。</p>
        <button class="btn btn--danger" type="button" :disabled="busy" @click="askJob">
          <AppIcon name="move" :size="14" /> 执行点动接口
        </button>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">轴坐标</h2>
          <p class="panel__sub">GET /api/getAxisPosition · 接口开发当中</p>
        </div>
        <button class="btn btn--sm btn--ghost" type="button" :disabled="loadingStatus" @click="loadStatus">
          <AppIcon :name="loadingStatus ? 'refresh' : 'target'" :size="13" :class="{ spin: loadingStatus }" />
          读取坐标
        </button>
      </header>
      <pre v-if="axisPosition" class="response mono">{{ axisPosition }}</pre>
      <p v-else class="response developing">接口开发当中，暂无可读取数据</p>
    </section>

    <section class="panel log">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">本次会话操作记录</h2>
          <p class="panel__sub">已记录 {{ logs.length }} 条下发结果</p>
        </div>
        <button v-if="logs.length" class="btn btn--sm btn--ghost" type="button" @click="logs = []">
          清空记录
        </button>
      </header>
      <div class="log__list">
        <div v-if="!logs.length" class="empty">暂无操作记录</div>
        <div v-for="log in logs" :key="log.id" class="log__item" :class="`log__item--${log.status}`">
          <span class="log__dot" />
          <div class="log__body">
            <div class="log__head">
              <strong>{{ log.label }}</strong>
              <span class="log__time mono">{{ formatTime(log.at) }}</span>
            </div>
            <p class="log__meta"><span class="mono">{{ log.cmd }}</span><span>{{ log.message ?? '等待响应' }}</span></p>
          </div>
        </div>
      </div>
    </section>

    <AppConfirm
      :open="pendingStep !== null || pendingJob || pendingManual"
      :title="pendingStep?.label ?? (pendingJob ? '执行点动调试' : '提交自定义命令')"
      :message="pendingMessage"
      :detail="pendingDetail"
      confirm-text="确认下发"
      danger
      :busy="busy"
      @update:open="(value) => !value && closePending()"
      @confirm="confirmRun"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.status-cell {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.status-cell span {
  display: block;
  color: var(--text-3);
  font-size: var(--fs-xs);
}

.status-cell strong {
  margin-top: 4px;
  color: var(--text);
  font-size: var(--fs-sm);
}

.status-error {
  margin-top: 10px;
  color: var(--danger);
  font-size: var(--fs-xs);
}

.commands {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 16px;
}

.command {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 76px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-1) ease, background var(--dur-1) ease;
}

.command:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-weak);
}

.command:disabled {
  opacity: 0.55;
  cursor: wait;
}

.command > svg:first-child {
  color: var(--danger);
}

.command__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.command__copy strong {
  color: var(--text);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.command__copy small {
  color: var(--text-3);
  font-size: var(--fs-xs);
  line-height: 1.5;
}

.precondition {
  color: var(--warning);
}

.form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
  align-items: end;
  gap: 14px;
}

.form > .btn {
  justify-self: start;
}

.json-input {
  min-height: 92px;
  resize: vertical;
}

.job {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.job p {
  color: var(--text-3);
  font-size: var(--fs-sm);
  line-height: 1.7;
}

.response {
  max-height: 300px;
  overflow: auto;
  margin: 0;
  padding: 14px 16px;
  color: var(--text-2);
  font-size: var(--fs-xs);
  white-space: pre-wrap;
}

.response.developing {
  color: var(--text-3);
  background: var(--surface-2);
}

.log__list {
  max-height: 300px;
  overflow-y: auto;
  padding: 6px 14px 14px;
}

.empty {
  padding: 28px 10px;
  color: var(--text-4);
  text-align: center;
  font-size: var(--fs-sm);
}

.log__item {
  display: flex;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
}

.log__item:hover {
  background: var(--surface-2);
}

.log__dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--warning);
}

.log__item--success .log__dot { background: var(--success); }
.log__item--fail .log__dot { background: var(--danger); }

.log__body { flex: 1; min-width: 0; }
.log__head { display: flex; justify-content: space-between; gap: 10px; }
.log__head strong { color: var(--text); font-size: var(--fs-sm); font-weight: 550; }
.log__time { color: var(--text-4); font-size: var(--fs-xs); }
.log__meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 3px; color: var(--text-3); font-size: var(--fs-xs); }

@media (max-width: 760px) {
  .status-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .commands { grid-template-columns: minmax(0, 1fr); }
  .form { grid-template-columns: minmax(0, 1fr); }
  .job { align-items: flex-start; flex-direction: column; }
}
</style>
