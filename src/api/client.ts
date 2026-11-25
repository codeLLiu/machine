const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const TIMEOUT = 8000

export interface ApiErrorContext {
  httpStatus?: number
  method?: string
  path?: string
  responseBody?: string
}

export class ApiError extends Error {
  code: number
  httpStatus?: number
  method?: string
  path?: string
  responseBody?: string

  constructor(message: string, code = 0, context: ApiErrorContext = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.httpStatus = context.httpStatus
    this.method = context.method
    this.path = context.path
    this.responseBody = context.responseBody
  }
}

type HttpErrorListener = (error: ApiError) => void

let httpErrorListener: HttpErrorListener | null = null

/** 由应用入口注册全局 HTTP 错误提示，避免请求层直接依赖 UI。 */
export function setHttpErrorListener(listener: HttpErrorListener | null): void {
  httpErrorListener = listener
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT)
  const method = (init.method ?? 'GET').toUpperCase()
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
      throw new ApiError('请求超时，请检查设备连接', 0, { method, path })
    }
    throw new ApiError('无法连接设备接口，请检查网络和接口服务', 0, { method, path })
  } finally {
    window.clearTimeout(timer)
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '')
    const apiError = new ApiError(
      `${method} ${path} 请求失败（HTTP ${response.status}）`,
      response.status,
      {
        httpStatus: response.status,
        method,
        path,
        responseBody,
      },
    )
    httpErrorListener?.(apiError)
    throw apiError
  }

  const text = await response.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(`${method} ${path} 响应不是合法的 JSON`, response.status, {
      method,
      path,
      responseBody: text,
    })
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
