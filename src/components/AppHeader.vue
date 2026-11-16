<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { appMenu } from '@/router'
import { useToast } from '@/composables/toast'
import { useAppStore } from '@/stores/app'
import { useNestStore } from '@/stores/nest'
import { useUserStore } from '@/stores/user'

const appStore = useAppStore()
const userStore = useUserStore()
const nestStore = useNestStore()
const router = useRouter()
const toast = useToast()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const boxRef = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const paletteOpen = ref(false)

const flatMenu = appMenu.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return flatMenu.slice(0, 8)
  return flatMenu.filter(
    (item) => item.title.toLowerCase().includes(q) || item.group.toLowerCase().includes(q),
  )
})

const avatarText = computed(() => userStore.displayName.slice(0, 1))
const statusText = computed(() => (nestStore.isHealthy ? nestStore.workStatusText : '异常'))

function handleToggle(): void {
  appStore.toggleMobileNav()
}

function goTo(name: string): void {
  paletteOpen.value = false
  menuOpen.value = false
  query.value = ''
  searchInput.value?.blur()
  void router.push({ name })
}

function onSearchEnter(): void {
  const first = results.value[0]
  if (first) goTo(first.name)
}

function handleLogout(): void {
  menuOpen.value = false
  nestStore.stopPolling()
  userStore.logout()
  void router.push({ name: 'login' })
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Node
  if (paletteOpen.value && boxRef.value && !boxRef.value.contains(target)) {
    paletteOpen.value = false
  }
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(target)) {
    menuOpen.value = false
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
    paletteOpen.value = true
  }
  if (event.key === 'Escape') {
    paletteOpen.value = false
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <header class="topbar">
    <button class="topbar__menu" type="button" aria-label="打开导航" @click="handleToggle">
      <AppIcon name="menu" :size="18" />
    </button>

    <div ref="boxRef" class="searchbox">
      <label class="search">
        <AppIcon name="search" :size="18" />
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="搜索页面、模块、配置项…"
          aria-label="全局搜索"
          autocomplete="off"
          @focus="paletteOpen = true"
          @keydown.enter.prevent="onSearchEnter"
        />
        <span class="kbd">⌘ K</span>
      </label>

      <Transition name="fade">
        <div v-if="paletteOpen" class="palette">
          <div class="palette__cap">快速跳转</div>
          <button
            v-for="item in results"
            :key="item.name"
            class="palette__i"
            type="button"
            @click="goTo(item.name)"
          >
            <AppIcon :name="item.icon" :size="16" />
            <span>{{ item.title }}</span>
            <small>{{ item.group }}</small>
          </button>
          <div v-if="!results.length" class="palette__empty">没有匹配的页面</div>
        </div>
      </Transition>
    </div>

    <div class="topbar__sp" />

    <span class="mode" :class="nestStore.mode === 'live' ? 'mode--live' : 'mode--mock'">
      <span class="dot" :class="nestStore.mode === 'live' ? 'dot--live' : 'dot--warn'" />
      <span class="mode__text">{{ nestStore.mode === 'live' ? '实时链路' : '演示数据' }}</span>
    </span>

    <span class="status">
      <span class="dot" :class="nestStore.isHealthy ? 'dot--live' : 'dot--err'" />
      {{ statusText }}
    </span>

    <button class="tbtn" type="button" aria-label="通知" @click="toast.info('暂无新通知')">
      <AppIcon name="bell" :size="20" />
      <span class="tbtn__dot" />
    </button>

    <div ref="menuRef" class="user">
      <button class="user__trigger" type="button" @click.stop="menuOpen = !menuOpen">
        <span class="avatar">{{ avatarText }}</span>
        <span class="user__meta">
          <strong>{{ userStore.displayName }}</strong>
          <small>{{ userStore.profile?.role ?? '访客' }}</small>
        </span>
        <AppIcon name="chevronDown" :size="14" :class="{ 'is-open': menuOpen }" />
      </button>

      <Transition name="fade">
        <div v-if="menuOpen" class="user__menu">
          <div class="user__menu-head">
            <strong>{{ userStore.displayName }}</strong>
            <small class="mono">{{ userStore.profile?.account }}</small>
          </div>
          <button type="button" class="user__menu-item" @click="goTo('config-camera')">
            <AppIcon name="settings" :size="15" />
            配置
          </button>
          <button type="button" class="user__menu-item user__menu-item--danger" @click="handleLogout">
            <AppIcon name="logout" :size="15" />
            退出登录
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 58px;
  margin-bottom: 26px;
}

.topbar__sp {
  flex: 1;
}

.topbar__menu {
  display: none;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--edge);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
}

.searchbox {
  position: relative;
  flex: 1;
  max-width: 560px;
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--edge);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text-3);
}

.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}

.search input::placeholder {
  color: var(--text-3);
}

.search input::-webkit-search-cancel-button {
  cursor: pointer;
}

.kbd {
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-2);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-2);
}

.palette {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 40;
  max-height: 340px;
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--edge);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.palette__cap {
  padding: 4px 10px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--text-3);
}

.palette__i {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.palette__i svg {
  color: var(--primary);
}

.palette__i span {
  flex: 1;
}

.palette__i small {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
}

.palette__i:hover,
.palette__i:focus-visible {
  background: var(--primary-weak);
  color: var(--primary);
}

.palette__empty {
  padding: 20px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--text-3);
}

.mode,
.status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--edge);
  border-radius: 11px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-2);
  white-space: nowrap;
}

.mode--live {
  color: var(--success);
  background: var(--success-weak);
  border-color: transparent;
}

.mode--mock {
  color: var(--warning);
  background: var(--warning-weak);
  border-color: transparent;
}

.tbtn {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border: 1px solid var(--edge);
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text-2);
  cursor: pointer;
  transition: color 0.16s ease, transform 0.16s ease;
}

.tbtn:hover {
  color: var(--primary);
  transform: translateY(-1px);
}

.tbtn__dot {
  position: absolute;
  right: 9px;
  top: 8px;
  width: 7px;
  height: 7px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--danger);
}

.user {
  position: relative;
}

.user__trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 12px 0 6px;
  border: 1px solid var(--edge);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text-2);
  cursor: pointer;
}

.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #cfe1ff, #a9c8ff);
  color: #1a4bb5;
  font-size: 11px;
  font-weight: 800;
}

.user__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.user__meta strong {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.user__meta small {
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-3);
}

.user__trigger svg {
  transition: transform 0.18s ease;
}

.user__trigger svg.is-open {
  transform: rotate(180deg);
}

.user__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: 200px;
  padding: 6px;
  border: 1px solid var(--edge);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-pop);
}

.user__menu-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.user__menu-head strong {
  font-size: 12.5px;
}

.user__menu-head small {
  font-size: 11px;
  color: var(--text-3);
}

.user__menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-2);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}

.user__menu-item:hover {
  background: var(--surface-2);
  color: var(--primary);
}

.user__menu-item--danger:hover {
  background: var(--danger-weak);
  color: var(--danger);
}

@media (max-width: 1080px) {
  .status {
    display: none;
  }
}

@media (max-width: 900px) {
  .topbar {
    gap: 10px;
    flex-wrap: wrap;
    height: auto;
    margin-bottom: 20px;
  }

  .topbar__menu {
    display: grid;
    order: 0;
  }

  .searchbox {
    order: 1;
    flex-basis: 100%;
    max-width: none;
  }

  .topbar__sp {
    display: none;
  }

  .mode,
  .tbtn {
    order: 2;
  }

  .user {
    order: 3;
    margin-left: auto;
  }
}

@media (max-width: 600px) {
  .mode__text,
  .user__meta {
    display: none;
  }
}
</style>
