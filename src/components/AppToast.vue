<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { removeToast, toastList } from '@/composables/toast'

const ICON: Record<string, string> = {
  success: 'check',
  error: 'alert',
  warning: 'alert',
  info: 'zap',
}
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in toastList"
        :key="item.id"
        class="toast"
        :class="`toast--${item.type}`"
        :role="item.type === 'error' ? 'alert' : 'status'"
      >
        <span class="toast__icon">
          <AppIcon :name="ICON[item.type] ?? 'zap'" :size="15" />
        </span>
        <div class="toast__body">
          <strong>{{ item.message }}</strong>
          <small v-if="item.detail">{{ item.detail }}</small>
        </div>
        <button class="toast__close" type="button" aria-label="关闭" @click="removeToast(item.id)">
          <AppIcon name="close" :size="13" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 320px;
  padding: 11px 12px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--edge);
  box-shadow: var(--shadow-pop);
  pointer-events: auto;
  backdrop-filter: blur(10px);
}

.toast__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border-radius: 7px;
  margin-top: 1px;
}

.toast__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.toast__body strong {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.toast__body small {
  max-height: 180px;
  overflow: auto;
  font-size: var(--fs-xs);
  color: var(--text-3);
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.toast__close {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-4);
  cursor: pointer;
}

.toast__close:hover {
  background: var(--border);
  color: var(--text-2);
}

.toast--success {
  border-left: 2px solid var(--success);
}

.toast--success .toast__icon {
  color: var(--success);
  background: var(--success-weak);
}

.toast--error {
  border-left: 2px solid var(--danger);
}

.toast--error .toast__icon {
  color: var(--danger);
  background: var(--danger-weak);
}

.toast--warning {
  border-left: 2px solid var(--warning);
}

.toast--warning .toast__icon {
  color: var(--warning);
  background: var(--warning-weak);
}

.toast--info {
  border-left: 2px solid var(--accent);
}

.toast--info .toast__icon {
  color: var(--accent);
  background: var(--accent-weak);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(18px) scale(0.98);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(18px) scale(0.98);
}

.toast-move {
  transition: transform 0.2s ease;
}

@media (max-width: 520px) {
  .toasts {
    left: 12px;
    right: 12px;
  }

  .toast {
    width: 100%;
  }
}
</style>
