import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export interface AppSettings {
  siteName: string
  owner: string
  autoRefresh: boolean
  refreshInterval: number
  compactRow: boolean
}

const COLLAPSE_KEY = 'machine:sidebar-collapsed'
const SETTINGS_KEY = 'machine:settings'

const DEFAULT_SETTINGS: AppSettings = {
  siteName: '机巢中枢',
  owner: '运维中心',
  autoRefresh: true,
  refreshInterval: 30,
  compactRow: false,
}

/** 旧版本默认名，读取时自动迁移 */
const LEGACY_SITE_NAME = '机巢后台管理系统'

function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    if (parsed.siteName === LEGACY_SITE_NAME) parsed.siteName = DEFAULT_SETTINGS.siteName
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const useAppStore = defineStore('app', () => {
  /** 桌面端折叠为图标栏 */
  const sidebarCollapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1')
  /** 移动端抽屉开关 */
  const mobileNavOpen = ref(false)
  const settings = ref<AppSettings>(readSettings())

  const siteName = computed(() => settings.value.siteName || DEFAULT_SETTINGS.siteName)

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleMobileNav(): void {
    mobileNavOpen.value = !mobileNavOpen.value
  }

  function closeMobileNav(): void {
    mobileNavOpen.value = false
  }

  function saveSettings(patch: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...patch }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
  }

  function resetSettings(): void {
    settings.value = { ...DEFAULT_SETTINGS }
    localStorage.removeItem(SETTINGS_KEY)
  }

  watch(sidebarCollapsed, (value) => {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  })

  return {
    sidebarCollapsed,
    mobileNavOpen,
    settings,
    siteName,
    toggleSidebar,
    toggleMobileNav,
    closeMobileNav,
    saveSettings,
    resetSettings,
  }
})
