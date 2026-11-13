<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { COORD_GROUPS, MODULES } from '@/data/fixtures'
import { useToast } from '@/composables/toast'

const toast = useToast()
const query = ref('')
const selected = ref(MODULES[0].key)
const beamsAll = ref(false)

const GROUP_TEXT = {
  axis: '模组 / 轴',
  end: '末端执行器',
  door: '舱门与规整',
} as const

const MODE_TEXT = {
  position: '位置模式',
  speed: '速度模式',
  servo: '伺服使能',
} as const

const current = computed(() => MODULES.find((module) => module.key === selected.value) ?? MODULES[0])

const filteredModules = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return MODULES
  return MODULES.filter((module) =>
    [module.name, module.deviceNo, module.port, module.type, ...module.axes.map((axis) => axis.label)]
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})

const beams = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return COORD_GROUPS
  return COORD_GROUPS.filter((group) =>
    [group.label, ...group.items.map((item) => `${item.axis} ${item.value}`)]
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})

const visibleBeams = computed(() => (beamsAll.value ? beams.value : beams.value.slice(0, 8)))

function demoAction(): void {
  toast.info('演示数据', '接入设备后可加载配置并写入模块参数')
}
</script>

<template>
  <div class="page">
    <div class="fh-toolbar">
      <label class="fh-search">
        <AppIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索模块 / 串口 / 信号位…" aria-label="搜索模块参数" />
      </label>
      <div class="fh-toolbar__sp" />
      <span class="tag tag--info">{{ filteredModules.length }} / {{ MODULES.length }} 个模块</span>
      <button class="btn btn--ghost btn--sm" type="button" @click="demoAction">
        <AppIcon name="refresh" :size="13" /> 加载配置
      </button>
      <button class="btn btn--primary btn--sm" type="button" @click="demoAction">
        <AppIcon name="plus" :size="13" /> 添加模块
      </button>
    </div>

    <article class="fh-card">
      <div class="fh-card__hd">
        <div>
          <div class="fh-card__t"><AppIcon name="layers" :size="16" /> 模块组</div>
          <div class="fh-card__s">原稿灰色折叠条 → 可切换的模块参数卡，切换后参数即时回显</div>
        </div>
        <span class="tag tag--success">{{ GROUP_TEXT[current.group] }}</span>
      </div>

      <div class="tabs">
        <button
          v-for="module in MODULES"
          :key="module.key"
          class="tab"
          :class="{ on: module.key === selected }"
          type="button"
          @click="selected = module.key"
        >
          {{ module.name }}
        </button>
      </div>

      <div class="fh-meta">
        <span>名称 <b>{{ current.name }}</b></span>
        <span>设备编号 <b>{{ current.deviceNo }}</b></span>
        <span>类型 <b>{{ current.type }}</b></span>
        <span>串口 <b>{{ current.port }}</b></span>
        <span>轴 <b>{{ current.axes.map((axis) => axis.label).join(' / ') }}</b></span>
        <span>模式 <b>{{ MODE_TEXT[current.mode] }}</b></span>
      </div>

      <div class="fh-grid fh-grid--4">
        <div class="tile">
          <span class="tile__label">预设位置</span>
          <span class="tile__value">{{ current.presets.length }}</span>
          <span class="tile__foot">已配置位置数</span>
        </div>
        <div class="tile">
          <span class="tile__label">关联轴</span>
          <span class="tile__value">{{ current.axes.length }}</span>
          <span class="tile__foot">{{ current.axes.map((axis) => axis.label).join(' / ') }}</span>
        </div>
        <div class="tile">
          <span class="tile__label">指令编号</span>
          <span class="tile__value">{{ current.speed }}</span>
          <span class="tile__foot">runSpeed 参考值</span>
        </div>
        <div class="tile">
          <span class="tile__label">单位</span>
          <span class="tile__value tile__value--sm">{{ current.unit }}</span>
          <span class="tile__foot">{{ MODE_TEXT[current.mode] }}</span>
        </div>
      </div>
    </article>

    <article class="fh-card">
      <div class="fh-card__hd">
        <div>
          <div class="fh-card__t"><AppIcon name="list" :size="16" /> Beams · 信号位映射</div>
          <div class="fh-card__s">位置预设与关联状态字，点击右侧图标可展开编辑语义</div>
        </div>
        <span class="tag tag--info">{{ beams.length }} / {{ COORD_GROUPS.length }} 项</span>
      </div>

      <div class="fh-toolbar">
        <button class="btn btn--primary btn--sm" type="button" @click="demoAction">
          <AppIcon name="plus" :size="13" /> 添加 BEAN
        </button>
        <button class="btn btn--ghost btn--sm" type="button" @click="demoAction">
          <AppIcon name="upload" :size="13" /> 批量添加
        </button>
        <div class="fh-toolbar__sp" />
        <button v-if="beams.length > 8" class="link" type="button" @click="beamsAll = !beamsAll">
          {{ beamsAll ? '全部收起' : '全部展开' }} →
        </button>
      </div>

      <div class="beams">
        <div v-for="group in visibleBeams" :key="group.label" class="beam">
          <span class="beam__n">{{ group.label }}</span>
          <span class="beam__d">
            <span v-for="item in group.items" :key="item.axis" class="mono">
              {{ item.axis }}: <b>{{ item.value }}</b>
            </span>
          </span>
          <button class="icon-btn" type="button" aria-label="编辑" title="编辑" @click="demoAction">
            <AppIcon name="settings" :size="13" />
          </button>
          <button class="icon-btn" type="button" aria-label="删除" title="删除" @click="demoAction">
            <AppIcon name="trash" :size="13" />
          </button>
        </div>
        <div v-if="!beams.length" class="fh-empty">没有匹配的 Beam</div>
      </div>
    </article>

    <div class="fh-note">
      <AppIcon name="info" :size="15" />
      <span>原稿里红色小方块是删除按钮、没有文字也没有无障碍标签；这里换成带悬停说明的线性图标，并统一了信息层级。</span>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.tab {
  padding: 7px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.tab:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.tab.on {
  border-color: transparent;
  background: var(--primary);
  color: #fff;
  box-shadow: 0 5px 14px rgba(31, 107, 255, 0.25);
}

.beams {
  border-top: 1px solid var(--border);
}

.beam {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.beam:last-child {
  border-bottom: 0;
}

.beam:hover {
  background: var(--surface-2);
}

.beam__n {
  min-width: 118px;
  padding: 4px 9px;
  border-radius: 7px;
  background: var(--primary-weak);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
}

.beam__d {
  display: flex;
  gap: 16px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  color: var(--text-2);
  font-size: 11px;
}

.beam__d b {
  color: var(--text);
}

.link {
  border: 0;
  background: none;
  color: var(--primary);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .beam {
    flex-wrap: wrap;
  }
}
</style>
