<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { SERIAL_DEVICES, type SerialDevice } from '@/data/fixtures'
import { useToast } from '@/composables/toast'

const toast = useToast()
const query = ref('')
const expanded = ref<Record<string, boolean>>({})

const devices = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return SERIAL_DEVICES
  return SERIAL_DEVICES.filter(
    (device) =>
      device.name.toLowerCase().includes(q) ||
      device.port.toLowerCase().includes(q) ||
      device.topic.toLowerCase().includes(q),
  )
})

function lines(device: SerialDevice): string[] {
  return device.registers.flatMap((register) => [
    register.address,
    ...register.fields.map((field) => `${field.name} (十进制结果, ${field.range})`),
  ])
}

function meta(device: SerialDevice): [string, string][] {
  return [
    ['串口', device.port],
    ['波特率', String(device.baud)],
    ['轮询间隔', `${device.poll} ms`],
    ['发布间隔', `${device.publish} s`],
    ['发布主题', device.topic],
    ['重要信息', device.important ? '是' : '否'],
  ]
}

function toggle(key: string): void {
  expanded.value = { ...expanded.value, [key]: !expanded.value[key] }
}

function demoAction(): void {
  toast.info('演示数据', '接入设备后可在写入接口中新增 / 编辑配置')
}
</script>

<template>
  <div class="page">
    <div class="fh-toolbar">
      <label class="fh-search">
        <AppIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索设备名称或串口…" aria-label="搜索串口设备" />
      </label>
      <div class="fh-toolbar__sp" />
      <span class="tag tag--info">{{ devices.length }} / {{ SERIAL_DEVICES.length }} 路设备</span>
      <button class="btn btn--ghost btn--sm" type="button" @click="demoAction">
        <AppIcon name="download" :size="13" /> 导入
      </button>
      <button class="btn btn--ghost btn--sm" type="button" @click="demoAction">
        <AppIcon name="upload" :size="13" /> 导出
      </button>
      <button class="btn btn--primary btn--sm" type="button" @click="demoAction">
        <AppIcon name="plus" :size="13" /> 新增设备
      </button>
    </div>

    <div class="fh-grid fh-grid--2">
      <article v-for="device in devices" :key="device.key" class="fh-card serial-card">
        <div class="fh-card__hd">
          <div>
            <div class="fh-card__t"><AppIcon name="plug" :size="16" /><span class="mono">{{ device.name }}</span></div>
            <div class="fh-card__s">轮询设备 · {{ device.registers.length }} 组报文 · {{ lines(device).length }} 条字段</div>
          </div>
          <span class="tag" :class="device.important ? 'tag--warning' : 'tag--info'">
            {{ device.important ? '重要' : '常规' }}
          </span>
        </div>

        <div class="fh-meta">
          <span v-for="[key, value] in meta(device)" :key="key">{{ key }} <b>{{ value }}</b></span>
        </div>

        <div class="fh-rows">
          <div
            v-for="(line, index) in lines(device)"
            v-show="expanded[device.key] || index < 6"
            :key="`${device.key}-${index}`"
            class="fh-row"
          >
            <span class="fh-row__t" :title="line">{{ line }}</span>
            <button class="icon-btn" type="button" aria-label="编辑字段" title="编辑字段" @click="demoAction">
              <AppIcon name="settings" :size="13" />
            </button>
            <button class="icon-btn" type="button" aria-label="删除字段" title="删除字段" @click="demoAction">
              <AppIcon name="trash" :size="13" />
            </button>
          </div>
          <button
            v-if="lines(device).length > 6"
            class="link"
            type="button"
            @click="toggle(device.key)"
          >
            {{ expanded[device.key] ? '收起' : `展开其余 ${lines(device).length - 6} 条` }}
            <AppIcon :name="expanded[device.key] ? 'chevronUp' : 'chevronDown'" :size="13" />
          </button>
        </div>
      </article>

      <div v-if="!devices.length" class="fh-card fh-empty">没有匹配的串口设备</div>
    </div>

    <div class="fh-note">
      <AppIcon name="info" :size="15" />
      <span>
        原稿用红 / 蓝随机英文标题区分卡片，这里统一为等权重的等宽设备名，用「重要 / 常规」状态胶囊表达优先级；
        长字段列表默认收起，避免首屏过载。
      </span>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
}

.serial-card {
  margin-bottom: 0;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 2px;
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
</style>
