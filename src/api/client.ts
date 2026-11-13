const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const TIMEOUT = 8000

export class ApiError extends Error {
  code: number

  constructor(message: string, code = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT)
  let response: Response

  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查设备连接')
    }
    throw new ApiError('无法连接设备接口，请检查网络和接口服务')
  } finally {
    window.clearTimeout(timer)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ApiError(body || `请求失败（HTTP ${response.status}）`, response.status)
  }

  const text = await response.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('接口响应不是合法的 JSON')
  }
}

export function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  return raw<T>(path, init)
}

/** 校验文档约定的 code=1 成功，并读取可选的 data 信封。 */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (typeof record.code === 'number' && record.code !== 1) {
      throw new ApiError(typeof record.msg === 'string' && record.msg ? record.msg : '操作失败', record.code)
    }
    if ('data' in record) return record.data as T
  }
  return payload as T
}
