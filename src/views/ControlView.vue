<script setup lang="ts">
import { ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import { COMMANDS, useControlStore, type CommandDef } from '@/stores/control'

const controlStore = useControlStore()
const pending = ref<CommandDef | null>(null)

const flowCommands = COMMANDS.filter((item) => item.group === 'flow')
const singleCommands = COMMANDS.filter((item) => item.group === 'single')

function run(command: CommandDef): void {
  if (command.danger || command.group === 'flow') {
    pending.value = command
    return
  }
  void controlStore.execute(command.cmd, command.label)
}

function confirmRun(): void {
  const command = pending.value
  pending.value = null
  if (command) void controlStore.execute(command.cmd, command.label)
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>

<template>
  <div class="page">
    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">流程指令</h2>
          <p class="panel__sub">对应 /api/functionDebug；流程类操作执行前需确认现场安全</p>
        </div>
        <span class="tag tag--info">{{ flowCommands.length }} 条</span>
      </header>
      <div class="commands">
        <button
          v-for="command in flowCommands"
          :key="command.cmd"
          class="command"
          :class="{ 'command--danger': command.danger }"
          type="button"
          :disabled="controlStore.isRunning(command.cmd)"
          @click="run(command)"
        >
          <AppIcon
            :name="controlStore.isRunning(command.cmd) ? 'refresh' : command.icon"
            :size="16"
            :class="{ spin: controlStore.isRunning(command.cmd) }"
          />
          <span class="command__copy">
            <strong>{{ command.label }}</strong>
            <small>{{ command.desc }}</small>
          </span>
          <AppIcon name="chevronRight" :size="14" class="command__arrow" />
        </button>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">单项操作</h2>
          <p class="panel__sub">按文档命令下发；文档将 liveOff 同时写作“开启灯光”和“结束推流”，此处暂按后者呈现，开启灯光命令需后端确认</p>
        </div>
        <span class="tag tag--muted">{{ singleCommands.length }} 条</span>
      </header>
      <div class="commands commands--single">
        <button
          v-for="command in singleCommands"
          :key="command.cmd"
          class="command"
          :class="{ 'command--danger': command.danger }"
          type="button"
          :disabled="controlStore.isRunning(command.cmd)"
          @click="run(command)"
        >
          <AppIcon
            :name="controlStore.isRunning(command.cmd) ? 'refresh' : command.icon"
            :size="16"
            :class="{ spin: controlStore.isRunning(command.cmd) }"
          />
          <span class="command__copy">
            <strong>{{ command.label }}</strong>
            <small>{{ command.desc }}</small>
          </span>
        </button>
      </div>
    </section>

    <section class="panel log">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">本次会话操作记录</h2>
          <p class="panel__sub">已记录 {{ controlStore.logs.length }} 条接口下发结果</p>
        </div>
        <button v-if="controlStore.logs.length" class="btn btn--sm btn--ghost" type="button" @click="controlStore.clearLogs()">
          清空记录
        </button>
      </header>
      <div class="log__list">
        <div v-if="!controlStore.logs.length" class="empty">暂无操作记录</div>
        <div v-for="log in controlStore.logs" :key="log.id" class="log__item" :class="`log__item--${log.status}`">
          <span class="log__dot" />
          <div class="log__body">
            <div class="log__head">
              <strong>{{ log.label }}</strong>
              <span class="log__time mono">{{ formatTime(log.at) }}</span>
            </div>
            <p class="log__meta"><span class="mono">{{ log.cmd }}</span><span>{{ log.message ?? '等待响应' }}</span></p>
          </div>
        </div>
      </div>
    </section>

    <AppConfirm
      :open="Boolean(pending)"
      :title="pending?.label ?? ''"
      :message="pending?.desc ?? ''"
      detail="该指令可能驱动多机构动作。请确认舱门区域无人、飞行器状态符合操作条件后再执行。"
      :confirm-text="`执行 ${pending?.label ?? ''}`"
      danger
      @update:open="(value) => !value && (pending = null)"
      @confirm="confirmRun"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.commands {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 16px;
}

.command {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-1) ease, background var(--dur-1) ease;
}

.command:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-weak);
}

.command:disabled {
  opacity: 0.55;
  cursor: wait;
}

.command--danger > svg:first-child {
  color: var(--danger);
}

.command__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.command__copy strong {
  color: var(--text);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.command__copy small {
  color: var(--text-3);
  font-size: var(--fs-xs);
  line-height: 1.5;
}

.command__arrow {
  color: var(--text-4);
}

.log__list {
  max-height: 340px;
  overflow-y: auto;
  padding: 6px 14px 14px;
}

.empty {
  padding: 28px 10px;
  color: var(--text-4);
  text-align: center;
  font-size: var(--fs-sm);
}

.log__item {
  display: flex;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
}

.log__item:hover {
  background: var(--surface-2);
}

.log__dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--warning);
}

.log__item--success .log__dot { background: var(--success); }
.log__item--fail .log__dot { background: var(--danger); }

.log__body { flex: 1; min-width: 0; }
.log__head { display: flex; justify-content: space-between; gap: 10px; }
.log__head strong { color: var(--text); font-size: var(--fs-sm); font-weight: 550; }
.log__time { color: var(--text-4); font-size: var(--fs-xs); }
.log__meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 3px; color: var(--text-3); font-size: var(--fs-xs); }

@media (max-width: 720px) {
  .commands { grid-template-columns: minmax(0, 1fr); }
}
</style>
