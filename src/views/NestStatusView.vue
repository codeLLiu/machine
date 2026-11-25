<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import NestTopbar from '@/components/NestTopbar.vue'
import NestStatusModules from '@/components/NestStatusModules.vue'
import { nestStatusMock } from '@/data/nestStatusMock'
import { useNestStore } from '@/stores/nest'
import { useAppStore } from '@/stores/app'
import { fetchSystem } from '@/api/endpoints'
import type { SystemInfo } from '@/api/types'

/* 设计稿切图（docs/ui.png → src/assets/images） */
import statusIcon from '@/assets/images/status_icon.png'
import statusTrendChart from '@/assets/images/status_trend_chart.png'
import plcIcon from '@/assets/images/plc_icon.png'
import plcSignalChart from '@/assets/images/plc_signal_chart.png'
import basicInfoIcon from '@/assets/images/basic_info_icon.png'
import basicInfoCube from '@/assets/images/basic_info_cube.png'

/** 机巢状态页：概览、设备状态、电池槽与状态详情均接入 /api/getRunStatus。 */
const mock = nestStatusMock
const nestStore = useNestStore()

const appStore = useAppStore()

/** 与全局侧栏共用的折叠状态，移动端仍使用抽屉不折叠 */
const isMobile = ref(false)

/** 基本信息卡：接口未返回时保持占位，不阻塞页面其余演示内容 */
const systemInfo = ref<SystemInfo | null>(null)

async function refreshSystemInfo(): Promise<void> {
  try {
    systemInfo.value = await fetchSystem()
  } catch {
    systemInfo.value = null
  }
}

let pageTimer = 0
let refreshingPageData = false

async function refreshPageData(): Promise<void> {
  if (refreshingPageData) return
  refreshingPageData = true
  try {
    await Promise.allSettled([
      nestStore.refreshStatus(),
      nestStore.refreshErrors(),
      refreshSystemInfo(),
    ])
  } finally {
    refreshingPageData = false
  }
}

/** 机巢运行时长：dockUptime 已由后端按 xx天xx时xx分xx秒 格式化，直接展示；
 *  兼容后端偶发返回纯数字（按秒）的情况，统一换算成同一格式。 */
const nestUptime = computed(() => {
  const text = String(nestStore.runStatus?.dockUptime ?? '').trim()
  if (!text) return '--'
  if (!/^-?\d+$/.test(text)) return text
  const raw = Number(text)
  if (!Number.isFinite(raw) || raw <= 0) return '--'
  const totalSeconds = Math.floor(raw)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}天${hours}时${minutes}分${seconds}秒`
})

function statusLightClass(color: 'green' | 'yellow' | 'red', state?: number): string {
  const ledState = state ?? 0
  if (ledState === 0) return 'status-light--off'
  const blink = ledState === 2 ? 'slow' : ledState === 3 ? 'fast' : ''
  return blink ? `status-light--${color} status-light--${blink}` : `status-light--${color}`
}

const workStatusText = computed(() => {
  if (!nestStore.runStatus) return '读取中'
  const workStatus = nestStore.runStatus.workStatus
  if (workStatus === 1) return '运行中'
  if (workStatus === 2) return '故障'
  return '空闲当中'
})

const workStatusClass = computed(() => {
  if (!nestStore.runStatus) return 'online-inline--muted'
  const workStatus = nestStore.runStatus.workStatus
  if (workStatus === 1) return 'online-inline--green'
  if (workStatus === 2) return 'online-inline--red'
  return 'online-inline--yellow'
})

/** 后端时间可能是时间戳（数字/数字字符串，秒或毫秒）或日期字符串，统一组装成 YYYY-MM-DD HH:mm:ss */
function formatOpTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '--'

  const text = String(value).trim()
  let time: number

  if (/^-?\d+$/.test(text)) {
    // 纯数字按时间戳处理：10 位为秒，13 位为毫秒
    const numeric = Number(text)
    time = numeric < 1e11 ? numeric * 1000 : numeric
  } else {
    // Date.parse 对 YYYY-MM-DD HH:mm:ss 在部分浏览器返回 NaN，回退成 YYYY/MM/DD 再解析
    time = Date.parse(text)
    if (Number.isNaN(time)) time = Date.parse(text.replace(/-/g, '/'))
  }

  if (Number.isNaN(time)) return text || '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return text || '--'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function syncViewport(): void {
  isMobile.value = window.innerWidth <= 900
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  void refreshPageData()
  pageTimer = window.setInterval(() => void refreshPageData(), 5000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  if (pageTimer) window.clearInterval(pageTimer)
  pageTimer = 0
})

const isMini = computed(() => appStore.sidebarCollapsed && !isMobile.value)

</script>

<template>
  <div class="nest-page" :class="{ 'is-mini': isMini }">
    <!-- ================= 主区（布局等比缩放，字号不低于设计稿） ================= -->
    <main class="nest-main">
      <NestTopbar />

      <!-- 顶部三张概览卡 -->
      <section class="summary-grid">
        <article class="summary-card">
          <div class="summary-card__content">
            <div class="summary-card__body">
              <div class="summary-card__head">
                <img class="sum-icon" :src="statusIcon" alt="" />
                <h2>{{ mock.summary.nest.title }}</h2>
                <span
                  class="online-inline"
                  :class="workStatusClass"
                >
                  <i />{{ workStatusText }}
                </span>
              </div>
              <div class="summary-card__line summary-card__line--stack">
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">运行时间：</span>
                  <span class="dash_text">{{ nestUptime }}</span>
                </div>
                <div class="status-light-row">
                  <span class="dash">•</span>
                  <span class="dash_title" style="margin-left: -4px;">工作状态灯：</span>
                  <span class="dash_text">
                    <i class="status-light" :class="statusLightClass('green', nestStore.runStatus?.greenLed)" title="绿灯" />
                    <i class="status-light" :class="statusLightClass('yellow', nestStore.runStatus?.yellowLed)" title="黄灯" />
                    <i class="status-light" :class="statusLightClass('red', nestStore.runStatus?.redLed)" title="红灯" />
                  </span>
                </div>
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">工作进程：</span>
                  <span class="dash_text">{{ nestStore.runStatus?.workMsg || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
          <img class="summary-card__decor summary-card__decor--wave" :src="statusTrendChart" alt="" />
        </article>

        <article class="summary-card">
          <div class="summary-card__content">
            <div class="summary-card__body">
              <div class="summary-card__head">
                <img class="sum-icon" :src="plcIcon" alt="" />
                <h2>{{ mock.summary.plc.title }}</h2>
              </div>
              <div class="summary-card__line summary-card__line--stack">
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">最后操作时间：</span>
                  <span class="dash_text">{{ formatOpTime(nestStore.runStatus?.lastActionTime) }}</span>
                </div>
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">最后操作来源：</span>
                  <span class="dash_text">{{ nestStore.runStatus?.lastActionSrc || '--' }}</span>
                </div>
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">最后操作动作：</span>
                  <span class="dash_text">{{ nestStore.runStatus?.lastAction || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
          <img class="summary-card__decor summary-card__decor--bars" :src="plcSignalChart" alt="" style=""/>
        </article>

        <article class="summary-card">
          <div class="summary-card__content">
            <div class="summary-card__body">
              <div class="summary-card__head">
                <img class="sum-icon" :src="basicInfoIcon" alt="" />
                <h2>{{ mock.summary.info.title }}</h2>
              </div>
              <div class="summary-card__line summary-card__line--stack" style="margin-top: 3vh;">
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">机巢编号：</span>
                  <span class="dash_text">{{ systemInfo?.deviceId || '--' }}</span>
                </div>
                <div>
                  <span class="dash">•</span>
                  <span class="dash_title">版本：</span>
                  <span class="dash_text">{{ systemInfo?.ver || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
          <img class="summary-card__decor summary-card__decor--cube" :src="basicInfoCube" alt="" />
        </article>
      </section>

      <NestStatusModules />
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

/* ================= 顶部概览卡 ================= */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1.16fr 1fr;
  gap: calc(var(--s) * 18);

}

.summary-card {
  position: relative;
  overflow: hidden;
  min-height: calc(var(--s) * 124);
  padding: calc(var(--s) * 16) calc(var(--s) * 20);
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: calc(var(--s) * 16);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.82), rgba(244, 249, 255, 0.62));
  box-shadow: 0 10px 26px rgba(93, 140, 210, 0.09);
}

.summary-card__head {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 10);
  white-space: nowrap;
}

.summary-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 14);
  height: 100%;
  padding-right: calc(var(--s) * 176);
}
.summary-card__body {
  min-width: 0;
  height: 100%;
}

.summary-card h2 {
  font-size: calc(var(--fs) * 18);
  font-weight: 700;
  color: #23375f;
  letter-spacing: 0.01em;
}

.sum-icon {
  width: calc(var(--s) * 42);
  height: calc(var(--s) * 42);
  flex: 0 0 calc(var(--s) * 42);
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

.status-light {
  width: calc(var(--s) * 10);
  height: calc(var(--s) * 10);
  flex: 0 0 calc(var(--s) * 10);
  border-radius: 50%;
  background: #2fd39a;
  box-shadow: 0 0 0 calc(var(--s) * 3) rgba(47, 211, 154, 0.18);
}

.status-light--green {
  background: #2fd39a;
  box-shadow: 0 0 0 calc(var(--s) * 3) rgba(47, 211, 154, 0.18);
}

.status-light--yellow {
  background: #f6b73c;
  box-shadow: 0 0 0 calc(var(--s) * 3) rgba(246, 183, 60, 0.2);
}

.status-light--red {
  background: #f45b5b;
  box-shadow: 0 0 0 calc(var(--s) * 3) rgba(244, 91, 91, 0.18);
}

.status-light--off {
  background: #b9c3d5;
  box-shadow: none;
}

.status-light--slow {
  animation: status-light-slow 1.6s ease-in-out infinite;
}

.status-light--fast {
  animation: status-light-fast 0.8s ease-in-out infinite;
}

@keyframes status-light-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

@keyframes status-light-fast {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
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
  padding: calc(var(--s) * 3) calc(var(--s) * 10);
  border-radius: calc(var(--s) * 16);
  background: rgba(226, 247, 236, 0.85);
  gap: calc(var(--s) * 5);
  color: #23b183;
  font-size: calc(var(--fs) * 11);
  font-weight: 600;
}

.online-inline--green {
  color: #23b183;
  background: rgba(226, 247, 236, 0.85);
}

.online-inline--yellow {
  color: #b07814;
  background: rgba(255, 246, 224, 0.9);
}

.online-inline--red {
  color: #d45b5b;
  background: rgba(254, 236, 236, 0.9);
}

.online-inline--muted {
  color: #7b8ba6;
  background: rgba(239, 243, 249, 0.9);
}

.online-inline i {
  width: calc(var(--s) * 6);
  height: calc(var(--s) * 6);
  border-radius: 50%;
  background: #2fd39a;
}

.online-inline--green i {
  background: #2fd39a;
}

.online-inline--yellow i {
  background: #f6b73c;
}

.online-inline--red i {
  background: #d45b5b;
}

.online-inline--muted i {
  background: #9aabc2;
}

.status-light-row {
  display: flex;
  align-items: center;
  gap: calc(var(--s) * 5);
}

.status-light-row .status-light {
  margin-left: calc(var(--s) * 6);
}

/* 状态灯值区：保证三盏灯横向排列 */
.status-light-row .dash_text {
  display: inline-flex;
  align-items: center;
}

.summary-card__line {
  position: relative;
  z-index: 1;
  margin-top: calc(var(--s) * 12);
  color: #4a6394;
  font-size: calc(var(--fs) * 12.5);
}

.summary-card__line--stack {
  margin-top: calc(var(--s) * 12);
  line-height: 1.8;
  white-space: nowrap;
}

.dash {
  color: #4a6394;
  margin-right: calc(var(--s) * 6);
  padding-left: 0.3vw;
}
.dash_title {
  font-weight: 520;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.summary-card__decor {
  position: absolute;
  z-index: 0;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  user-select: none;
}

.summary-card__decor--wave {
  right: calc(var(--s) * 24);
  top: 64%;
  transform: translateY(-50%);
  width: calc(var(--s) * 153);
}

.summary-card__decor--bars {
  right: calc(var(--s) * 24);
  top: 64%;
  width: calc(var(--s) * 143);
}

.summary-card__decor--cube {
  right: calc(var(--s) * 28);
  top: 64%;
  width: calc(var(--s) * 143);
}

/* ================= 小屏：切换布局并回到固定尺寸 ================= */
@media (max-width: 1020px) {
  .nest-main,
  .nest-page.is-mini .nest-main {
    --s: 1px;
    margin-left: 200px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .nest-main,
  .nest-page.is-mini .nest-main {
    --s: 0.9px;
    margin-left: 0;
    padding: 0 12px 20px;
  }

  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }

}

</style>
