import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface UserProfile {
  account: string
  name: string
  role: string
}

export interface LoginPayload {
  account: string
  password: string
}

const TOKEN_KEY = 'machine:token'
const PROFILE_KEY = 'machine:profile'

/** 演示账号，接入真实接口时替换 login 内部实现即可 */
const DEMO_ACCOUNT = 'admin'
const DEMO_PASSWORD = '123456'

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

  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true
    try {
      // 模拟网络延迟，真实项目替换为接口请求
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (payload.account.trim() !== DEMO_ACCOUNT || payload.password !== DEMO_PASSWORD) {
        throw new Error('账号或密码错误，请使用演示账号 admin / 123456')
      }
      token.value = `demo-token-${Date.now()}`
      profile.value = {
        account: DEMO_ACCOUNT,
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
