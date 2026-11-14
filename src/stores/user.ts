import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { requestLogin } from '@/api/auth'

export interface UserProfile {
  account: string
  name: string
  role: string
}

export interface LoginPayload {
  account: string
  password: string
  captcha: string
}

const TOKEN_KEY = 'machine:token'
const PROFILE_KEY = 'machine:profile'

function readProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) ?? '')
  const profile = ref<UserProfile | null>(readProfile())
  const loading = ref(false)

  const isLoggedIn = computed(() => token.value.length > 0)
  const displayName = computed(() => profile.value?.name ?? '未登录')

  /**
   * 登录设备后台：POST /api/login（form-urlencoded）。
   * 验证码与 sid 会话由 /api/captcha 下发的 Cookie 绑定，
   * 本地 token 仅用于前端路由守卫标记登录态。
   */
  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true
    try {
      const result = await requestLogin({
        username: payload.account.trim(),
        password: payload.password,
        // 设备端验证码不区分大小写场景下统一转为大写提交
        captcha: payload.captcha.trim().toUpperCase(),
      })
      if (!result.success) {
        throw new Error(result.msg || '账号、密码或验证码错误')
      }
      token.value = `session-${Date.now()}`
      profile.value = {
        account: payload.account.trim(),
        name: '系统管理员',
        role: '超级管理员',
      }
      localStorage.setItem(TOKEN_KEY, token.value)
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    token.value = ''
    profile.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
  }

  return { token, profile, loading, isLoggedIn, displayName, login, logout }
})
