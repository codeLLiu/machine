import { reactive } from 'vue'
import { ApiError } from '@/api/client'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  detail?: string
  key?: string
}

/** 全局提示队列，由 AppToast 渲染 */
export const toastList = reactive<ToastItem[]>([])
let seed = 0

export function removeToast(id: number): void {
  const index = toastList.findIndex((item) => item.id === id)
  if (index >= 0) toastList.splice(index, 1)
}

function formatResponseBody(body: string | undefined): string | undefined {
  const text = body?.trim()
  if (!text) return undefined
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function push(
  type: ToastType,
  message: string,
  detail?: string,
  fingerprint?: string,
): void {
  if (fingerprint && toastList.some((item) => item.key === fingerprint)) {
    return
  }
  const id = ++seed
  toastList.push({ id, type, message, detail, key: fingerprint })
  window.setTimeout(() => removeToast(id), type === 'error' ? 9000 : 3200)
}

/** HTTP 非 2xx 请求由请求层统一上报，即使调用方静默处理也会提示。 */
export function reportHttpError(error: ApiError): void {
  if (error.httpStatus === undefined) return
  const method = error.method ?? 'GET'
  const path = error.path ?? ''
  const detail = [
    `请求失败（HTTP ${error.httpStatus}）`,
    `${method} ${path}`.trim(),
    formatResponseBody(error.responseBody),
  ]
    .filter(Boolean)
    .join('\n')
  push(
    'error',
    '操作失败',
    detail,
    `${method}:${path}:${error.httpStatus}`,
  )
}

export function useToast() {
  return {
    success: (message: string, detail?: string) => push('success', message, detail),
    error: (message: string, detail?: string) => push('error', message, detail),
    apiError: (message: string, error: unknown, fallback = '请稍后重试') => {
      // HTTP 错误已经由 reportHttpError 统一展示，避免调用方重复弹框。
      if (error instanceof ApiError && error.httpStatus !== undefined) return
      push('error', message, error instanceof Error ? error.message : fallback)
    },
    info: (message: string, detail?: string) => push('info', message, detail),
    warning: (message: string, detail?: string) => push('warning', message, detail),
  }
}
