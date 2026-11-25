import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { sendCommand } from '@/api/endpoints'
import type { ControlCmd } from '@/api/types'
import { useToast } from '@/composables/toast'

export interface CommandDef {
  cmd: ControlCmd
  label: string
  desc: string
  group: 'flow' | 'single'
  icon: string
  /** 会改变飞行器/整机状态，需要二次确认 */
  danger?: boolean
}

/** 命令目录：仅包含接口文档明确支持的 /api/functionDebug 命令 */
export const COMMANDS: CommandDef[] = [
  {
    cmd: 'requestLand',
    label: '请求降落（升起）',
    desc: '无飞机时升起停机坪，准备接收飞行器',
    group: 'flow',
    icon: 'arrowUp',
  },
  {
    cmd: 'takeoffClosing',
    label: '请求关闭（下降）',
    desc: '无飞机时下降停机坪，收起舱体',
    group: 'flow',
    icon: 'arrowDown',
  },
  {
    cmd: 'requestTakeoff',
    label: '请求起飞',
    desc: '有飞机时升起停机坪并松开起落架',
    group: 'flow',
    icon: 'takeoff',
    danger: true,
  },
  {
    cmd: 'requestLandClose',
    label: '请求降落（归中）',
    desc: '有飞机时归中并下降，完成回收',
    group: 'flow',
    icon: 'landing',
    danger: true,
  },
  {
    cmd: 'errRest',
    label: '伺服复位',
    desc: '清除各伺服器错误代码，恢复可动作状态',
    group: 'single',
    icon: 'reset',
  },
  {
    cmd: 'replace',
    label: '更换电池',
    desc: '机械臂执行一次电池更换动作',
    group: 'single',
    icon: 'battery',
  },
  {
    cmd: 'undercartRelease',
    label: '起落架释放',
    desc: '释放停机坪起落架锁定',
    group: 'single',
    icon: 'unlock',
    danger: true,
  },
  {
    cmd: 'undercartFixed',
    label: '起落架固定',
    desc: '锁定停机坪起落架',
    group: 'single',
    icon: 'lock',
  },
  {
    cmd: 'power',
    label: '开关机一次',
    desc: '对舱内设备执行一次断电重启',
    group: 'single',
    icon: 'power',
    danger: true,
  },
  {
    cmd: 'fingerOpen',
    label: '指尖打开',
    desc: '打开夹爪指尖',
    group: 'single',
    icon: 'expand',
  },
  {
    cmd: 'fingerClose',
    label: '指尖闭合',
    desc: '闭合夹爪指尖',
    group: 'single',
    icon: 'collapse',
  },
  {
    cmd: 'matchStart',
    label: '开始对频',
    desc: '进入遥控器对频状态',
    group: 'single',
    icon: 'radio',
  },
  {
    cmd: 'rcOpen',
    label: '打开遥控器',
    desc: '开启舱内遥控器电源',
    group: 'single',
    icon: 'signal',
  },
  {
    cmd: 'rcClose',
    label: '关闭遥控器',
    desc: '关闭舱内遥控器电源',
    group: 'single',
    icon: 'signalOff',
  },
  {
    cmd: 'lightOff',
    label: '关闭灯光',
    desc: '按接口文档关闭机巢灯光',
    group: 'single',
    icon: 'sun',
  },
  {
    cmd: 'uavPower',
    label: '无人机开 / 关机',
    desc: '切换无人机电源状态，执行前确认现场安全',
    group: 'single',
    icon: 'power',
    danger: true,
  },
  {
    cmd: 'liveOn',
    label: '开始推流',
    desc: '通过功能调试命令启动视频推流',
    group: 'single',
    icon: 'play',
  },
  {
    cmd: 'liveOff',
    label: '结束推流',
    desc: '通过功能调试命令停止视频推流',
    group: 'single',
    icon: 'pause',
  },
  {
    cmd: 'clear',
    label: '清除错误',
    desc: '清除设备错误状态',
    group: 'single',
    icon: 'reset',
    danger: true,
  },
]

export interface CommandLog {
  id: number
  cmd: ControlCmd
  label: string
  at: number
  status: 'running' | 'success' | 'fail'
  message?: string
}

export const useControlStore = defineStore('control', () => {
  const logs = ref<CommandLog[]>([])
  const running = reactive(new Set<ControlCmd>())
  const toast = useToast()
  let seed = 0

  const lastSuccessAt = computed(() => {
    const hit = logs.value.find((log) => log.status === 'success')
    return hit?.at ?? 0
  })

  async function execute(cmd: ControlCmd, label: string): Promise<boolean> {
    if (running.has(cmd)) return false
    running.add(cmd)
    const id = ++seed
    const log: CommandLog = { id, cmd, label, at: Date.now(), status: 'running' }
    logs.value.unshift(log)
    if (logs.value.length > 60) logs.value.pop()

    try {
      await sendCommand({ cmd, data: {} })
      log.status = 'success'
      log.message = '指令已下发'
      toast.success(`${label} 已下发`, '设备将在数秒内响应，可在态势页观察状态变化')
      return true
    } catch (error) {
      log.status = 'fail'
      log.message = error instanceof Error ? error.message : '下发失败'
      toast.apiError(`${label} 下发失败`, error, log.message)
      return false
    } finally {
      running.delete(cmd)
    }
  }

  function isRunning(cmd: ControlCmd): boolean {
    return running.has(cmd)
  }

  function clearLogs(): void {
    logs.value = []
  }

  return { logs, running, lastSuccessAt, execute, isRunning, clearLogs }
})
