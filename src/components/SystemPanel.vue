<script setup lang="ts">
import { computed, ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import { reboot, setSystem } from '@/api/endpoints'
import { useToast } from '@/composables/toast'
import { useControlStore } from '@/stores/control'
import { useNestStore } from '@/stores/nest'

type PendingKind = 'reset' | 'rebootSoft' | 'rebootSys' | null

const toast = useToast()
const nestStore = useNestStore()
const controlStore = useControlStore()

const reportInterval = ref(30)
const savingSystem = ref(false)
const pending = ref<PendingKind>(null)
const busyConfirm = ref(false)

const axisRows = computed(() =>
  nestStore.plcErrors.map((axis) => {
    const codes = [axis.axisPowerErr, axis.axisStatusErr, axis.servoErrorErr, axis.servoAxisErr]
    return { ...axis, codes, failed: codes.some((code) => code && code !== '0') }
  }),
)

const faultCount = computed(() => axisRows.value.filter((row) => row.failed).length)

const confirmMeta = computed(() => {
  switch (pending.value) {
    case 'reset':
      return {
        title: '复位伺服错误',
        message: '清除所有伺服轴的错误代码并解除报警',
        detail: '复位前请确认故障已排除，否则再次动作可能触发相同错误。',
        confirmText: '执行复位',
        danger: false,
      }
    case 'rebootSoft':
      return {
        title: '重启软件',
        message: '机巢控制软件将重启，期间无法接收指令',
        detail: '重启过程约 10–30 秒，视频推流会中断。',
        confirmText: '确认重启',
        danger: true,
      }
    case 'rebootSys':
      return {
        title: '重启工控机',
        message: '整机操作系统将重启，所有服务停止',
        detail: '这是最高级别的运维操作，请确认现场无人作业。',
        confirmText: '确认重启系统',
        danger: true,
      }
    default:
      return { title: '', message: '', detail: '', confirmText: '确认', danger: false }
  }
})

async function handleSaveSystem(): Promise<void> {
  if (reportInterval.value < 5 || reportInterval.value > 3600) {
    toast.warning('上报间隔需在 5–3600 秒之间')
    return
  }
  savingSystem.value = true
  try {
    await setSystem(reportInterval.value)
    toast.success('系统参数已保存', `上报间隔 ${reportInterval.value} 秒`)
  } catch (error) {
    toast.apiError('保存失败', error, '请稍后重试')
  } finally {
    savingSystem.value = false
  }
}

async function confirmRun(): Promise<void> {
  busyConfirm.value = true
  const kind = pending.value
  try {
    if (kind === 'reset') {
      await controlStore.execute('errRest', '伺服复位')
      await nestStore.refreshErrors()
    } else if (kind === 'rebootSoft') {
      await reboot(0)
      toast.success('软件重启指令已下发', '设备将短暂离线')
    } else if (kind === 'rebootSys') {
      await reboot(1)
      toast.success('系统重启指令已下发', '设备将离线 1–2 分钟')
    }
  } catch (error) {
    toast.apiError('操作失败', error, '请稍后重试')
  } finally {
    busyConfirm.value = false
    pending.value = null
  }
}
</script>

<template>
  <div class="sys">
    <article class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">伺服轴诊断</h2>
          <p class="panel__sub">6 轴 × 4 类错误码 · 0 表示正常</p>
        </div>
        <div class="head-tags">
          <span class="tag" :class="faultCount ? 'tag--danger' : 'tag--success'">
            {{ faultCount ? `${faultCount} 轴异常` : '全部正常' }}
          </span>
          <button class="btn btn--sm" type="button" @click="pending = 'reset'">
            <AppIcon name="reset" :size="12" />
            一键复位
          </button>
        </div>
      </header>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>轴号</th>
              <th>轴名称</th>
              <th>使能错误</th>
              <th>状态错误</th>
              <th>伺服错误</th>
              <th>伺服轴错误</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="axis in axisRows" :key="axis.id">
              <td class="mono dim">{{ String(axis.id).padStart(2, '0') }}</td>
              <td>{{ axis.name }}</td>
              <td v-for="(code, index) in axis.codes" :key="index" class="mono" :class="{ 'is-bad': code !== '0' }">
                {{ code }}
              </td>
              <td>
                <span class="tag" :class="axis.failed ? 'tag--danger' : 'tag--success'">
                  {{ axis.failed ? '异常' : '正常' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <article class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">系统运维</h2>
          <p class="panel__sub">上报频率与运行控制</p>
        </div>
        <span class="tag tag--muted mono">setSystem / reboot</span>
      </header>

      <div class="panel__body system">
        <div class="system__row">
          <div class="system__info">
            <strong>数据上报间隔</strong>
            <p>传感器与机巢状态定时上传的时间间隔，单位为秒</p>
          </div>
          <div class="system__control">
            <input
              v-model.number="reportInterval"
              class="input mono system__input"
              type="number"
              min="5"
              max="3600"
            />
            <span class="system__unit">秒</span>
            <button class="btn btn--primary" type="button" :disabled="savingSystem" @click="handleSaveSystem">
              <AppIcon :name="savingSystem ? 'refresh' : 'check'" :size="13" :class="{ spin: savingSystem }" />
              保存
            </button>
          </div>
        </div>

        <div class="system__row">
          <div class="system__info">
            <strong>重启软件</strong>
            <p>仅重启机巢控制软件，操作系统保持运行</p>
          </div>
          <button class="btn" type="button" @click="pending = 'rebootSoft'">
            <AppIcon name="power" :size="13" />
            重启软件
          </button>
        </div>

        <div class="system__row system__row--danger">
          <div class="system__info">
            <strong>重启工控机系统</strong>
            <p>重启整机操作系统，所有服务停止，约 1–2 分钟恢复</p>
          </div>
          <button class="btn btn--danger" type="button" @click="pending = 'rebootSys'">
            <AppIcon name="power" :size="13" />
            重启系统
          </button>
        </div>
      </div>
    </article>

    <AppConfirm
      :open="pending !== null"
      :title="confirmMeta.title"
      :message="confirmMeta.message"
      :detail="confirmMeta.detail"
      :confirm-text="confirmMeta.confirmText"
      :danger="confirmMeta.danger"
      :busy="busyConfirm"
      @update:open="(value) => !value && (pending = null)"
      @confirm="confirmRun"
    />
  </div>
</template>

<style scoped>
.sys {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.head-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dim {
  color: var(--text-4);
}

.is-bad {
  color: var(--danger);
}

.system {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.system__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.system__row:last-child {
  border-bottom: none;
}

.system__info strong {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text);
}

.system__info p {
  font-size: var(--fs-xs);
  color: var(--text-3);
  margin-top: 2px;
}

.system__control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system__input {
  width: 84px;
}

.system__unit {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.system__row--danger {
  margin: 0 -16px -16px;
  padding: 14px 16px;
  background: var(--danger-weak);
  border-top: 1px solid color-mix(in srgb, var(--danger) 22%, transparent);
  border-bottom: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
</style>
