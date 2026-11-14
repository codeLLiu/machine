<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import NestTopbar from '@/components/NestTopbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppToast from '@/components/AppToast.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAppStore } from '@/stores/app'
import { useNestStore } from '@/stores/nest'

const appStore = useAppStore()
const nestStore = useNestStore()
const route = useRoute()

/** 机巢状态页按设计稿自带侧栏 / 顶栏，使用独立全屏布局 */
const standalone = computed(() => route.meta.standalone === true)

watch(
  () => route.fullPath,
  () => appStore.closeMobileNav(),
)

onMounted(() => {
  nestStore.startPolling(5000)
})

onBeforeUnmount(() => {
  nestStore.stopPolling()
})
</script>

<template>
  <div class="admin tech-bg" :class="{ 'is-mini': appStore.sidebarCollapsed, 'is-standalone': standalone }">
    <AppSidebar v-if="!standalone" :class="{ 'is-open': appStore.mobileNavOpen }" />
    <Transition name="fade">
      <div v-if="appStore.mobileNavOpen && !standalone" class="admin__overlay" @click="appStore.closeMobileNav()" />
    </Transition>

    <div class="admin__main">
      <NestTopbar v-if="!standalone" />
      <main class="admin__content">
        <PageHeader v-if="!standalone" />
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <AppToast />
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background-attachment: fixed;
}

.admin__main {
  margin-left: 240px;
  /* 左侧与侧栏保持间距，避免内容顶到菜单边缘 */
  padding: 8px 28px 48px 24px;
  min-height: 100vh;
  transition: margin-left 0.2s ease;
}

.admin.is-mini .admin__main {
  margin-left: 76px;
}

.admin__content {
  width: 100%;
  max-width: 1760px;
  margin: 0 auto;
}

.admin__overlay {
  position: fixed;
  inset: 0;
  z-index: 19;
  background: var(--scrim);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* 独立全屏页：去掉框架留白，由页面自身绘制侧栏与顶栏 */
.admin.is-standalone {
  background: transparent;
}

.admin.is-standalone .admin__main,
.admin.is-standalone.is-mini .admin__main {
  margin-left: 0;
  padding: 0;
}

.admin.is-standalone .admin__content {
  max-width: none;
}

@media (max-width: 1020px) and (min-width: 901px) {
  .admin__main {
    margin-left: 200px;
  }
}

@media (max-width: 900px) {
  .admin__main,
  .admin.is-mini .admin__main {
    margin-left: 0;
    padding: 12px 14px 40px;
  }

  .admin.is-standalone .admin__main,
  .admin.is-standalone.is-mini .admin__main {
    padding: 0;
  }
}
</style>
