/** 调试/配置相关的本地演示数据：结构与现场「机巢」界面保持一致 */

export interface AxisDef {
  key: string
  label: string
}

export interface PresetDef {
  id: number
  label: string
  targets: number[]
}

export interface ModuleDef {
  key: string
  name: string
  deviceNo: string
  type: string
  port: string
  unit: string
  group: 'axis' | 'end' | 'door'
  axes: AxisDef[]
  presets: PresetDef[]
  speed: number
  mode: 'position' | 'speed' | 'servo'
}

/** 轴 / 末端 / 舱门三类模块，组合模块带多个轴 */
export const MODULES: ModuleDef[] = [
  {
    key: 'xz',
    name: '模组 X 轴',
    deviceNo: 'xz',
    type: '伺服电机',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'axis',
    axes: [{ key: 'xz', label: 'xz' }],
    presets: [
      { id: 0, label: '睡眠位', targets: [0] },
      { id: 1, label: '初始位', targets: [480629] },
      { id: 2, label: '换电池位', targets: [396420] },
      { id: 3, label: '最小整舱位', targets: [480630] },
    ],
    speed: 6,
    mode: 'servo',
  },
  {
    key: 'yz',
    name: '模组 Y 轴',
    deviceNo: 'yz',
    type: '伺服电机',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'axis',
    axes: [{ key: 'yz', label: 'yz' }],
    presets: [
      { id: 0, label: '睡眠位', targets: [0] },
      { id: 1, label: '初始位', targets: [101] },
      { id: 2, label: '换电池位', targets: [0] },
    ],
    speed: 7,
    mode: 'servo',
  },
  {
    key: 'zz',
    name: '模组 Z 轴',
    deviceNo: 'zz',
    type: '伺服电机',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'axis',
    axes: [{ key: 'zz', label: 'zz' }],
    presets: [
      { id: 0, label: '睡眠位', targets: [0] },
      { id: 1, label: '初始位', targets: [16220] },
      { id: 2, label: '取电高度', targets: [12000] },
    ],
    speed: 8,
    mode: 'servo',
  },
  {
    key: 'ax',
    name: '整个模组',
    deviceNo: 'ax',
    type: '组合',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'axis',
    axes: [
      { key: 'xz', label: 'xz' },
      { key: 'yz', label: 'yz' },
      { key: 'zz', label: 'zz' },
    ],
    presets: [
      { id: 0, label: '睡眠位', targets: [0, 0, 0] },
      { id: 1, label: '初始位', targets: [480629, 101, 16220] },
    ],
    speed: 6,
    mode: 'servo',
  },
  {
    key: 'j',
    name: '模组夹爪',
    deviceNo: 'j',
    type: '舵机',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'end',
    axes: [{ key: 'j_pos', label: 'j' }],
    presets: [
      { id: 0, label: '初始位', targets: [76] },
      { id: 1, label: '夹紧', targets: [420] },
      { id: 2, label: '松开', targets: [60] },
    ],
    speed: 9,
    mode: 'servo',
  },
  {
    key: 'ds',
    name: '夹爪舵机',
    deviceNo: 'j',
    type: '舵机 R003D',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'end',
    axes: [{ key: 'd_pos', label: 'd' }],
    presets: [
      { id: 0, label: '初始位', targets: [1116] },
      { id: 1, label: '张开', targets: [1600] },
    ],
    speed: 9,
    mode: 'servo',
  },
  {
    key: 'qcm',
    name: '舱门（组合）',
    deviceNo: 'qcm',
    type: 'H 桥',
    port: '/dev/ttyAMA2',
    unit: '脉冲',
    group: 'door',
    axes: [
      { key: 'qcm_pos', label: '前' },
      { key: 'hcm_pos', label: '后' },
    ],
    presets: [
      { id: 0, label: '关闭位', targets: [0, 0] },
      { id: 1, label: '打开位', targets: [121, 121] },
    ],
    speed: 5,
    mode: 'position',
  },
  {
    key: 'qcm1',
    name: '前舱门',
    deviceNo: 'qcm',
    type: 'H 桥',
    port: '/dev/ttyAMA2',
    unit: '脉冲',
    group: 'door',
    axes: [{ key: 'qcm_pos', label: 'qcm' }],
    presets: [
      { id: 0, label: '关闭位', targets: [0] },
      { id: 1, label: '打开位', targets: [121] },
    ],
    speed: 5,
    mode: 'position',
  },
  {
    key: 'hcm',
    name: '后舱门',
    deviceNo: 'hcm',
    type: 'H 桥',
    port: '/dev/ttyAMA2',
    unit: '脉冲',
    group: 'door',
    axes: [{ key: 'hcm_pos', label: 'hcm' }],
    presets: [
      { id: 0, label: '关闭位', targets: [0] },
      { id: 1, label: '打开位', targets: [121] },
    ],
    speed: 5,
    mode: 'position',
  },
  {
    key: 'gz',
    name: '全部规整（组合）',
    deviceNo: 'gz',
    type: '组合',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'door',
    axes: [
      { key: 'dh_pos', label: '前后' },
      { key: 'zy_pos', label: '左右' },
    ],
    presets: [
      { id: 0, label: '收回位', targets: [0, 0] },
      { id: 1, label: '规整位', targets: [101, 103] },
    ],
    speed: 10,
    mode: 'servo',
  },
  {
    key: 'dh',
    name: '前后规整',
    deviceNo: 'dh',
    type: '舵机',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'door',
    axes: [{ key: 'dh_pos', label: 'dh' }],
    presets: [
      { id: 0, label: '收回位', targets: [0] },
      { id: 1, label: '规整位', targets: [101] },
    ],
    speed: 10,
    mode: 'servo',
  },
  {
    key: 'zy',
    name: '左右规整',
    deviceNo: 'zy',
    type: '舵机',
    port: '/dev/ttyAMA0',
    unit: '脉冲',
    group: 'door',
    axes: [{ key: 'zy_pos', label: 'zy' }],
    presets: [
      { id: 0, label: '收回位', targets: [0] },
      { id: 1, label: '规整位', targets: [103] },
    ],
    speed: 11,
    mode: 'servo',
  },
  {
    key: 'db',
    name: '挡板',
    deviceNo: 'db',
    type: '舵机 R003D',
    port: '/dev/ttyAMA9',
    unit: '脉冲',
    group: 'door',
    axes: [{ key: 'db_pos', label: 'db' }],
    presets: [
      { id: 0, label: '收回位', targets: [0] },
      { id: 1, label: '工作位', targets: [2942] },
    ],
    speed: 2,
    mode: 'servo',
  },
]

export const INITIAL_POSITIONS: Record<string, number> = {
  xz: 480629,
  yz: 101,
  zz: 16220,
  j_pos: 76,
  d_pos: 1116,
  qcm_pos: 121,
  hcm_pos: 0,
  dh_pos: 101,
  zy_pos: 103,
  db_pos: 2942,
}

export interface SignalDef {
  name: string
  value: string | number
  kind?: 'bool' | 'num'
}

/** 顶部模块状态矩阵：24 个关键信号 */
export const SIGNALS: SignalDef[] = [
  { name: 'isGripHaveBattery', value: 'false', kind: 'bool' },
  { name: 'isRepairOpen', value: 'false', kind: 'bool' },
  { name: 'isStop', value: 'false', kind: 'bool' },
  { name: 'istawReg', value: 'false', kind: 'bool' },
  { name: 'xz_pos', value: 480629, kind: 'num' },
  { name: 'yz_pos', value: 101, kind: 'num' },
  { name: 'zz_pos', value: 16220, kind: 'num' },
  { name: 'xz_status', value: 20482, kind: 'num' },
  { name: 'yz_status', value: 20482, kind: 'num' },
  { name: 'zz_status', value: 20482, kind: 'num' },
  { name: 'j_pos', value: 76, kind: 'num' },
  { name: 'd_pos', value: 1116, kind: 'num' },
  { name: 'dh_pos', value: 101, kind: 'num' },
  { name: 'zy_pos', value: 103, kind: 'num' },
  { name: 'db_pos', value: 2942, kind: 'num' },
  { name: 'qcm_pos', value: 121, kind: 'num' },
  { name: 'hcm_pos', value: 0, kind: 'num' },
  { name: 'd_servoMode', value: 1, kind: 'num' },
  { name: 'frontCmOpen', value: 'false', kind: 'bool' },
  { name: 'backCmOpen', value: 'false', kind: 'bool' },
  { name: 'frontCmClose', value: 'true', kind: 'bool' },
  { name: 'backCmClose', value: 'true', kind: 'bool' },
  { name: 'green', value: 'true', kind: 'bool' },
  { name: 'red', value: 'false', kind: 'bool' },
]

export interface CoordGroup {
  label: string
  items: { axis: string; value: string }[]
}

/** 功能调试右侧的坐标板 */
export const COORD_GROUPS: CoordGroup[] = [
  {
    label: '初始位置',
    items: [
      { axis: 'xz', value: '480629' },
      { axis: 'yz', value: '101' },
      { axis: 'zz', value: '16220' },
    ],
  },
  {
    label: '最小整舱',
    items: [
      { axis: 'xz', value: '480630' },
      { axis: 'yz', value: '101' },
      { axis: 'zz', value: '16220' },
    ],
  },
  {
    label: '换电池',
    items: [
      { axis: 'xz', value: '480629' },
      { axis: 'yz', value: '101' },
    ],
  },
  {
    label: '舱门（组合）',
    items: [
      { axis: 'qm', value: '未配' },
      { axis: 'hm', value: '未配' },
    ],
  },
  {
    label: '全部规整',
    items: [{ axis: 'gz', value: '前 101 / 后 101' }],
  },
  {
    label: '左右规整',
    items: [{ axis: 'zy', value: '103' }],
  },
  {
    label: '前后规整',
    items: [{ axis: 'dh', value: '101' }],
  },
  {
    label: '挡板',
    items: [{ axis: 'db', value: '2942' }],
  },
]

export interface RegisterDef {
  address: string
  fields: { name: string; range: string }[]
}

export interface SerialDevice {
  key: string
  name: string
  port: string
  baud: number
  poll: number
  publish: number
  topic: string
  important: boolean
  registers: RegisterDef[]
}

export const SERIAL_DEVICES: SerialDevice[] = [
  {
    key: 'aircondition',
    name: 'aircondition',
    port: '/dev/ttyAMA3',
    baud: 9600,
    poll: 4000,
    publish: 10,
    topic: 'local/p/dronebox/{id}/sensor',
    important: false,
    registers: [
      {
        address: '01D300000001840A',
        fields: [
          { name: 'acTempz', range: '6-10' },
          { name: 'acCoolSet', range: '6-10' },
          { name: 'acCoolSen', range: '10-14' },
          { name: 'acHotSet', range: '14-18' },
          { name: 'acHotSen', range: '18-22' },
        ],
      },
    ],
  },
  {
    key: 'currentSensor',
    name: 'currentSensor',
    port: '1-1',
    baud: 9600,
    poll: 8000,
    publish: 10,
    topic: 'local/p/dronebox/{id}/sensor',
    important: true,
    registers: [
      {
        address: '01D30000001840A',
        fields: [
          { name: 'chargeCurrent1', range: '6-10' },
          { name: 'chargeCurrent2', range: '8-10' },
        ],
      },
    ],
  },
  {
    key: 'battery',
    name: 'battery',
    port: '1-1',
    baud: 9600,
    poll: 8000,
    publish: 10,
    topic: 'local/p/dronebox/{id}/powerSupply',
    important: false,
    registers: [
      {
        address: 'DDA50300FFDD77',
        fields: [
          { name: 'tonavol', range: '8-12' },
          { name: 'cur', range: '12-16' },
          { name: 'cycleCnt', range: '24-28' },
          { name: 'rsoc', range: '46-48' },
        ],
      },
    ],
  },
  {
    key: 'selfboard',
    name: 'selfboard',
    port: '/dev/ttyAMA0',
    baud: 115200,
    poll: 300,
    publish: 1,
    topic: 'dronebox/debug/sensor',
    important: true,
    registers: [
      {
        address: '55562066',
        fields: [
          { name: 'xz_pos', range: '6-14' },
          { name: 'xz_status', range: '14-18' },
          { name: 'yz_pos', range: '20-28' },
          { name: 'yz_status', range: '28-32' },
          { name: 'zz_pos', range: '34-42' },
          { name: 'zz_status', range: '42-46' },
          { name: 'j_pos', range: '48-56' },
          { name: 'j_status', range: '56-60' },
        ],
      },
    ],
  },
  {
    key: 'duoji',
    name: 'duoji',
    port: '/dev/ttyAMA2',
    baud: 115200,
    poll: 300,
    publish: 1,
    topic: 'dronebox/{id}/sensor',
    important: true,
    registers: [
      {
        address: 'FFFD1040238D2E',
        fields: [
          { name: 'd_pos', range: '10-14' },
          { name: 'd_servoMode', range: '10-12' },
          { name: 'd_direct', range: '12-14' },
        ],
      },
    ],
  },
  {
    key: 'weather',
    name: 'weather',
    port: '1-1',
    baud: 9600,
    poll: 2000,
    publish: 10,
    topic: 'dronebox/{id}/sensor',
    important: false,
    registers: [
      {
        address: '01030000001840A',
        fields: [
          { name: 'outWind', range: '6-10' },
          { name: 'outWindDir', range: '6-10' },
          { name: 'rainfall', range: '6-10' },
          { name: 'outHumidity', range: '6-10' },
          { name: 'outTemp', range: '10-14' },
        ],
      },
    ],
  },
]

export interface ControlConfig {
  key: string
  name: string
  topic: string
  port: string
  type: string
  register: string
}

export const CONTROL_CONFIGS: ControlConfig[] = [
  {
    key: 'powerOnRCbyPI',
    name: 'powerOnRCbyPI',
    topic: 'dronebox/{id}/droneRc/cmd',
    port: '/dev/ttyAMA0',
    type: '1',
    register: 'do1_1',
  },
  {
    key: 'transmission',
    name: 'transmission',
    topic: 'dronebox/{id}/ac/TC2000/cmd',
    port: '3-1',
    type: '2',
    register: '0',
  },
  {
    key: 'contactor',
    name: 'contactor',
    topic: 'dronebox/{id}/contactor/cmd',
    port: '/dev/ttyAMA0',
    type: '0',
    register: 'do6_4',
  },
]

/* ---------- 日志样例 ---------- */

const HEX = '5A5A6C4C01600000D0B0000D500440013840AC0010A0A0D9F0E'

export interface LogItem {
  id: number
  time: string
  level: 'DEBUG' | 'INFO' | 'WARN'
  text: string
}

let logSeed = 0

export function makeLog(level: LogItem['level'], text: string): LogItem {
  const d = new Date()
  const time = d.toLocaleTimeString('zh-CN', { hour12: false })
  logSeed += 1
  return { id: logSeed, time, level, text }
}

export function seedLogs(): LogItem[] {
  const base = [
    { level: 'INFO' as const, text: `[xz] /dev/ttyAMA0 → ${HEX}` },
    { level: 'DEBUG' as const, text: '解析报文 64 字节，校验通过' },
    { level: 'INFO' as const, text: `[yz] /dev/ttyAMA0 → ${HEX}` },
    { level: 'DEBUG' as const, text: 'xz_pos = 480629 / yz_pos = 101 / zz_pos = 16220' },
    { level: 'WARN' as const, text: '未找到舵机位置 [d]，使用上一次缓存值 1116' },
    { level: 'INFO' as const, text: `[selfboard] 轮询间隔 300ms，本周期 2 帧` },
  ]
  return base.map((item) => makeLog(item.level, item.text))
}
