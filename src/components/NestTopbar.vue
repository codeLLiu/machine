<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useToast } from '@/composables/toast'
import { useAppStore } from '@/stores/app'
import { useNestStore } from '@/stores/nest'

const toast = useToast()
const appStore = useAppStore()
const nestStore = useNestStore()
const device = computed(() => ({
  onlineText: nestStore.mode === 'live' ? '设备在线' : '设备离线',
  address: '117.140.203.9:8970',
  channel: '设备 API',
    notifications: (Array.isArray(nestStore.plcErrors) ? nestStore.plcErrors : []).filter((axis) =>
    [axis.axisPowerErr, axis.axisStatusErr, axis.servoErrorErr, axis.servoAxisErr].some((code) => code && code !== '0'),
  ).length,
  avatar: '机',
}))

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else if (document.documentElement.requestFullscreen) {
    void document.documentElement.requestFullscreen().catch(() => {})
  }
}

function showNotifications(): void {
  toast.info('设备告警', device.value.notifications ? `当前有 ${device.value.notifications} 个轴存在错误码` : '暂无轴错误告警')
}

function showAccountNotice(): void {
  toast.info('账号管理功能待开发')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <button class="mobile-menu" type="button" aria-label="打开导航" @click="appStore.toggleMobileNav()">
        <AppIcon name="menu" :size="18" />
      </button>
      <span class="online-dot" :class="{ 'online-dot--offline': nestStore.mode !== 'live' }" />
      <strong class="online-text">{{ device.onlineText }}</strong>
      <span class="addr">{{ device.address }}</span>
      <span class="channel">{{ device.channel }}</span>
    </div>

    <div class="topbar__right">
      <button class="icon-btn" type="button" aria-label="设备告警" @click="showNotifications">
        <AppIcon name="bell" :size="19" />
        <span class="badge">{{ device.notifications }}</span>
      </button>
      <button class="icon-btn" type="button" aria-label="全屏" @click="toggleFullscreen">
        <AppIcon name="expand" :size="17" />
      </button>
      <button class="user" type="button" aria-label="用户菜单" @click="showAccountNotice">
        <span class="user__avatar">{{ device.avatar }}</span>
        <AppIcon name="chevronDown" :size="13" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--s, 1px) * 16);
  height: calc(var(--s, 1px) * 76);
  padding: 0 calc(var(--s, 1px) * 10);
}

.topbar__left,
.topbar__right {
  display: flex;
  align-items: center;
}

.topbar__left {
  gap: calc(var(--s, 1px) * 10);
  font-size: calc(var(--fs, 1px) * 12.5);
}

.online-dot {
  width: calc(var(--s, 1px) * 8);
  height: calc(var(--s, 1px) * 8);
  border-radius: 50%;
  background: #2fd39a;
  box-shadow: 0 0 0 calc(var(--s, 1px) * 4) rgba(47, 211, 154, 0.14);
}

.online-dot--offline {
  background: #e49b38;
  box-shadow: 0 0 0 calc(var(--s, 1px) * 4) rgba(228, 155, 56, 0.14);
}

.online-text {
  color: #23b183;
  font-weight: 700;
}

.online-dot--offline + .online-text {
  color: #b47b26;
}

.addr {
  color: #5f77a0;
  font-weight: 600;
}

.channel {
  color: #9db1cd;
}

.topbar__right {
  gap: calc(var(--s, 1px) * 20);
}

.icon-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: calc(var(--s, 1px) * 26);
  height: calc(var(--s, 1px) * 26);
  padding: 0;
  border: 0;
  background: none;
  color: #3f5f9e;
  cursor: pointer;
}

.icon-btn svg {
  width: calc(var(--s, 1px) * 19);
  height: calc(var(--s, 1px) * 19);
}

.badge {
  position: absolute;
  top: calc(var(--s, 1px) * -5);
  right: calc(var(--s, 1px) * -7);
  display: grid;
  place-items: center;
  width: calc(var(--s, 1px) * 15);
  height: calc(var(--s, 1px) * 15);
  border: 2px solid #e3eefd;
  border-radius: 50%;
  background: #ff5c6c;
  color: #fff;
  font-size: calc(var(--fs, 1px) * 9);
  line-height: 1;
}

.user {
  display: flex;
  align-items: center;
  gap: calc(var(--s, 1px) * 8);
  padding: 0;
  border: 0;
  background: none;
  color: #7f93b4;
  cursor: pointer;
}

.user__avatar {
  display: grid;
  place-items: center;
  width: calc(var(--s, 1px) * 34);
  height: calc(var(--s, 1px) * 34);
  border-radius: 50%;
  background: linear-gradient(135deg, #6e9dff, #3f6fd8);
  color: #fff;
  font-size: calc(var(--fs, 1px) * 14);
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(63, 111, 216, 0.28);
}

.mobile-menu {
  display: none;
}

@media (max-width: 900px) {
  .topbar {
    height: 58px;
    padding: 0;
  }

  .mobile-menu {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-right: 2px;
    padding: 0;
    border: 0;
    background: none;
    color: #3f5f9e;
    cursor: pointer;
  }

  .channel {
    display: none;
  }
}
</style>
