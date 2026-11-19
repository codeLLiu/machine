<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import NestTopbar from '@/components/NestTopbar.vue'
import { nestStatusMock, type NestNavGroup, type NestNavItem } from '@/data/nestStatusMock'
import { useToast } from '@/composables/toast'
import { useAppStore } from '@/stores/app'
import { fetchSystem } from '@/api/endpoints'
import { useNestStore } from '@/stores/nest'
import type { SystemInfo } from '@/api/types'

/* 设计稿切图（docs/ui.png → src/assets/images） */
import statusIcon from '@/assets/images/status_icon.png'
import statusTrendChart from '@/assets/images/status_trend_chart.png'
import plcIcon from '@/assets/images/plc_icon.png'
import plcSignalChart from '@/assets/images/plc_signal_chart.png'
import basicInfoIcon from '@/assets/images/basic_info_icon.png'
import basicInfoCube from '@/assets/images/basic_info_cube.png'
import titleMarker from '@/assets/images/device_control_title_marker.png'
import fanIcon from '@/assets/images/fan_icon.png'
import fanIllustration from '@/assets/images/fan_illustration.png'
import batteryIcon from '@/assets/images/battery_icon.png'
import batteryIllustration from '@/assets/images/battery_illustration.png'
import sidebarWave from '@/assets/images/sidebar_bottom_wave.png'

/** 机巢状态页：按设计稿 1:1 还原，除「基本信息」卡外仍为演示数据 */
const mock = nestStatusMock
const navGroups: NestNavGroup[] = mock.nav
const toast = useToast()
const nestStore = useNestStore()

const fanOn = ref(mock.deviceControls.fan.on)
const collapsed = ref<Record<string, boolean>>({})
const appStore = useAppStore()
/** 移动端抽屉与全局侧栏共用同一状态 */
const mobileNavOpen = computed(() => appStore.mobileNavOpen)

/** 与串口等页面共用的侧栏折叠状态，移动端仍使用抽屉不折叠 */
const isMobile = ref(false)

/** 基本信息卡：接口未返回时保持占位，不阻塞页面其余演示内容 */
const systemInfo = ref<SystemInfo | null>(null)

const workLamp = computed(() => {
  if (!nestStore.runStatus) return 'idle'
  if (nestStore.runStatus.workStatus === 2 || nestStore.runStatus.emgStop === 1) return 'red'
  if (nestStore.runStatus.workStatus === 1) return 'yellow'
  return 'green'
})

async function refreshSystemInfo(): Promise<void> {
  try {
    systemInfo.value = await fetchSystem()
  } catch {
    systemInfo.value = null
  }
}

function syncViewport(): void {
  isMobile.value = window.innerWidth <= 900
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  void refreshSystemInfo()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

const isMini = computed(() => appStore.sidebarCollapsed && !isMobile.value)

function groupItems(entry: NestNavGroup): NestNavItem[] {
  return entry.items ?? []
}

function toggleGroup(label: string): void {
  collapsed.value = { ...collapsed.value, [label]: !collapsed.value[label] }
}

function setFan(on: boolean): void {
  fanOn.value = on
  demoAction(on ? mock.deviceControls.fan.onLabel : mock.deviceControls.fan.offLabel)
}

function demoAction(label: string): void {
  toast.info('演示数据', `「${label}」指令待接入后台`)
}
</script>

<template>
  <div class="nest-page" :class="{ 'is-mini': isMini }">
    <!-- ================= 侧栏 ================= -->
    <aside class="sidebar" :class="{ 'is-mini': isMini, 'is-open': mobileNavOpen }" aria-label="主导航">
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
          :aria-label="isMini ? '展开侧栏' : '收起侧栏'"
          :title="isMini ? '展开侧栏' : '收起侧栏'"
          @click="appStore.toggleSidebar()"
        >
          <AppIcon :name="isMini ? 'chevronRight' : 'chevronLeft'" :size="14" />
        </button>
      </div>

      <nav class="side-nav">
        <template v-for="entry in navGroups" :key="entry.label">
          <RouterLink
            v-if="!entry.items"
            :to="{ name: entry.route ?? 'overview' }"
            class="nav-item"
            :class="{ 'nav-item--active': entry.route === 'overview' }"
            :title="isMini ? entry.label : undefined"
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
              :title="isMini ? entry.label : undefined"
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
            <div v-show="!collapsed[entry.label] || isMini" class="nav-group__items">
              <RouterLink
                v-for="item in groupItems(entry)"
                :key="item.label"
                :to="{ name: item.route }"
                class="nav-sub"
                :title="isMini ? item.label : undefined"
                @click="appStore.closeMobileNav()"
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

    <div v-if="mobileNavOpen" class="side-scrim" @click="appStore.closeMobileNav()" />

    <!-- ================= 主区（布局等比缩放，字号不低于设计稿） ================= -->
    <main class="nest-main">
      <NestTopbar />

      <!-- 顶部三张概览卡 -->
      <section class="summary-grid">
        <article class="summary-card">
          <div class="summary-card__head">
            <img class="sum-icon" :src="statusIcon" alt="" />
            <h2>{{ mock.summary.nest.title }}</h2>
            <span class="state-tag">{{ nestStore.workStatusText }}</span>
          </div>
          <p class="summary-card__line"><span class="dash">-</span> 运行时间：--</p>
          <p class="summary-card__line">
            <span class="dash">-</span> 工作状态灯：
            <span class="status-lamps" :data-level="workLamp"><i /><i /><i /></span>
          </p>
          <p class="summary-card__line"><span class="dash">-</span> 工作进程：收桨</p>
          <img class="summary-card__decor summary-card__decor--wave" :src="statusTrendChart" alt="" />
        </article>

        <article class="summary-card">
          <div class="summary-card__head">
            <img class="sum-icon" :src="plcIcon" alt="" />
            <h2>{{ mock.summary.plc.title }}</h2>
            <span class="online-inline"><i />{{ nestStore.mode === 'live' ? '在线' : '离线' }}</span>
          </div>
          <p class="summary-card__line"><span class="dash">-</span> 最后操作动作：{{ mock.summary.plc.lastAction }}</p>
          <p class="summary-card__line"><span class="dash">-</span> 最后操作时间：{{ mock.summary.plc.lastActionAt }}</p>
          <img class="summary-card__decor summary-card__decor--bars" :src="plcSignalChart" alt="" />
        </article>

        <article class="summary-card">
          <div class="summary-card__head">
            <img class="sum-icon" :src="basicInfoIcon" alt="" />
            <h2>{{ mock.summary.info.title }}</h2>
          </div>
          <div class="summary-card__line summary-card__line--stack">
            <div><span class="dash">-</span> 机巢编号：{{ systemInfo?.deviceId || '--' }}</div>
            <div><span class="dash">&nbsp;</span> 版本：{{ systemInfo?.ver || '--' }}</div>
          </div>
          <img class="summary-card__decor summary-card__decor--cube" :src="basicInfoCube" alt="" />
        </article>
      </section>

      <!-- 设备控制 -->
      <section class="dashboard">
        <h2 class="section-title"><img class="section-title__bar" :src="titleMarker" alt="" />设备控制</h2>

        <div class="device-grid">
          <!-- 压缩机 -->
          <article class="device-card">
            <div class="device-card__content">
              <div class="device-card__head">
                <img class="dev-icon dev-icon--fan" :src="fanIcon" alt="" />
                <h3>{{ mock.deviceControls.fan.title }}</h3>
                <span class="state-tag state-tag--sm">写死数据</span>
              </div>
              <div class="device-card__actions">
                <button class="ctrl-btn" :class="{ 'ctrl-btn--primary': fanOn }" type="button" @click="setFan(true)">
                  <AppIcon name="wind" :size="14" />{{ mock.deviceControls.fan.onLabel }}
                </button>
                <button class="ctrl-btn" :class="{ 'ctrl-btn--primary': !fanOn }" type="button" @click="setFan(false)">
                  <AppIcon name="wind" :size="14" />{{ mock.deviceControls.fan.offLabel }}
                </button>
              </div>
            </div>
            <img class="device-card__decor device-card__decor--fan" :src="fanIllustration" alt="" />
          </article>

          <!-- 电池 -->
          <article class="device-card">
            <div class="device-card__content">
              <div class="device-card__head">
                <img class="dev-icon dev-icon--battery" :src="batteryIcon" alt="" />
                <h3>{{ mock.deviceControls.battery.title }}</h3>
                <span class="state-tag state-tag--sm">写死数据</span>
              </div>
              <div class="slot-row">
                <span
                  v-for="slot in mock.deviceControls.battery.slots"
                  :key="slot.label"
                  class="slot"
                  :class="{ 'slot--offline': !slot.online }"
                >
                  <i class="slot__dot" />{{ slot.label }}：{{ slot.online ? '在线' : '离线' }}
                </span>
              </div>
            </div>
            <img class="device-card__decor device-card__decor--battery" :src="batteryIllustration" alt="" />
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ================= 页面底色 ================= */
.nest-page {
  --ink: #1f2c4e;
  --ink-2: #5d7193;
  --ink-3: #93a6c2;
  --line: #e2ecfd;
  position: relative;
  min-height: 100vh;
  color: var(--ink);
  color-scheme: light;
  background: linear-gradient(155deg, #e6effd 0%, #d9e7fc 38%, #e9f2fe 78%, #eef5ff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.nest-page::before,
.nest-page::after {
  content: '';
  position: fixed;
  pointer-events: none;
  z-index: 0;
  border-radius: 50%;
}

.nest-page::before {
  left: -190px;
  bottom: -230px;
  width: 660px;
  height: 560px;
  background: radial-gradient(circle at 46% 42%, rgba(158, 202, 255, 0.75), rgba(191, 221, 255, 0.3) 62%, transparent 74%);
  transform: rotate(-16deg);
}

.nest-page::after {
  left: -300px;
  bottom: -330px;
  width: 820px;
  height: 700px;
  border: 80px solid rgba(142, 187, 255, 0.2);
}

/* ================= 侧栏（固定尺寸，不参与缩放） ================= */
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
  transition: width 0.2s ease;
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

/* 折叠态：与串口页一致，仅保留图标 */
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

/* ================= 主区：布局等比 + 字号下限 ================= */
/*
 * 响应式策略：三档，任何一档都不靠缩小字体来换一屏。
 *
 *  档一 宽高双基准（默认，>=1021px 且视口高 >=760px）
 *    --s = min((视口宽 - 侧栏宽) / 1432, 视口高 / 901)
 *    1432 / 901 是设计稿主区尺寸（1672 - 240 侧栏、941 - 40 顶栏留白）。
 *    窗口"够宽但不够高"时按高度缩，"够高但不够宽"时按宽度缩，取更紧的一边，
 *    于是任意窗口下卡片、插图、间距的相对比例一致，整页看起来就是同一张图。
 *
 *  档二 仅宽度基准（>=1021px 但视口高 <760px，如 1366x700、1280x720）
 *    --s = (视口宽 - 侧栏宽) / 1432
 *    矮窗口若继续按高度缩放会把字压到不可读，这里主动放弃"塞进一屏"，
 *    保持设计稿字号，改为纵向滚动。视觉比例仍与设计稿一致，只是内容变长。
 *
 *  档三 固定尺寸 + 重新布局（<=1020px）
 *    --s = 1px，回到绝对像素，卡片改单列/双列，侧栏转抽屉。
 *    窄屏下"等比放大缩小"没有意义，重新排布比缩放更有用。
 *
 * --fs 始终等于 max(--s, 1px)：窗口小于设计稿时字号也不低于原始值。
 * 卡片用 min-height 而非固定 height，字号偏大时自动撑高，不会溢出。
 */
.nest-main {
  --s: min(calc((100vw - 240px) / 1432), calc(100vh / 901));
  --fs: max(var(--s), 1px);
  position: relative;
  z-index: 1;
  min-height: 100vh;
  margin-left: 240px;
  padding: 0 calc(var(--s) * 26) calc(var(--s) * 24) calc(var(--s) * 14);
  transition: margin-left 0.2s ease;
}

.nest-page.is-mini .nest-main {
  --s: min(calc((100vw - 76px) / 1432), calc(100vh / 901));
  margin-left: 76px;
}

/* 档二：矮窗口退回仅宽度基准，保住字号，接受纵向滚动 */
@media (min-width: 1021px) and (max-height: 759px) {
  .nest-main {
    --s: calc((100vw - 240px) / 1432);
  }

  .nest-page.is-mini .nest-main {
    --s: calc((100vw - 76px) / 1432);
  }
}

/* 顶栏由公共组件 NestTopbar 提供（含样式） */
.side-scrim {
  display: none;
}

/* ================= 顶部概览卡 ================= */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.16fr;
  gap: calc(var(--s) * 18);
}

.summary-card {
  position: relative;
  overflow: hidden;
  min-height: calc(var(--s) * 124);
  padding: calc(var(--s) * 18) calc(var(--s) * 20);
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: calc(var(--s) * 16);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.82), rgba(244, 249, 255, 0.62));
  box-shadow: 0 10px 26px rgba(93, 140, 210, 0.09);
}

.summary-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 12);
}

.summary-card h2 {
  font-size: calc(var(--fs) * 18);
  font-weight: 700;
  color: #1f2c4e;
  letter-spacing: 0.01em;
}

.sum-icon {
  width: calc(var(--s) * 52);
  height: calc(var(--s) * 52);
  flex: 0 0 calc(var(--s) * 52);
  object-fit: contain;
}

.state-tag {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--s) * 5);
  padding: calc(var(--s) * 3) calc(var(--s) * 9);
  border-radius: calc(var(--s) * 7);
  background: #e2f7ec;
  color: #23b183;
  font-size: calc(var(--fs) * 11);
  font-weight: 600;
  white-space: nowrap;
}

.state-tag--sm {
  padding: calc(var(--s) * 3) calc(var(--s) * 8);
}

.state-tag__dot {
  width: calc(var(--s) * 5);
  height: calc(var(--s) * 5);
  border-radius: 50%;
  background: #2fd39a;
}

.online-inline {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--s) * 5);
  color: #23b183;
  font-size: calc(var(--fs) * 11.5);
  font-weight: 600;
}

.online-inline i {
  width: calc(var(--s) * 6);
  height: calc(var(--s) * 6);
  border-radius: 50%;
  background: #2fd39a;
}

.summary-card__line {
  position: relative;
  z-index: 1;
  margin-top: calc(var(--s) * 12);
  padding-left: calc(var(--s) * 10);
  color: #6d82a3;
  font-size: calc(var(--fs) * 12.5);
}

.summary-card__line--stack {
  margin-top: calc(var(--s) * 8);
  line-height: 1.7;
}

.status-lamps {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--s) * 5);
  margin-left: calc(var(--s) * 2);
  vertical-align: -2px;
}

.status-lamps i {
  width: calc(var(--s) * 8);
  height: calc(var(--s) * 8);
  border-radius: 50%;
  background: #e5edf8;
  box-shadow: inset 0 0 0 1px rgba(138, 165, 202, 0.32);
}

.status-lamps[data-level='green'] i:first-child {
  background: #2fd39a;
  box-shadow: none;
}

.status-lamps[data-level='yellow'] i:nth-child(2) {
  background: #f7ba3f;
  box-shadow: none;
}

.status-lamps[data-level='red'] i:nth-child(3) {
  background: #f25a5a;
  box-shadow: none;
}

.dash {
  color: #a9bbd4;
  margin-right: 2px;
}

.summary-card__decor {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  user-select: none;
}

.summary-card__decor--wave {
  right: calc(var(--s) * 14);
  bottom: calc(var(--s) * 10);
  width: calc(var(--s) * 140);
}

.summary-card__decor--bars {
  right: calc(var(--s) * 26);
  bottom: calc(var(--s) * 10);
  width: calc(var(--s) * 110);
}

.summary-card__decor--cube {
  right: calc(var(--s) * 20);
  bottom: calc(var(--s) * 10);
  width: calc(var(--s) * 129);
}

/* ================= 主面板 ================= */
.dashboard {
  margin-top: calc(var(--s) * 16);
  padding: calc(var(--s) * 18) calc(var(--s) * 20) calc(var(--s) * 22);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: calc(var(--s) * 18);
  background: linear-gradient(150deg, rgba(244, 249, 255, 0.72), rgba(226, 238, 253, 0.6));
  box-shadow: 0 14px 32px rgba(93, 140, 210, 0.09);
}

.section-title {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 10);
  color: #1f2c4e;
  font-size: calc(var(--fs) * 18);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.section-title__bar {
  width: calc(var(--s) * 10);
  height: calc(var(--s) * 21);
  object-fit: contain;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--s) * 14) calc(var(--s) * 18);
  margin-top: calc(var(--s) * 14);
}

.device-card {
  position: relative;
  overflow: hidden;
  min-height: calc(var(--s) * 142);
  padding: calc(var(--s) * 20) calc(var(--s) * 22);
  border: 1px solid var(--line);
  border-radius: calc(var(--s) * 14);
  background: linear-gradient(120deg, rgba(252, 254, 255, 0.96), rgba(236, 244, 255, 0.82));
  box-shadow: 0 6px 16px rgba(100, 145, 215, 0.06);
}

.device-card__content {
  position: relative;
  z-index: 1;
}

.device-card__head {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 10);
  min-height: calc(var(--s) * 30);
}

.device-card h3 {
  color: #1f2c4e;
  font-size: calc(var(--fs) * 16);
  font-weight: 700;
}

.dev-icon {
  object-fit: contain;
}

.dev-icon--fan {
  width: calc(var(--s) * 25);
  height: calc(var(--s) * 29);
}

.dev-icon--battery {
  width: calc(var(--s) * 25);
  height: calc(var(--s) * 28);
}

.device-card__actions,
.slot-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(var(--s) * 12);
  margin-top: calc(var(--s) * 20);
}

.ctrl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 7);
  min-width: calc(var(--s) * 128);
  min-height: calc(var(--s) * 34);
  padding: calc(var(--s) * 4) calc(var(--s) * 18);
  border: 1px solid #e4edfd;
  border-radius: calc(var(--s) * 17);
  background: rgba(255, 255, 255, 0.95);
  color: #4a6fb5;
  font-size: calc(var(--fs) * 12.5);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(90, 135, 205, 0.07);
  transition: color 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.ctrl-btn svg {
  width: calc(var(--s) * 14);
  height: calc(var(--s) * 14);
}

.ctrl-btn:hover {
  border-color: #9dbfff;
  color: #3b7bff;
  transform: translateY(-1px);
}

.ctrl-btn--primary,
.ctrl-btn--primary:hover {
  border-color: transparent;
  background: linear-gradient(100deg, #7a86f6 0%, #5aa9f7 100%);
  color: #fff;
  box-shadow: 0 6px 14px rgba(105, 139, 240, 0.3);
}

.slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--s) * 6);
  min-height: calc(var(--s) * 30);
  padding: calc(var(--s) * 3) calc(var(--s) * 12);
  border: 1px solid #e6eefd;
  border-radius: calc(var(--s) * 15);
  background: rgba(255, 255, 255, 0.85);
  color: #4a6fb5;
  font-size: calc(var(--fs) * 12);
  white-space: nowrap;
}

.slot__dot {
  width: calc(var(--s) * 6);
  height: calc(var(--s) * 6);
  border-radius: 50%;
  background: #2fd39a;
}

.slot--offline {
  color: #93a6c2;
}

.slot--offline .slot__dot {
  background: #c3cfdf;
}

.device-card__decor {
  position: absolute;
  z-index: 0;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  user-select: none;
}

.device-card__decor--fan {
  right: calc(var(--s) * 30);
  width: calc(var(--s) * 149);
}

.device-card__decor--battery {
  right: calc(var(--s) * 30);
  width: calc(var(--s) * 124);
}

/* 较宽桌面：为右侧电池插图预留空间，避免 6 个电池仓状态压到插图上 */
@media (min-width: 1281px) {
  .slot-row {
    padding-right: calc(var(--s) * 150);
  }
}

/* 较窄桌面：字号不再缩小，为插图预留空间并允许按钮换行，避免遮挡 */
@media (max-width: 1280px) and (min-width: 1021px) {
  .device-card__content {
    padding-right: calc(var(--s) * 150);
  }
}

/* ================= 小屏：切换布局并回到固定尺寸 ================= */
@media (max-width: 1020px) {
  .sidebar {
    width: 200px;
  }

  .nest-main,
  .nest-page.is-mini .nest-main {
    --s: 1px;
    margin-left: 200px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .device-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .device-card__content {
    padding-right: 130px;
  }

  .device-card__decor--fan {
    right: 16px;
    width: 118px;
  }

  .device-card__decor--battery {
    right: 22px;
    width: 96px;
  }
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.22s ease;
  }

  .sidebar.is-open {
    transform: none;
  }

  .side-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 19;
    background: rgba(60, 95, 150, 0.2);
  }

  .nest-main,
  .nest-page.is-mini .nest-main {
    --s: 0.9px;
    margin-left: 0;
    padding: 0 12px 20px;
  }

  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .brand__collapse {
    display: none;
  }
}

@media (max-width: 560px) {
  .device-card__content {
    padding-right: 88px;
  }

  .device-card__decor--fan {
    right: 10px;
    width: 80px;
  }

  .device-card__decor--battery {
    right: 14px;
    width: 66px;
  }

  .ctrl-btn {
    min-width: 108px;
  }
}
</style>
