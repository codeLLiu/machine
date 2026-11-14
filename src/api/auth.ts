import { ApiError, call } from './client'

export interface LoginResult {
  success: boolean
  msg: string
}

export interface LoginFormData {
  username: string
  password: string
  captcha: string
}

/**
 * 获取登录验证码。
 * 设备端实现为文本验证码：返回 {"code":"XXXX"}，
 * 同时通过 Set-Cookie 下发 sid 会话（HttpOnly），后续登录请求需携带该 Cookie。
 */
export async function fetchCaptcha(): Promise<string> {
  const payload = await call<{ code?: unknown }>('/api/captcha', {
    method: 'GET',
    credentials: 'include',
  })
  if (payload && typeof payload.code === 'string' && payload.code.trim()) {
    return payload.code.trim()
  }
  throw new ApiError('验证码获取失败，请刷新重试')
}

/** 提交登录表单（form-urlencoded），成功后服务端会话由 sid Cookie 维持 */
export async function requestLogin(form: LoginFormData): Promise<LoginResult> {
  const response = await call<LoginResult>('/api/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: form.username,
      password: form.password,
      captcha: form.captcha,
    }).toString(),
  })

  if (!response || typeof response.success !== 'boolean') {
    throw new ApiError('登录接口响应异常，请稍后重试')
  }
  return response
}
