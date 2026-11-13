<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

interface Props {
  open: boolean
  title: string
  message: string
  detail?: string
  confirmText?: string
  danger?: boolean
  busy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  detail: '',
  confirmText: '确认执行',
  danger: false,
  busy: false,
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'confirm'): void
}>()

function close(): void {
  if (props.busy) return
  emit('update:open', false)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

watch(
  () => props.open,
  (value) => {
    document.body.style.overflow = value ? 'hidden' : ''
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="props.open" class="mask" @click.self="close">
        <div class="dialog" :class="{ 'dialog--danger': props.danger }" role="dialog" aria-modal="true">
          <div class="dialog__bar" />
          <header class="dialog__head">
            <span class="dialog__icon">
              <AppIcon :name="props.danger ? 'alert' : 'shield'" :size="18" />
            </span>
            <div>
              <h3 class="dialog__title">{{ props.title }}</h3>
              <p class="dialog__message">{{ props.message }}</p>
            </div>
          </header>

          <p v-if="props.detail" class="dialog__detail">{{ props.detail }}</p>

          <footer class="dialog__foot">
            <button class="btn btn--ghost" type="button" :disabled="props.busy" @click="close">
              取消
            </button>
            <button
              class="btn"
              :class="props.danger ? 'btn--danger' : 'btn--primary'"
              type="button"
              :disabled="props.busy"
              @click="emit('confirm')"
            >
              <AppIcon v-if="props.busy" name="refresh" :size="14" class="spin" />
              {{ props.busy ? '执行中…' : props.confirmText }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--scrim);
  backdrop-filter: blur(6px);
}

.dialog {
  position: relative;
  width: min(440px, 100%);
  padding: 24px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--edge);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
}

.dialog__bar {
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary-hi), transparent);
}

.dialog--danger .dialog__bar {
  background: linear-gradient(90deg, transparent, var(--danger), transparent);
}

.dialog__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.dialog__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 11px;
  color: var(--primary-hi);
  background: var(--primary-weak);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}

.dialog--danger .dialog__icon {
  color: var(--danger);
  background: var(--danger-weak);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}

.dialog__title {
  font-size: var(--fs-md);
  font-weight: 650;
  letter-spacing: 0.2px;
}

.dialog__message {
  margin-top: 4px;
  font-size: var(--fs-sm);
  color: var(--text-2);
  line-height: 1.6;
}

.dialog__detail {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 9px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: var(--fs-xs);
  color: var(--text-3);
  line-height: 1.6;
}

.dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.18s ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>
