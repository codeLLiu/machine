import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  detail?: string
}

/** 全局提示队列，由 AppToast 渲染 */
export const toastList = reactive<ToastItem[]>([])
let seed = 0

export function removeToast(id: number): void {
  const index = toastList.findIndex((item) => item.id === id)
  if (index >= 0) toastList.splice(index, 1)
}

function push(type: ToastType, message: string, detail?: string): void {
  const id = ++seed
  toastList.push({ id, type, message, detail })
  window.setTimeout(() => removeToast(id), type === 'error' ? 5200 : 3200)
}

export function useToast() {
  return {
    success: (message: string, detail?: string) => push('success', message, detail),
    error: (message: string, detail?: string) => push('error', message, detail),
    info: (message: string, detail?: string) => push('info', message, detail),
    warning: (message: string, detail?: string) => push('warning', message, detail),
  }
}
