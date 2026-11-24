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
    nest: { title: '机巢状态' },
    plc: {
      title: 'PLC',
    },
    info: { title: '基本信息' },
  },

  /** 设备控制 */
  deviceControls: {
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
      slots: [
        { label: '电池仓1', online: true },
        { label: '电池仓2', online: true },
        { label: '电池仓3', online: true },
        { label: '电池仓4', online: true },
        { label: '电池仓5', online: true },
        { label: '电池仓6', online: true },
      ],
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
