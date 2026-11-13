<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppConfirm from '@/components/AppConfirm.vue'
import AppIcon from '@/components/AppIcon.vue'
import { readRegisters, writeRegisters } from '@/api/endpoints'
import { useToast } from '@/composables/toast'

const toast = useToast()

const readForm = reactive({ registerId: 1000, count: 10, functionCode: 3 })
const writeForm = reactive({ registerId: 1000, values: '9090, 1111, 11110', functionCode: 3 })

const reading = ref(false)
const writing = ref(false)
const readResult = ref<number[]>([])
const readMessage = ref('')
const hasRead = ref(false)
const confirmOpen = ref(false)

const rows = computed(() =>
  readResult.value.map((value, index) => ({
    index,
    address: readForm.registerId + index,
    hex: `0x${value.toString(16).toUpperCase().padStart(4, '0')}`,
    dec: value,
    bin: value.toString(2).padStart(16, '0'),
    on: value > 0,
  })),
)

function parseValues(): number[] {
  return writeForm.values
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 65535)
}

async function handleRead(): Promise<void> {
  if (readForm.count < 1 || readForm.count > 64) {
    toast.warning('读取数量需在 1–64 之间')
    return
  }
  reading.value = true
  try {
    const result = await readRegisters({ ...readForm })
    readResult.value = result.value
    readMessage.value = result.msg
    hasRead.value = true
    toast.success(`读取成功，共 ${result.value.length} 个寄存器`, result.msg)
  } catch (error) {
    toast.error('读取失败', error instanceof Error ? error.message : '请检查 PLC 连接')
  } finally {
    reading.value = false
  }
}

async function handleWrite(): Promise<void> {
  const values = parseValues()
  if (!values.length) {
    toast.warning('请输入合法的写入值', '0–65535 的整数，逗号分隔')
    return
  }
  writing.value = true
  try {
    await writeRegisters({ registerId: writeForm.registerId, values, functionCode: writeForm.functionCode })
    toast.success('写入成功', `地址 ${writeForm.registerId} · ${values.length} 个值`)
    if (hasRead.value) void handleRead()
  } catch (error) {
    toast.error('写入失败', error instanceof Error ? error.message : '请检查 PLC 连接')
  } finally {
    writing.value = false
    confirmOpen.value = false
  }
}

async function copyResult(): Promise<void> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(readResult.value))
    toast.success('已复制读取结果', 'JSON 数组格式')
  } catch {
    toast.error('复制失败', '当前浏览器不允许访问剪贴板')
  }
}
</script>

<template>
  <div class="reg">
    <article class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">寄存器读取</h2>
          <p class="panel__sub">单次最多 64 个地址 · 支持线圈与保持寄存器</p>
        </div>
        <span class="tag tag--muted mono">testRead</span>
      </header>

      <div class="panel__body">
        <div class="form-row">
          <label class="field">
            <span class="field__label">起始地址</span>
            <input v-model.number="readForm.registerId" class="input mono" type="number" />
          </label>
          <label class="field">
            <span class="field__label">数量</span>
            <input v-model.number="readForm.count" class="input mono" type="number" min="1" max="64" />
          </label>
          <label class="field">
            <span class="field__label">功能码</span>
            <div class="seg">
              <button
                class="seg__item"
                :class="{ 'is-active': readForm.functionCode === 3 }"
                type="button"
                @click="readForm.functionCode = 3"
              >
                03 保持
              </button>
              <button
                class="seg__item"
                :class="{ 'is-active': readForm.functionCode === 1 }"
                type="button"
                @click="readForm.functionCode = 1"
              >
                01 线圈
              </button>
            </div>
          </label>
          <button class="btn btn--primary form-row__btn" type="button" :disabled="reading" @click="handleRead">
            <AppIcon :name="reading ? 'refresh' : 'zap'" :size="14" :class="{ spin: reading }" />
            {{ reading ? '读取中' : '读取' }}
          </button>
        </div>

        <div class="result">
          <div class="result__head">
            <span class="block-head__title">读取结果</span>
            <button v-if="rows.length" class="btn btn--sm btn--ghost" type="button" @click="copyResult">
              <AppIcon name="copy" :size="12" />
              复制 JSON
            </button>
          </div>

          <div v-if="rows.length" class="result__body">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>地址</th>
                  <th>HEX</th>
                  <th>DEC</th>
                  <th>BIT</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.index">
                  <td class="mono dim">{{ String(row.index + 1).padStart(2, '0') }}</td>
                  <td class="mono">{{ row.address }}</td>
                  <td class="mono accent">{{ row.hex }}</td>
                  <td class="mono" :class="{ 'is-on': row.on }">{{ row.dec }}</td>
                  <td class="mono dim small">{{ row.bin }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty">
            <AppIcon name="terminal" :size="22" />
            <p>{{ hasRead ? readMessage || '该区间无数据' : '设置地址与数量后点击读取' }}</p>
          </div>
        </div>
      </div>
    </article>

    <article class="panel">
      <header class="panel__head">
        <div>
          <h2 class="panel__title">寄存器写入</h2>
          <p class="panel__sub">直接写入 PLC，会影响机构动作</p>
        </div>
        <span class="tag tag--danger mono">testWrite</span>
      </header>

      <div class="panel__body write">
        <label class="field">
          <span class="field__label">目标地址</span>
          <input v-model.number="writeForm.registerId" class="input mono" type="number" />
        </label>

        <label class="field">
          <span class="field__label">功能码</span>
          <div class="seg">
            <button
              class="seg__item"
              :class="{ 'is-active': writeForm.functionCode === 3 }"
              type="button"
              @click="writeForm.functionCode = 3"
            >
              03 保持
            </button>
            <button
              class="seg__item"
              :class="{ 'is-active': writeForm.functionCode === 1 }"
              type="button"
              @click="writeForm.functionCode = 1"
            >
              01 线圈
            </button>
          </div>
        </label>

        <label class="field">
          <span class="field__label">写入值</span>
          <textarea v-model="writeForm.values" class="input area mono" rows="4" />
          <span class="field__hint">逗号或空格分隔，取值 0–65535</span>
        </label>

        <div class="write__preview sunken">
          <span class="eyebrow">将要写入</span>
          <p class="mono">{{ parseValues().length }} 个值 · {{ parseValues().join(' · ') || '—' }}</p>
        </div>

        <button class="btn btn--danger btn--block" type="button" :disabled="writing" @click="confirmOpen = true">
          <AppIcon name="alert" :size="14" />
          写入寄存器
        </button>
      </div>
    </article>

    <AppConfirm
      :open="confirmOpen"
      title="写入寄存器"
      :message="`即将向地址 ${writeForm.registerId} 写入 ${parseValues().length} 个值`"
      detail="直接写入 PLC 寄存器会立即影响机构动作，请确认目标地址与数值正确。"
      confirm-text="确认写入"
      :busy="writing"
      danger
      @update:open="(value) => !value && (confirmOpen = false)"
      @confirm="handleWrite"
    />
  </div>
</template>

<style scoped>
.reg {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.form-row .field {
  flex: 1;
  min-width: 110px;
}

.form-row__btn {
  height: 36px;
}

.result {
  margin-top: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
  overflow: hidden;
}

.result__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.result__body {
  max-height: 300px;
  overflow-y: auto;
}

.write {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.area {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.7;
}

.write__preview {
  padding: 10px 12px;
}

.write__preview p {
  margin-top: 4px;
  font-size: var(--fs-xs);
  color: var(--text-2);
}

.dim {
  color: var(--text-4);
}

.small {
  font-size: 11px;
}

.accent {
  color: var(--accent);
}

.is-on {
  color: var(--success);
}

@media (max-width: 1080px) {
  .reg {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
