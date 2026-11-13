<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const principles = [
  {
    icon: 'layers',
    title: '浅蓝渐变与玻璃侧栏',
    text: '固定渐变底 + 悬浮玻璃导航，内容区以 16px 为节奏留白，空间层次取代深色边框。',
  },
  {
    icon: 'palette',
    title: '白色大圆角卡片',
    text: '所有卡片统一 18px 圆角、极淡蓝色阴影与 1px 高光边，避免视觉噪声。',
  },
  {
    icon: 'zap',
    title: '语义化状态色',
    text: '绿=到位、蓝=信息、橙=接近 / 需关注、红=不可恢复动作；危险操作强制二次确认。',
  },
  {
    icon: 'sun',
    title: '双主题，跟着环境走',
    text: '白天浅蓝、夜里深蓝。默认跟随系统，也可以在顶栏一键固定。',
  },
]

const palette = computed(() => {
  const dark = themeStore.isDark
  return [
    { name: '背景', token: '--bg', value: dark ? '#0C1830' : '#EEF6FF' },
    { name: '卡片', token: '--surface', value: dark ? '#172945' : '#FFFFFF' },
    { name: '次级面', token: '--surface-2', value: dark ? '#1D3455' : '#F3F8FF' },
    { name: '描边', token: '--border', value: dark ? '#2B436C' : '#E2ECFC' },
    { name: '主文字', token: '--text', value: dark ? '#EAF2FF' : '#142341' },
    { name: '次文字', token: '--text-2', value: dark ? '#A7BBDD' : '#5E7196' },
    { name: '辅助文字', token: '--text-3', value: dark ? '#8EA6CC' : '#8195B6' },
    { name: '主色', token: '--primary', value: dark ? '#5D95FF' : '#1F6BFF' },
  ]
})

const statusColors = computed(() => {
  const dark = themeStore.isDark
  return [
    { name: '正常', token: '--success', value: dark ? '#3BD39C' : '#0BAB78' },
    { name: '注意', token: '--warning', value: dark ? '#F5B74E' : '#D4880D' },
    { name: '故障', token: '--danger', value: dark ? '#FF7180' : '#EE4D5C' },
    { name: '强调', token: '--accent', value: dark ? '#42D3E3' : '#24C2D6' },
  ]
})

const typeScale = [
  { name: '页面标题', token: '--fs-2xl', size: '33px', sample: '机巢状态总览' },
  { name: '卡片标题', token: '--fs-md', size: '15px', sample: '环境监测' },
  { name: '正文', token: '--fs-base', size: '14px', sample: '舱内温度 26.5 ℃，湿度 46%RH' },
  { name: '辅助信息', token: '--fs-sm', size: '12.5px', sample: '数据每 5 秒刷新一次' },
  { name: '最小字号', token: '--fs-xs', size: '11px', sample: '更新时间 17:42:08' },
]

const spacing = [4, 8, 12, 16, 20, 24, 32]
</script>

<template>
  <div class="page">
    <section class="hero panel">
      <div class="hero__main">
        <span class="hero__eyebrow mono">FLOW STYLE · DESIGN SYSTEM v4</span>
        <h1 class="hero__title">让每一次起降都可被看见</h1>
        <p class="hero__lede">
          源自 FlowHub Operations Dashboard 的设计语言：<strong>浅蓝渐变底、悬浮玻璃导航、白色大圆角卡片</strong>，
          配合语义化状态色与蓝色数据可视化。所有取值都写在
          <code class="mono">src/styles/main.css</code> 的 FlowHub 风格层，改一处全局生效。
        </p>
      </div>
      <div class="hero__side">
        <div class="theme-switch">
          <span class="theme-switch__label">预览主题</span>
          <div class="seg">
            <button
              class="seg__item"
              :class="{ 'is-active': themeStore.resolved === 'light' }"
              type="button"
              @click="themeStore.setMode('light')"
            >
              浅色 · 日间
            </button>
            <button
              class="seg__item"
              :class="{ 'is-active': themeStore.resolved === 'dark' }"
              type="button"
              @click="themeStore.setMode('dark')"
            >
              深色 · 夜间
            </button>
          </div>
        </div>
        <p class="theme-switch__hint">
          <AppIcon name="sun" :size="13" />
          当前：{{ themeStore.label }}，可在顶栏一键切换
        </p>
      </div>
    </section>

    <section class="principles">
      <article v-for="item in principles" :key="item.title" class="panel principle">
        <span class="principle__icon">
          <AppIcon :name="item.icon" :size="17" />
        </span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
      </article>
    </section>

    <section class="cols">
      <article class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">蓝色色阶</h2>
            <p class="panel__sub">浅蓝渐变底与白色卡片之间留出层次</p>
          </div>
        </header>
        <div class="panel__body">
          <ul class="swatches">
            <li v-for="c in palette" :key="c.token" class="swatch">
              <span class="swatch__chip" :style="{ background: `var(${c.token})` }" />
              <span class="swatch__meta">
                <strong>{{ c.name }}</strong>
                <small class="mono">{{ c.value }}</small>
              </span>
            </li>
          </ul>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">状态色</h2>
            <p class="panel__sub">语义化配色，危险动作单独分级</p>
          </div>
        </header>
        <div class="panel__body">
          <ul class="swatches">
            <li v-for="c in statusColors" :key="c.token" class="swatch">
              <span class="swatch__chip" :style="{ background: `var(${c.token})` }" />
              <span class="swatch__meta">
                <strong>{{ c.name }}</strong>
                <small class="mono">{{ c.value }}</small>
              </span>
            </li>
          </ul>
          <div class="tags">
            <span class="tag tag--success">运行正常</span>
            <span class="tag tag--warning">待确认</span>
            <span class="tag tag--danger">舱门故障</span>
            <span class="tag tag--info">执行中</span>
            <span class="tag tag--muted">已停止</span>
          </div>
        </div>
      </article>
    </section>

    <section class="cols">
      <article class="panel">
        <header class="panel__head">
          <h2 class="panel__title">排版层级</h2>
          <span class="panel__sub">最小 12px，行高 1.6</span>
        </header>
        <div class="panel__body">
          <ul class="type">
            <li v-for="t in typeScale" :key="t.token" class="type__row">
              <span class="type__sample" :style="{ fontSize: `var(${t.token})` }">{{ t.sample }}</span>
              <span class="type__meta mono">{{ t.size }}</span>
            </li>
          </ul>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <h2 class="panel__title">间距与圆角</h2>
          <span class="panel__sub">8pt 栅格</span>
        </header>
        <div class="panel__body">
          <ul class="space">
            <li v-for="s in spacing" :key="s" class="space__row">
              <span class="space__bar" :style="{ width: `${s * 4}px` }" />
              <span class="space__meta mono">{{ s }}px</span>
            </li>
          </ul>
          <div class="radius">
            <span class="radius__box" style="border-radius: 6px">6</span>
            <span class="radius__box" style="border-radius: 8px">8</span>
            <span class="radius__box" style="border-radius: 12px">12</span>
          </div>
        </div>
      </article>
    </section>

    <article class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">组件样例</h2>
          <p class="panel__sub">按钮 / 输入 / 开关 / 表格，均已适配双主题</p>
        </div>
      </header>
      <div class="panel__body comp">
        <div class="comp__block">
          <span class="comp__label">按钮</span>
          <div class="comp__row">
            <button class="btn btn--primary" type="button">主要操作</button>
            <button class="btn" type="button">次要操作</button>
            <button class="btn btn--ghost" type="button">幽灵按钮</button>
            <button class="btn btn--danger" type="button">危险操作</button>
          </div>
        </div>

        <div class="comp__block">
          <span class="comp__label">表单</span>
          <div class="comp__row">
            <label class="field comp__field">
              <span class="field__label">PLC 地址</span>
              <input class="input mono" value="192.168.10.88" />
            </label>
            <label class="switch">
              <input type="checkbox" checked />
              <span class="switch__track" />
              自动刷新
            </label>
          </div>
        </div>

        <div class="comp__block comp__block--full">
          <span class="comp__label">表格</span>
          <table class="table">
            <thead>
              <tr>
                <th>通道</th>
                <th>状态</th>
                <th>码流</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>舱内云台 01</td>
                <td><span class="tag tag--success">推流中</span></td>
                <td class="mono">1080P / 4Mbps</td>
              </tr>
              <tr>
                <td>舱外枪机 02</td>
                <td><span class="tag tag--muted">已停止</span></td>
                <td class="mono">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  padding: 26px 28px;
  align-items: center;
}

.hero__eyebrow {
  font-size: var(--fs-xs);
  color: var(--text-4);
  letter-spacing: 2px;
}

.hero__title {
  margin-top: 8px;
  font-size: var(--fs-2xl);
  font-weight: 650;
  letter-spacing: -0.4px;
}

.hero__lede {
  margin-top: 10px;
  max-width: 640px;
  font-size: var(--fs-base);
  line-height: 1.75;
  color: var(--text-3);
}

.hero__lede strong {
  color: var(--text);
  font-weight: 600;
}

.hero__lede code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--surface-2);
  font-size: var(--fs-xs);
}

.hero__side {
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.theme-switch {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-switch__label {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.theme-switch .seg {
  width: 100%;
}

.theme-switch .seg__item {
  flex: 1;
}

.theme-switch__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: var(--fs-xs);
  color: var(--text-3);
}

.principles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.principle {
  padding: 18px 18px 20px;
}

.principle__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  color: var(--primary);
  background: var(--primary-weak);
}

.principle h3 {
  margin-top: 12px;
  font-size: var(--fs-base);
  font-weight: 600;
}

.principle p {
  margin-top: 6px;
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--text-3);
}

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.swatches {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.swatch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.swatch__chip {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
}

.swatch__meta {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
  min-width: 0;
}

.swatch__meta strong {
  font-size: var(--fs-sm);
  font-weight: 500;
}

.swatch__meta small {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.type__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
}

.type__row + .type__row {
  border-top: 1px solid var(--border);
}

.type__sample {
  color: var(--text);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type__meta {
  font-size: var(--fs-xs);
  color: var(--text-4);
  flex: 0 0 auto;
}

.space {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.space__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.space__bar {
  height: 10px;
  border-radius: 3px;
  background: var(--primary);
  opacity: 0.7;
}

.space__meta {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.radius {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.radius__box {
  display: grid;
  place-items: center;
  width: 52px;
  height: 40px;
  font-size: var(--fs-xs);
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
}

.comp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px 28px;
}

.comp__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comp__block--full {
  grid-column: 1 / -1;
}

.comp__label {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.comp__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.comp__field {
  width: 180px;
}

@media (max-width: 1200px) {
  .principles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cols {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .principles,
  .swatches,
  .comp {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
