<script setup lang="ts">
import { computed, ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import { fetchAxisPosition, jobDebug, stepDebug } from '@/api/endpoints'
import type { DebugPayload } from '@/api/types'
import { useToast } from '@/composables/toast'

const toast = useToast()
const command = ref('armToHome')
const dataText = ref('{}')
const busy = ref(false)
const loadingAxes = ref(false)
const axisPosition = ref('')
const pending = ref<'step' | 'job' | null>(null)
const lastResponse = ref('')
const confirmTitle = computed(() => pending.value === 'job' ? '确认执行点动调试？' : '确认下发单步指令？')

function parseStepPayload(): DebugPayload | null {
  if (!command.value.trim()) {
    toast.warning('请填写单步调试命令')
    return null
  }
  try {
    const data: unknown = JSON.parse(dataText.value)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      toast.warning('data 必须是 JSON 对象，例如 {}')
      return null
    }
    return { cmd: command.value.trim(), data: data as Record<string, unknown> }
  } catch {
    toast.warning('data 不是有效的 JSON')
    return null
  }
}

function askStep(): void {
  if (parseStepPayload()) pending.value = 'step'
}

function askJob(): void {
  pending.value = 'job'
}

async function loadAxisPosition(): Promise<void> {
  loadingAxes.value = true
  try {
    const payload = await fetchAxisPosition()
    axisPosition.value = JSON.stringify(payload, null, 2)
    toast.success('轴坐标已读取', '已取得 /api/getAxisPosition 响应')
  } catch (error) {
    toast.error('读取轴坐标失败', error instanceof Error ? error.message : '请检查设备连接')
  } finally {
    loadingAxes.value = false
  }
}

async function confirmRun(): Promise<void> {
  const action = pending.value
  if (!action) return
  pending.value = null
  busy.value = true
  try {
    if (action === 'step') {
      const payload = parseStepPayload()
      if (!payload) return
      const response = await stepDebug(payload)
      lastResponse.value = JSON.stringify(response, null, 2)
      toast.success('单步指令已下发', response.msg || payload.cmd)
    } else {
      const response = await jobDebug()
      lastResponse.value = JSON.stringify(response, null, 2)
      toast.success('点动调试请求已下发', response.msg || '接口返回成功')
    }
  } catch (error) {
    toast.error('调试请求失败', error instanceof Error ? error.message : '请检查设备连接')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">单步调试</h2>
          <p class="panel__sub">POST /api/stepDebug · 按文档提交 cmd 与 data</p>
        </div>
        <span class="tag tag--info">接口已接入</span>
      </header>
      <div class="panel__body form">
        <label class="field">
          <span class="field__label">调试命令</span>
          <input v-model="command" class="input mono" placeholder="例如 armToHome" />
        </label>
        <label class="field">
          <span class="field__label">data（JSON 对象）</span>
          <textarea v-model="dataText" class="input mono json-input" spellcheck="false" />
        </label>
        <button class="btn btn--primary" type="button" :disabled="busy" @click="askStep">
          <AppIcon name="play" :size="14" /> 下发单步指令
        </button>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">点动调试</h2>
          <p class="panel__sub">POST /api/jobDebug · 接口文档定义请求体为 {}</p>
        </div>
        <span class="tag tag--warning">运动操作</span>
      </header>
      <div class="panel__body job">
        <p>此接口文档尚未定义点动方向、目标轴或停止命令；当前仅按文档发送空对象请求。</p>
        <button class="btn btn--danger" type="button" :disabled="busy" @click="askJob">
          <AppIcon name="move" :size="14" /> 执行点动接口
        </button>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">轴坐标</h2>
          <p class="panel__sub">GET /api/getAxisPosition · 文档未定义响应字段，保留原始结果</p>
        </div>
        <button class="btn btn--sm btn--ghost" type="button" :disabled="loadingAxes" @click="loadAxisPosition">
          <AppIcon :name="loadingAxes ? 'refresh' : 'target'" :size="13" :class="{ spin: loadingAxes }" />
          读取坐标
        </button>
      </header>
      <pre class="response mono">{{ axisPosition || '尚未读取' }}</pre>
    </section>

    <section v-if="lastResponse" class="panel">
      <header class="panel__head">
        <h2 class="panel__title">最近接口响应</h2>
      </header>
      <pre class="response mono">{{ lastResponse }}</pre>
    </section>

    <AppConfirm
      :open="pending !== null"
      :title="confirmTitle"
      message="调试命令可能直接影响机构动作，请核对参数与设备现场。"
      detail="设备接口未提供执行进度或撤销能力；确认设备处于安全状态后再继续。"
      confirm-text="确认下发"
      danger
      :busy="busy"
      @update:open="(value) => !value && (pending = null)"
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

@media (max-width: 760px) {
  .form { grid-template-columns: minmax(0, 1fr); }
  .job { align-items: flex-start; flex-direction: column; }
}
</style>
