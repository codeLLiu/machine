import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'auto'

const THEME_KEY = 'machine:theme'

const media = window.matchMedia('(prefers-color-scheme: dark)')

function readMode(): ThemeMode {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'auto'
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') return media.matches ? 'dark' : 'light'
  return mode
}

function apply(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c1830' : '#eef6ff')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readMode())
  const resolved = ref<'light' | 'dark'>(resolve(mode.value))

  apply(resolved.value)

  function sync(): void {
    resolved.value = resolve(mode.value)
    apply(resolved.value)
  }

  function setMode(next: ThemeMode): void {
    mode.value = next
    localStorage.setItem(THEME_KEY, next)
    sync()
  }

  /** 在浅色/深色之间直接切换（不落到 auto） */
  function toggle(): void {
    setMode(resolved.value === 'dark' ? 'light' : 'dark')
  }

  /** 系统外观变化时，auto 模式跟随 */
  media.addEventListener('change', () => {
    if (mode.value === 'auto') sync()
  })

  watch(mode, sync)

  const isDark = computed(() => resolved.value === 'dark')
  const label = computed(() =>
    mode.value === 'auto' ? '跟随系统' : resolved.value === 'dark' ? '深色' : '浅色',
  )

  return { mode, resolved, isDark, label, setMode, toggle }
})
