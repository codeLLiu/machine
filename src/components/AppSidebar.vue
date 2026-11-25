<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { appMenu } from '@/router'
import { useAppStore } from '@/stores/app'
import { useNestStore } from '@/stores/nest'
import sidebarWave from '@/assets/images/sidebar_bottom_wave.png'

interface SidebarItem {
  label: string
  route: string
  icon: string
}

interface SidebarGroup {
  label: string
  icon: string
  route?: string
  items?: SidebarItem[]
}

const appStore = useAppStore()
const nestStore = useNestStore()
const route = useRoute()
const navGroups: SidebarGroup[] = [
  { label: '机巢', icon: 'homeSolid', route: 'overview' },
  ...appMenu.slice(1, 3).map((group) => ({
    label: group.label,
    icon: group.label === '配置' ? 'configSolid' : 'gearSolid',
    items: group.items.map((item) => ({ label: item.title, route: item.name, icon: item.icon })),
  })),
  { label: '系统服务', icon: 'power', route: 'system' },
]
const collapsed = ref<Record<string, boolean>>({})

const isMobile = ref(false)

function syncViewport(): void {
  isMobile.value = window.innerWidth <= 900
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

const iconOnly = computed(() => appStore.sidebarCollapsed && !isMobile.value)

function groupItems(entry: SidebarGroup): SidebarItem[] {
  return entry.items ?? []
}

function toggleGroup(label: string): void {
  collapsed.value = { ...collapsed.value, [label]: !collapsed.value[label] }
}

function isActive(name: string | undefined): boolean {
  return typeof name === 'string' && route.name === name
}

function handleSubNavClick(name: string): void {
  appStore.closeMobileNav()
  if (name === 'config-camera' && route.name === 'config-camera') {
    void nestStore.refreshCameras()
  }
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-mini': iconOnly }" aria-label="主导航">
    <div class="brand">
      <svg class="brand__logo" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 2 35 10.5v19L20 38 5 29.5v-19z" fill="#2f6bff" />
        <path d="M20 2 35 10.5 20 19 5 10.5z" fill="#6fa4ff" />
        <path d="M20 19 35 10.5v19L20 38z" fill="#4b84f5" />
        <path d="M20 10 27 14v8l-7 5-7-5v-8z" fill="#dceaff" />
        <path d="M20 15 24 17.5v4L20 24l-4-2.5v-4z" fill="#ffffff" />
      </svg>
      <div class="brand__text">
        <div class="brand__name">机巢</div>
        <div class="brand__sub">Machine Nest</div>
      </div>
      <button
        v-if="!isMobile"
        class="brand__collapse"
        type="button"
        :aria-label="iconOnly ? '展开侧栏' : '收起侧栏'"
        :title="iconOnly ? '展开侧栏' : '收起侧栏'"
        @click="appStore.toggleSidebar()"
      >
        <AppIcon :name="iconOnly ? 'chevronRight' : 'chevronLeft'" :size="14" />
      </button>
    </div>

    <nav class="side-nav">
      <template v-for="entry in navGroups" :key="entry.label">
        <RouterLink
          v-if="!entry.items"
          :to="{ name: entry.route ?? 'overview' }"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(entry.route ?? 'overview') }"
          :title="iconOnly ? entry.label : undefined"
          @click="appStore.closeMobileNav()"
        >
          <svg v-if="entry.icon === 'homeSolid'" class="nav-item__icon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <path d="M2.8 10.4 12 3l9.2 7.4V20a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1z" fill="currentColor" />
            <rect x="10" y="14" width="4" height="7" rx="1" fill="#eaf3ff" />
          </svg>
          <AppIcon v-else :name="entry.icon" :size="17" class="nav-item__icon" />
          <span>{{ entry.label }}</span>
        </RouterLink>

        <div v-else class="nav-group">
          <button
            class="nav-group__head"
            type="button"
            :title="iconOnly ? entry.label : undefined"
            @click="toggleGroup(entry.label)"
          >
            <svg v-if="entry.icon === 'configSolid'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <rect x="2.5" y="4.5" width="14" height="13" rx="3" fill="#3567cf" />
              <circle cx="17.2" cy="17" r="4.6" fill="#3567cf" />
              <circle cx="17.2" cy="17" r="1.8" fill="#fff" />
            </svg>
            <svg v-else-if="entry.icon === 'gearSolid'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M12 2.8a2 2 0 0 1 1.9 1.4l.3 1 2-.6a2 2 0 0 1 2.4 1l.8 1.7a2 2 0 0 1-.4 2.4l-.8.8.8.8a2 2 0 0 1 .4 2.4l-.8 1.7a2 2 0 0 1-2.4 1l-2-.6-.3 1A2 2 0 0 1 12 21.2a2 2 0 0 1-1.9-1.4l-.3-1-2 .6a2 2 0 0 1-2.4-1l-.8-1.7a2 2 0 0 1 .4-2.4l.8-.8-.8-.8a2 2 0 0 1-.4-2.4l.8-1.7a2 2 0 0 1 2.4-1l2 .6.3-1A2 2 0 0 1 12 2.8z" fill="#3567cf" />
              <circle cx="12" cy="12" r="2.8" fill="#fff" />
            </svg>
            <AppIcon v-else :name="entry.icon" :size="16" />
            <span>{{ entry.label }}</span>
            <AppIcon
              :name="collapsed[entry.label] ? 'chevronDown' : 'chevronUp'"
              :size="13"
              class="nav-group__arrow"
            />
          </button>
          <div v-show="!collapsed[entry.label] || iconOnly" class="nav-group__items">
            <RouterLink
              v-for="item in groupItems(entry)"
              :key="item.label"
              :to="{ name: item.route }"
              class="nav-sub"
              :class="{ 'nav-sub--active': isActive(item.route) }"
              :title="iconOnly ? item.label : undefined"
              @click="handleSubNavClick(item.route)"
            >
              <svg v-if="item.icon === 'stack'" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path d="M4 5h16v5H4zM4 13h16v5H4z" fill="#b9cdf0" />
                <path d="M7 7.5h6M7 15.5h6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" />
              </svg>
              <AppIcon v-else :name="item.icon" :size="15" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>
      </template>
    </nav>

    <img class="sidebar__wave" :src="sidebarWave" alt="" aria-hidden="true" />
  </aside>
</template>

<style scoped>
/* 与机巢状态页侧栏同款：固定宽度，不随主区缩放 */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 240px;
  padding: 26px 16px 0;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(250, 253, 255, 0.94), rgba(230, 240, 253, 0.86));
  border-right: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 8px 0 34px rgba(95, 145, 220, 0.07);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: width 0.2s ease, transform 0.22s ease;
}

.sidebar__wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  pointer-events: none;
  user-select: none;
}

.brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px;
  height: 44px;
}

.brand__logo {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  filter: drop-shadow(0 4px 10px rgba(47, 107, 255, 0.3));
}

.brand__name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.15;
}

.brand__sub {
  margin-top: 2px;
  font-size: 9.5px;
  color: #8ba0bf;
  letter-spacing: 0.01em;
}

.brand__collapse {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  margin-left: auto;
  padding: 0;
  border: 1px solid #e0eafb;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #7f93b4;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(96, 140, 210, 0.08);
  transition: color 0.16s ease, border-color 0.16s ease;
}

.brand__collapse:hover {
  color: #3b7bff;
  border-color: #9dbfff;
}

.side-nav {
  position: relative;
  z-index: 1;
  flex: 1;
  margin-top: 35px;
  padding-bottom: 24px;
  overflow-y: auto;
  scrollbar-width: none;
}

.side-nav::-webkit-scrollbar {
  display: none;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 46px;
  padding: 0 16px;
  border-radius: 12px;
  color: #3f5686;
  font-size: 14px;
  font-weight: 550;
}

.nav-item__icon {
  color: #4a6db5;
}

.nav-item--active {
  background: linear-gradient(100deg, #c3dcff, #e2efff);
  color: #2f6bff;
  box-shadow: 0 6px 14px rgba(80, 130, 210, 0.12);
}

.nav-item--active .nav-item__icon {
  color: #3b7bff;
}

.nav-group {
  margin-top: 16px;
}

/* 一级菜单项统一间距：子菜单收起后「调试 → 系统」也留同样空白，四项等距 */
.side-nav > * + * {
  margin-top: 16px;
}

.nav-group__head {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  height: 46px;
  padding: 0 16px;
  border: 0;
  background: none;
  color: #3f5686;
  font-size: 14px;
  font-weight: 550;
  text-align: left;
  cursor: pointer;
}

.nav-group__head > svg:first-child {
  color: #3567cf;
}

.nav-group__arrow {
  margin-left: auto;
  color: #93a9c7;
}

.nav-group__items {
  padding: 10px 0 0 18px;
}

.nav-sub {
  display: flex;
  align-items: center;
  gap: 13px;
  height: 46px;
  padding: 0 12px;
  border-radius: 9px;
  color: #7590b8;
  font-size: 13px;
  font-weight: 600;
  transition: color 0.16s ease, background 0.16s ease;
}

.nav-sub svg {
  color: #b9cdf0;
}

.nav-sub:hover {
  color: #3b7bff;
  background: rgba(255, 255, 255, 0.6);
}

/* 当前路由子项：与机巢页选中项同款浅蓝渐变 */
.nav-sub--active,
.nav-sub--active:hover {
  background: linear-gradient(100deg, #d6e6ff, #eaf3ff);
  color: #2f6bff;
  box-shadow: 0 4px 12px rgba(80, 130, 210, 0.1);
}

.nav-sub--active svg {
  color: #3b7bff;
}

/* 折叠态：仅保留图标 */
.sidebar.is-mini {
  width: 76px;
  padding: 24px 10px 0;
}

.sidebar.is-mini .brand {
  flex-direction: column;
  gap: 8px;
  height: auto;
  padding: 0;
}

.sidebar.is-mini .brand__logo {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
}

.sidebar.is-mini .brand__text {
  display: none;
}

.sidebar.is-mini .brand__collapse {
  margin-left: 0;
}

.sidebar.is-mini .side-nav {
  margin-top: 30px;
}

.sidebar.is-mini .nav-item,
.sidebar.is-mini .nav-group__head,
.sidebar.is-mini .nav-sub {
  justify-content: center;
  gap: 0;
  padding: 0;
}

.sidebar.is-mini .nav-item > span,
.sidebar.is-mini .nav-group__head > span,
.sidebar.is-mini .nav-group__arrow,
.sidebar.is-mini .nav-sub > span {
  display: none;
}

.sidebar.is-mini .side-nav > * + * {
  margin-top: 10px;
}

.sidebar.is-mini .nav-group {
  margin-top: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(160, 192, 238, 0.35);
}

.sidebar.is-mini .nav-group:last-of-type {
  border-bottom: 0;
}

.sidebar.is-mini .nav-group__items {
  padding-left: 0;
}

.sidebar.is-mini .nav-sub {
  height: 40px;
}

@media (max-width: 1020px) and (min-width: 901px) {
  .sidebar:not(.is-mini) {
    width: 200px;
  }
}

/* 移动端抽屉 */
@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.is-open {
    transform: none;
  }

  .brand__collapse {
    display: none;
  }
}
</style>
