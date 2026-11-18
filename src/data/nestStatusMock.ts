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
    nest: { title: '机巢状态', state: '正常运行（写死数据）', uptime: '12h 36min（写死数据）' },
    plc: { title: 'PLC', online: true, onlineText: '在线（写死数据）', lastComm: '1分钟前（写死数据）' },
    info: { title: '基本信息' },
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
      onText: '已开启（写死数据）',
      offText: '已关闭',
      primaryLabel: '关闭电源',
      secondaryLabel: '开启电源',
    },
    fan: {
      title: '压缩机',
      on: true,
      onText: '已开启',
      offText: '已关闭',
      onLabel: '开启压缩机',
      offLabel: '关闭压缩机',
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

  /** 侧栏导航：与设计稿分组一致，链接到已有页面 */
  nav: [
    { label: '机巢', icon: 'homeSolid', route: 'overview' },
    {
      label: '配置',
      icon: 'configSolid',
      items: [
        { label: '摄像头', icon: 'navCamera', route: 'config-camera' },
        { label: 'PLC', icon: 'navPlc', route: 'config-plc' },
        { label: 'MQTT', icon: 'navMqtt', route: 'config-mqtt' },
      ],
    },
    {
      label: '调试',
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
