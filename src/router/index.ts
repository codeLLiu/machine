import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import AdminLayout from '@/layouts/AdminLayout.vue'
import FeaturePending from '@/components/FeaturePending.vue'
import NestStatusView from '@/views/NestStatusView.vue'
import { useUserStore } from '@/stores/user'

export interface MenuItem {
  name: string
  title: string
  icon: string
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

/** 侧栏菜单：分组与图标对照 UI 优化方案设计稿 */
export const appMenu: MenuGroup[] = [
  {
    label: '总览',
    items: [{ name: 'overview', title: '机巢状态', icon: 'navStatus' }],
  },
  {
    label: '配置',
    items: [
      { name: 'config-serial', title: '串口', icon: 'navSerial' },
      { name: 'config-control', title: '控制', icon: 'navControl' },
      { name: 'config-camera', title: '摄像头', icon: 'navCamera' },
      { name: 'config-plc', title: 'PLC', icon: 'navPlc' },
      { name: 'config-mqtt', title: 'MQTT', icon: 'navMqtt' },
    ],
  },
  {
    label: '测试',
    items: [
      { name: 'debug-func', title: '功能调试', icon: 'navFuncDebug' },
      { name: 'debug-module', title: '模拟调试', icon: 'navModuleDebug' },
      { name: 'module-params', title: '模块参数', icon: 'navParams' },
    ],
  },
  {
    label: '系统',
    items: [{ name: 'system', title: '系统服务', icon: 'navSystem' }],
  },
]

export interface MenuTrail {
  title: string
  group: string
}

/** 顶栏面包屑：按当前路由名找到所属分组与菜单标题 */
export function findMenuTrail(name: string | symbol | null | undefined): MenuTrail {
  if (typeof name !== 'string') return { title: '', group: '' }
  for (const group of appMenu) {
    const item = group.items.find((entry) => entry.name === name)
    if (item) return { title: item.title, group: group.label }
  }
  return { title: '', group: '' }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/overview',
    children: [
      {
        path: 'overview',
        name: 'overview',
        component: NestStatusView,
        meta: { title: '机巢状态', standalone: true },
      },
      {
        path: 'config/serial',
        name: 'config-serial',
        component: FeaturePending,
        meta: { title: '串口' },
      },
      {
        path: 'config/control',
        name: 'config-control',
        component: FeaturePending,
        meta: { title: '控制' },
      },
      {
        path: 'config/camera',
        name: 'config-camera',
        component: () => import('@/views/ConfigView.vue'),
        meta: { title: '摄像头', section: 'camera' },
      },
      {
        path: 'config/plc',
        name: 'config-plc',
        component: () => import('@/views/ConfigView.vue'),
        meta: { title: 'PLC', section: 'plc' },
      },
      {
        path: 'config/mqtt',
        name: 'config-mqtt',
        component: () => import('@/views/ConfigView.vue'),
        meta: { title: 'MQTT', section: 'mqtt' },
      },
      {
        path: 'debug/func',
        name: 'debug-func',
        component: () => import('@/views/ControlView.vue'),
        meta: { title: '功能调试' },
      },
      {
        path: 'debug/module',
        name: 'debug-module',
        component: () => import('@/views/DebugView.vue'),
        meta: { title: '模块调试' },
      },
      {
        path: 'module-params',
        name: 'module-params',
        component: FeaturePending,
        meta: { title: '模块参数' },
      },
      {
        path: 'system',
        name: 'system',
        component: () => import('@/views/SystemView.vue'),
        meta: { title: '系统服务' },
      },

      /* 不在新版侧栏展示、但保留直达入口的页面 */
      {
        path: 'monitor',
        name: 'monitor',
        component: () => import('@/views/MonitorView.vue'),
        meta: { title: '视频监控' },
      },
      {
        path: 'design',
        name: 'design',
        component: FeaturePending,
        meta: { title: '设计规范' },
      },

      /* 兼容旧地址 */
      { path: 'control', redirect: { name: 'debug-func' } },
      { path: 'config', redirect: { name: 'config-plc' } },
      { path: 'debug', redirect: { name: 'debug-module' } },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? `${title} · 机巢中枢控制台` : '机巢中枢控制台'
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (!userStore.isLoggedIn && to.name !== 'login') {
    return { name: 'login' }
  }
  return true
})

export default router
