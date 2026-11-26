import { call, unwrap } from './client'
import { camMockEnabled, MOCK_CAMERAS } from './mock'
import type {
  ApiResult,
  AxisError,
  CameraConfigPayload,
  CameraInfo,
  DebugPayload,
  MqttConfig,
  MqttConfigPayload,
  PlcConfig,
  ReadRegisterPayload,
  ReadRegisterResult,
  RunStatus,
  StreamResult,
  SystemInfo,
  WriteRegisterPayload,
} from './types'

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
})

function normalizeRunStatus(value: Partial<RunStatus> & Record<string, unknown>): RunStatus {
  return {
    ac: Number(value.ac ?? 0),
    battery: Array.isArray(value.battery) ? value.battery as RunStatus['battery'] : [],
    door: Number(value.door ?? 0),
    emgStop: Number(value.emgStop ?? 0),
    lastAction: String(value.lastAction ?? ''),
    lastActionSrc: String(value.lastActionSrc ?? ''),
    lastActionTime: (value.lastActionTime ?? '') as string | number,
    dockUptime: String(value.dockUptime ?? ''),
    greenLed: Number(value.greenLed ?? 0),
    haveUav: Number(value.haveUav ?? 0),
    innerHumidity: Number(value.innerHumidity ?? value.Humidity ?? 0),
    innerTemp: Number(value.innerTemp ?? value.Temperature ?? 0),
    lift: Number(value.lift ?? 0),
    light: Number(value.light ?? 0),
    outHumidity: Number(value.outHumidity ?? 0),
    outTemp: Number(value.outTemp ?? 0),
    outWind: Number(value.outWind ?? 0),
    outWindDir: Number(value.outWindDir ?? 0),
    rainfall: Number(value.rainfall ?? 0),
    rc: Number(value.rc ?? 0),
    redLed: Number(value.redLed ?? 0),
    cpuUsege: String(value.cpuUsege ?? ''),
    diskFree: String(value.diskFree ?? ''),
    memFree: String(value.memFree ?? ''),
    workStatus: Number(value.workStatus ?? 0),
    workMsg: String(value.workMsg ?? ''),
    yellowLed: Number(value.yellowLed ?? 0),
  }
}

export async function fetchRunStatus(): Promise<RunStatus> {
  const payload = await call<unknown>('/api/getRunStatus', { method: 'GET' })
  const data = payload && typeof payload === 'object' && 'data' in payload
    ? unwrap<Partial<RunStatus> & Record<string, unknown>>(payload)
    : payload as Partial<RunStatus> & Record<string, unknown>
  return normalizeRunStatus(data ?? {})
}

export async function fetchPlcErrors(): Promise<AxisError[]> {
  const payload = await call<unknown>('/api/getPlcErr', { method: 'GET' })
  const data = unwrap<AxisError[] | Record<string, unknown>>(payload)
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const listKey = Object.keys(data).find((key) => Array.isArray(data[key]))
    if (listKey) return data[listKey] as AxisError[]
  }
  return []
}

export async function sendFunctionCommand(payload: DebugPayload): Promise<void> {
  const response = await call<unknown>('/api/functionDebug', json(payload))
  if (response !== undefined) unwrap(response)
}

export async function fetchSystem(): Promise<SystemInfo> {
  const payload = await call<unknown>('/api/getSystem', { method: 'GET' })
  return unwrap<SystemInfo>(payload)
}

export async function fetchPlc(): Promise<PlcConfig> {
  const payload = await call<unknown>('/api/getPlc', { method: 'GET' })
  return unwrap<PlcConfig>(payload)
}

export async function savePlc(payload: PlcConfig): Promise<void> {
  const response = await call<ApiResult>('/api/setPlc', json({ ip: payload.ip, port: Number(payload.port) }))
  unwrap(response)
}

export async function fetchMqtt(): Promise<MqttConfig> {
  const payload = await call<unknown>('/api/getMqtt', { method: 'GET' })
  return unwrap<MqttConfig>(payload)
}

export async function saveMqtt(payload: MqttConfig): Promise<void> {
  const request: MqttConfigPayload = {
    host: payload.host,
    addr: payload.addr,
    port: Number(payload.port),
    clientId: payload.clientId,
    qos: payload.qos,
    keepalive: Number(payload.keepalive),
    serverId: payload.serverId,
    user: payload.user,
    passwd: payload.passwd,
    ver: payload.ver,
    cert: payload.cert,
    ssl: {
      enable: payload.sslEnable,
      list: payload.ssl,
    },
  }
  const response = await call<ApiResult>('/api/setMqtt', json(request))
  unwrap(response)
}

export async function uploadCert(num: number, text: string): Promise<void> {
  const response = await call<ApiResult>('/api/uploadCert', json([{ num, text }]))
  unwrap(response)
}

function normalizeMediaUrl(value?: string): string {
  const text = (value ?? '').trim()
  if (!text) return ''
  const markdown = text.match(/\]\((https?:\/\/[^)]+)\)/)
  if (markdown) return markdown[1]
  return text.replace(/\\:\/\//g, '://')
}

export async function fetchCameras(): Promise<CameraInfo[]> {
  if (camMockEnabled()) {
    return MOCK_CAMERAS.map((camera) => ({ ...camera }))
  }
  const payload = await call<unknown>('/api/getCamera', { method: 'GET' })
  const data = unwrap<CameraInfo[] | { camera?: CameraInfo[] }>(payload)
  const cameras = Array.isArray(data) ? data : data?.camera ?? []
  return cameras.map((camera) => {
    const raw = camera as unknown as {
      id: unknown
      name: string
      disabled?: unknown
      rtsp?: string
      flv?: string
      isPushing?: unknown
      isPublishing?: unknown
    }
    const pushing = raw.isPushing ?? raw.isPublishing
    return {
      id: Number(raw.id),
      name: raw.name ?? '',
      disabled: Number(raw.disabled ?? 0),
      rtsp: normalizeMediaUrl(raw.rtsp),
      flv: normalizeMediaUrl(raw.flv),
      isPushing: pushing === true || pushing === 1 || pushing === '1' || pushing === 'true',
    }
  })
}

export async function saveCameras(list: CameraInfo[]): Promise<void> {
  if (camMockEnabled()) return
  const request: CameraConfigPayload[] = list.map(({ id, name, disabled, rtsp }) => ({
    id,
    name,
    disabled,
    rtsp,
  }))
  const response = await call<ApiResult>('/api/setCamera', json(request))
  unwrap(response)
}

export async function startStream(ids: number[]): Promise<StreamResult[]> {
  if (camMockEnabled()) {
    return ids.map((id) => ({ id, result: 1 }))
  }
  const payload = await call<unknown>('/api/startStream', json(ids))
  return unwrap<StreamResult[]>(payload) ?? []
}

export async function stopStream(ids: number[]): Promise<StreamResult[]> {
  if (camMockEnabled()) {
    return ids.map((id) => ({ id, result: 1 }))
  }
  const payload = await call<unknown>('/api/stopStream', json(ids.map((id) => ({ id }))))
  return unwrap<StreamResult[]>(payload) ?? []
}

export async function readRegisters(payload: ReadRegisterPayload): Promise<ReadRegisterResult> {
  const response = await call<ReadRegisterResult>('/api/testRead', json(payload))
  unwrap(response)
  return response
}

export async function writeRegisters(payload: WriteRegisterPayload): Promise<void> {
  const response = await call<ApiResult>('/api/testWrite', json(payload))
  unwrap(response)
}

export async function setSystem(reportInterval: number): Promise<void> {
  const response = await call<ApiResult>('/api/setSystem', json({ reportInterval }))
  unwrap(response)
}

export async function reboot(isSystem = 0): Promise<void> {
  const response = await call<ApiResult>('/api/reboot', json({ isSystem }))
  unwrap(response)
}

export async function stepDebug(payload: DebugPayload): Promise<ApiResult<Record<string, unknown>>> {
  const response = await call<ApiResult<Record<string, unknown>>>('/api/stepDebug', json(payload))
  unwrap(response)
  return response
}

export async function jobDebug(): Promise<ApiResult> {
  const payload = await call<unknown>('/api/jobDebug', json({}))
  if (payload === undefined) return { code: 1, msg: '请求已提交' }
  unwrap(payload)
  return payload as ApiResult
}

/** 文档仅给出路径，响应字段未定义；保留原始 JSON 供调试查看。 */
export async function fetchAxisPosition(): Promise<unknown> {
  const payload = await call<unknown>('/api/getAxisPosition', { method: 'GET' })
  return payload && typeof payload === 'object' && 'code' in payload ? unwrap(payload) : payload
}
