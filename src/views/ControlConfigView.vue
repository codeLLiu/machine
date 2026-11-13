<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { CONTROL_CONFIGS, type ControlConfig } from '@/data/fixtures'
import { useToast } from '@/composables/toast'

const toast = useToast()
const query = ref('')

const configs = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return CONTROL_CONFIGS
  return CONTROL_CONFIGS.filter((item) =>
    [item.name, item.topic, item.port, item.register, item.type].some((value) =>
      value.toLowerCase().includes(q),
    ),
  )
})

function rows(item: ControlConfig): [string, string][] {
  return [
    ['订阅主题', item.topic],
    ['串口', item.port],
    ['controlType', item.type],
    ['register', item.register],
  ]
}

function demoAction(): void {
  toast.info('演示数据', '接入设备后可在写入接口中新增 / 编辑控制配置')
}
</script>

<template>
  <div class="page">
    <div class="fh-toolbar">
      <label class="fh-search">
        <AppIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索配置名称或串口…" aria-label="搜索控制配置" />
      </label>
      <div class="fh-toolbar__sp" />
      <span class="tag tag--info">{{ configs.length }} / {{ CONTROL_CONFIGS.length }} 项配置</span>
      <button class="btn btn--ghost btn--sm" type="button" @click="demoAction">
        <AppIcon name="download" :size="13" /> 导入
      </button>
      <button class="btn btn--ghost btn--sm" type="button" @click="demoAction">
        <AppIcon name="upload" :size="13" /> 导出
      </button>
      <button class="btn btn--primary btn--sm" type="button" @click="demoAction">
        <AppIcon name="plus" :size="13" /> 新增控制
      </button>
    </div>

    <div class="fh-grid fh-grid--2">
      <article v-for="item in configs" :key="item.key" class="fh-card config-card">
        <div class="fh-card__hd">
          <div>
            <div class="fh-card__t"><AppIcon name="sliders" :size="16" /><span class="mono">{{ item.name }}</span></div>
            <div class="fh-card__s">控制指令 → 端口 / 寄存器映射</div>
          </div>
          <span class="tag tag--success">已启用</span>
        </div>

        <div class="fh-rows">
          <div v-for="[key, value] in rows(item)" :key="key" class="fh-row">
            <span class="fh-row__k">{{ key }}</span>
            <span class="fh-row__v">{{ value }}</span>
          </div>
        </div>

        <div class="config-card__act">
          <button class="icon-btn" type="button" aria-label="编辑配置" title="编辑配置" @click="demoAction">
            <AppIcon name="settings" :size="14" />
          </button>
          <button class="icon-btn" type="button" aria-label="删除配置" title="删除配置" @click="demoAction">
            <AppIcon name="trash" :size="14" />
          </button>
        </div>
      </article>

      <div v-if="!configs.length" class="fh-card fh-empty">没有匹配的控制配置</div>
    </div>

    <div class="fh-note">
      <AppIcon name="info" :size="15" />
      <span>原稿把字段名与取值挤成连续小字；这里改为左标签右取值的对齐栅格，主题 / 串口等长串可完整扫读。</span>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
}

.config-card {
  position: relative;
  margin-bottom: 0;
}

.config-card__act {
  position: absolute;
  right: 16px;
  bottom: 14px;
  display: flex;
  gap: 2px;
}
</style>
