/**
 * 机巢状态页演示数据（假数据）
 * 后续接入真实接口时，只需把这里的字段替换为接口返回值即可，页面无需改动。
 */

export interface NestNavItem {
  label: string
  route: string
  icon: string
}

export interface NestNavGroup {
  label: string
  icon: string
  route?: string
  items?: NestNavItem[]
}

export interface NestFlowCard {
  id: string
  badge: string
  currentCount: number
  currentName: string
  controls: string[]
  commandRows: string[][]
}

export const nestStatusMock = {
  device: {
    online: true,
    onlineText: '设备在线',
    address: '192.168.12.1:7810',
    channel: '#dash',
    notifications: 2,
    avatar: 'A',
  },

  /** 顶部三张概览卡 */
  summary: {
    nest: { title: '机巢状态', state: '正常运行', uptime: '12h 36min' },
    plc: { title: 'PLC', online: true, onlineText: '在线', lastComm: '1分钟前' },
    info: { title: '基本信息', code: 'MC-2025-001', version: 'v1.0.0' },
  },

  /** 概览卡下方的设备状态条 */
  statusStrip: [
    { id: 'nest', icon: 'drone', lines: ['机巢状态：-', 'A机舱：-', 'B机舱：-'] },
    { id: 'door', icon: 'door', lines: ['舱门：-', 'A停机坪：-', 'B停机坪：-'] },
    { id: 'flip', icon: 'flip', lines: ['翻转：-'] },
    { id: 'module', icon: 'grid', lines: ['模组：-（-）'] },
  ],

  /** 设备控制 */
  deviceControls: {
    power: {
      title: '电源',
      on: true,
      onText: '已开启',
      offText: '已关闭',
      primaryLabel: '关闭电源',
      secondaryLabel: '开启电源',
    },
    fan: {
      title: '风扇',
      on: true,
      onText: '已开启',
      offText: '已关闭',
      onLabel: '开启风扇',
      offLabel: '关闭风扇',
    },
    battery: {
      title: '电池',
      activeSlot: 0,
      slots: ['电池仓1', '电池仓2', '电池仓3', '电池仓4'],
    },
    steps: {
      title: '单步控制',
      actions: ['开舱门', '关舱门', '规整', '松开规整', '翻转停机坪'],
    },
  },

  /** 流程控制：A 面 / B 面 */
  flows: [
    {
      id: 'A',
      badge: 'A面',
      currentCount: 0,
      currentName: '--',
      controls: ['暂停任务', '中止任务', '恢复任务'],
      commandRows: [
        ['请求起飞', '请求关闭（起飞）', '请求降落', '请求准备关闭（降落）'],
        ['请求关闭（降落）', '请求重新起飞'],
      ],
    },
    {
      id: 'B',
      badge: 'B面',
      currentCount: 0,
      currentName: '--',
      controls: ['暂停任务', '中止任务', '恢复任务'],
      commandRows: [
        ['请求起飞', '请求关闭（起飞）', '请求降落', '请求准备关闭（降落）'],
        ['请求关闭（降落）', '请求重新起飞'],
      ],
    },
  ] satisfies NestFlowCard[],

  /** 侧栏导航：与设计稿分组一致，链接到已有页面 */
  nav: [
    { label: '机巢', icon: 'homeSolid', route: 'overview' },
    {
      label: '配置',
      icon: 'configSolid',
      items: [
        { label: '串口', icon: 'navSerial', route: 'config-serial' },
        { label: '控制', icon: 'navControl', route: 'config-control' },
        { label: '摄像头', icon: 'navCamera', route: 'config-camera' },
        { label: 'PLC', icon: 'navPlc', route: 'config-plc' },
        { label: 'MQTT', icon: 'navMqtt', route: 'config-mqtt' },
      ],
    },
    {
      label: '测试',
      icon: 'gearSolid',
      items: [
        { label: '功能调试', icon: 'wrench', route: 'debug-func' },
        { label: '模拟调试', icon: 'stack', route: 'debug-module' },
        { label: '模块参数', icon: 'navParams', route: 'module-params' },
      ],
    },
    { label: '系统', icon: 'power', route: 'system' },
  ] satisfies NestNavGroup[],
}
