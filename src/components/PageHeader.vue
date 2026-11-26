<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { findMenuTrail } from '@/router'
import { useToast } from '@/composables/toast'
import { useNestStore } from '@/stores/nest'

const route = useRoute()
const nestStore = useNestStore()
const toast = useToast()

const SUBTITLE: Record<string, string> = {
  overview: '实时掌握设备、电量与作业流程 · 合肥机巢 A',
  'config-camera': '实时画面、推流控制与 RTSP 地址管理',
  'config-plc': 'PLC 通讯参数与连接自检',
  'config-mqtt': 'Broker 连接、身份认证与 SSL 证书',
  'debug-module': '按模块切换调试参数，实时回显位置与状态字',
  'module-params': '模块组配置与 Beam 信号位映射',
  system: '服务状态与维护操作',
  monitor: '三路摄像头画面与推流状态',
  design: 'FlowHub 设计令牌与组件规范',
}

const trail = computed(() => findMenuTrail(route.name))
const title = computed(
  () => trail.value.title || (typeof route.meta.title === 'string' ? route.meta.title : '工作台'),
)
const subtitle = computed(
  () => (typeof route.name === 'string' && SUBTITLE[route.name]) || '机巢运营控制台 · 全链路状态',
)
const dateText = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
)

function refresh(): void {
  void nestStore.refreshStatus()
  toast.info('正在刷新运行数据')
}
</script>

<template>
  <div class="pagehead">
    <div class="pagehead__main">
      <div class="crumb"><b>{{ trail.group || '工作台' }}</b> / {{ title }}</div>
      <h1>{{ title }}</h1>
      <p>{{ subtitle }} · <span>{{ nestStore.mode === 'live' ? '实时数据' : '设备离线' }}</span></p>
    </div>

    <div class="headact">
      <button class="fh-pill headact__refresh" type="button" title="刷新" @click="refresh">
        <AppIcon name="refresh" :size="15" /> 刷新
      </button>
      <span class="fh-pill">
        <AppIcon name="clock" :size="15" /> {{ dateText }}
        <AppIcon name="chevronDown" :size="13" />
      </span>
      <span class="fh-pill"><AppIcon name="cpu" :size="15" /> 机巢 A · HEFEI-01（写死数据）</span>
    </div>
  </div>
</template>

<style scoped>
.pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.pagehead__main {
  min-width: 0;
}

.crumb {
  margin-bottom: 7px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--text-3);
}

.crumb b {
  color: var(--primary);
}

h1 {
  margin: 0;
  font-size: 33px;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--text);
}

p {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

p span {
  color: var(--primary);
}

.headact {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.headact__refresh {
  cursor: pointer;
}

.headact__refresh:hover {
  color: var(--primary);
}

@media (max-width: 860px) {
  h1 {
    font-size: 27px;
  }
}

@media (max-width: 600px) {
  h1 {
    font-size: 23px;
  }
}
</style>
