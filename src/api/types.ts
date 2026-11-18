export interface ApiResult<T = unknown> {
  code: number
  msg: string
  data?: T
}

export interface OptionItem {
  num: number
  text: string
  isSelected: number
}

export interface BatterySlot {
  num: number
  exist: number
}

export interface RunStatus {
  ac: number
  battery: BatterySlot[]
  door: number
  emgStop: number
  haveUav: number
  innerHumidity: number
  innerTemp: number
  lift: number
  light: number
  outHumidity: number
  outTemp: number
  outWind: number
  outWindDir: number
  rainfall: number
  rc: number
  workStatus: number
}

export interface AxisError {
  id: number
  name: string
  axisPowerErr: string
  axisStatusErr: string
  servoErrorErr: string
  servoAxisErr: string
}

export interface PlcConfig {
  ip: string
  port: number | string
}

export interface SystemInfo {
  deviceId: string
  ver: string
}

export interface CameraInfo {
  id: number
  name: string
  rtsp: string
  isPushing: boolean
  disabled: number
}

export interface CameraConfigPayload {
  id: number
  name: string
  disabled: number
  rtsp: string
}

export interface CertConfig {
  caFile: string
  certFile: string
  keyFile: string
}

export interface MqttConfig {
  deviceId?: string
  host: OptionItem[]
  addr: string
  port: number
  clientId: string
  qos: OptionItem[]
  keepalive: number
  serverId?: string
  user: string
  passwd: string
  ver: OptionItem[]
  cert: CertConfig
  ssl: OptionItem[]
  sslEnable: number
}

export interface MqttConfigPayload extends Omit<MqttConfig, 'deviceId' | 'ssl' | 'sslEnable'> {
  ssl: {
    enable: number
    list: OptionItem[]
  }
}

export interface ReadRegisterPayload {
  registerId: number
  count: number
  functionCode?: number
}

export interface ReadRegisterResult {
  code: number
  msg: string
  value: number[]
}

export interface WriteRegisterPayload {
  registerId: number
  values: number[]
  functionCode?: number | string
}

/** /api/functionDebug 文档明确列出的命令 */
export type ControlCmd =
  | 'requestLand'
  | 'takeoffClosing'
  | 'requestTakeoff'
  | 'requestLandClose'
  | 'errRest'
  | 'replace'
  | 'undercartRelease'
  | 'undercartFixed'
  | 'power'
  | 'fingerOpen'
  | 'fingerClose'
  | 'matchStart'
  | 'rcOpen'
  | 'rcClose'
  | 'liveOff'
  | 'lightOff'
  | 'uavPower'
  | 'liveOn'
  | 'clear'

export interface CmdPayload {
  cmd: ControlCmd
  data?: Record<string, unknown>
}

export interface DebugPayload {
  cmd: string
  data: Record<string, unknown>
}

export interface StreamResult {
  id: number
  result: number | boolean
  rtsp?: string
  rtmp?: string
  ws?: string
  http?: string
}

export type RuntimeMode = 'live' | 'offline'
