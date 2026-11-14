<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { fetchCaptcha } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const account = ref('admin')
const password = ref('123456')
const showPassword = ref(false)
const errorMsg = ref('')

const captchaCode = ref('')
const captchaInput = ref('')
const captchaLoading = ref(false)

async function refreshCaptcha(): Promise<void> {
  captchaLoading.value = true
  captchaInput.value = ''
  try {
    captchaCode.value = await fetchCaptcha()
  } catch (error) {
    captchaCode.value = ''
    errorMsg.value = error instanceof Error ? error.message : '验证码获取失败，请稍后重试'
  } finally {
    captchaLoading.value = false
  }
}

onMounted(refreshCaptcha)

async function handleSubmit(): Promise<void> {
  errorMsg.value = ''

  if (!account.value.trim() || !password.value) {
    errorMsg.value = '请输入账号和密码'
    return
  }
  if (!captchaInput.value.trim()) {
    errorMsg.value = '请输入验证码'
    return
  }

  try {
    await userStore.login({
      account: account.value,
      password: password.value,
      captcha: captchaInput.value,
    })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/overview'
    await router.replace(redirect)
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
    // 登录失败后验证码即失效，刷新验证码与 sid 会话
    await refreshCaptcha()
  }
}

function fillDemo(): void {
  account.value = 'admin'
  password.value = '123456'
}
</script>

<template>
  <div class="login tech-bg">
    <!-- 背景装饰 -->
    <div class="login__aura login__aura--a" />
    <div class="login__aura login__aura--b" />

    <section class="brand">
      <div class="brand__top">
        <span class="mark">
          <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M20 2 34 10v14L20 38 6 24V10z" fill="#1f6bff" />
            <path d="M20 9 28 14v9l-8 8-8-8v-9z" fill="#8ec5ff" />
            <path d="M20 15 24 18v4l-4 4-4-4v-4z" fill="#fff" />
          </svg>
        </span>
        <div class="mark__text">
          <strong>机巢中枢</strong>
          <small>MACHINE NEST CONSOLE</small>
        </div>
      </div>

      <div class="brand__body">
        <p class="eyebrow">UNMANNED NEST · EDGE CONTROL</p>
        <h1>一座机巢<br /><span>全状态掌控</span></h1>
        <p class="lede">
          舱体机构、环境传感、视频链路与伺服状态在同一视图内联动呈现，
          从态势判读到指令下发，只需一次点击。
        </p>

        <ul class="caps">
          <li>
            <span class="caps__icon"><AppIcon name="overview" :size="15" /></span>
            <div>
              <strong>实时态势</strong>
              <small>舱门 / 升降 / 电池 5 秒刷新</small>
            </div>
          </li>
          <li>
            <span class="caps__icon"><AppIcon name="control" :size="15" /></span>
            <div>
              <strong>远程控制</strong>
              <small>14 类指令，危险操作二次确认</small>
            </div>
          </li>
          <li>
            <span class="caps__icon"><AppIcon name="terminal" :size="15" /></span>
            <div>
              <strong>现场调试</strong>
              <small>寄存器读写与轴错误码诊断</small>
            </div>
          </li>
        </ul>
      </div>

      <div class="brand__foot">
        <span class="brand__dot" />
        <span class="mono">SYSTEM READY · 2026</span>
      </div>
    </section>

    <section class="panel-wrap">
      <div class="panel panel--corner form-card">
        <header class="form-card__head">
          <h2>登录控制台</h2>
          <p>使用运维账号接入机巢设备</p>
        </header>

        <form novalidate @submit.prevent="handleSubmit">
          <label class="field">
            <span class="field__label">账号</span>
            <div class="control">
              <AppIcon name="user" :size="15" class="control__icon" />
              <input
                v-model="account"
                class="input control__input"
                type="text"
                autocomplete="username"
                placeholder="请输入账号"
              />
            </div>
          </label>

          <label class="field">
            <span class="field__label">密码</span>
            <div class="control">
              <AppIcon name="key" :size="15" class="control__icon" />
              <input
                v-model="password"
                class="input control__input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="请输入密码"
              />
              <button
                type="button"
                class="control__toggle"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '隐藏' : '显示' }}
              </button>
            </div>
          </label>

          <label class="field">
            <span class="field__label">验证码</span>
            <div class="captcha-row">
              <div class="control captcha-row__control">
                <AppIcon name="shield" :size="15" class="control__icon" />
                <input
                  v-model="captchaInput"
                  class="input control__input"
                  type="text"
                  maxlength="8"
                  autocomplete="off"
                  placeholder="请输入验证码"
                />
              </div>
              <button
                type="button"
                class="captcha-chip"
                :class="{ 'captcha-chip--loading': captchaLoading }"
                title="点击刷新验证码"
                aria-label="点击刷新验证码"
                :disabled="captchaLoading"
                @click="refreshCaptcha"
              >
                <span v-if="captchaCode" class="captcha-chip__code">{{ captchaCode }}</span>
                <span v-else class="captcha-chip__fallback">
                  <AppIcon name="refresh" :size="13" class="spin" />
                  刷新
                </span>
              </button>
            </div>
          </label>

          <Transition name="fade">
            <p v-if="errorMsg" class="error">
              <AppIcon name="alert" :size="14" />
              {{ errorMsg }}
            </p>
          </Transition>

          <button class="btn btn--primary btn--block submit" type="submit" :disabled="userStore.loading">
            <AppIcon v-if="userStore.loading" name="refresh" :size="15" class="spin" />
            {{ userStore.loading ? '接入中…' : '接入机巢' }}
          </button>
        </form>

        <div class="demo">
          <div class="demo__info">
            <span class="demo__label">演示账号</span>
            <span class="demo__value mono">admin / 123456</span>
          </div>
          <button type="button" class="demo__btn" @click="fillDemo">一键填入</button>
        </div>

        <p class="terms">登录即表示同意《服务条款》与《隐私政策》</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  min-height: 100vh;
  overflow: hidden;
}

.login__aura {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(4px);
}

.login__aura--a {
  width: 620px;
  height: 620px;
  top: -220px;
  left: -160px;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 12%, transparent), transparent 66%);
}

.login__aura--b {
  width: 520px;
  height: 520px;
  bottom: -240px;
  right: -140px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent), transparent 68%);
}

/* 品牌区 */
.brand {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: 16px 0 16px 16px;
  padding: 36px 48px 30px;
  border: 1px solid var(--edge);
  border-radius: 22px;
  background: var(--glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow-md);
}

.brand__top {
  display: flex;
  align-items: center;
  gap: 11px;
}

.mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--edge);
  box-shadow: var(--shadow-sm);
  filter: drop-shadow(0 4px 10px rgba(31, 107, 255, 0.28));
}

.mark__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.mark__text strong {
  font-size: var(--fs-md);
  font-weight: 650;
  letter-spacing: 1px;
}

.mark__text small {
  font-family: var(--mono);
  font-size: var(--fs-xs);
  letter-spacing: 2px;
  color: var(--text-4);
}

.brand__body {
  max-width: 470px;
}

.eyebrow {
  font-family: var(--mono);
  font-size: var(--fs-xs);
  letter-spacing: 2.6px;
  color: var(--text-3);
  margin-bottom: 20px;
}

.brand__body h1 {
  font-size: clamp(30px, 3vw, 42px);
  line-height: 1.28;
  font-weight: 680;
  letter-spacing: 1px;
  color: var(--text);
}

.brand__body h1 span {
  color: var(--primary);
}

.lede {
  margin-top: 18px;
  font-size: var(--fs-base);
  line-height: 1.9;
  color: var(--text-3);
  max-width: 420px;
}

.caps {
  display: grid;
  gap: 12px;
  margin-top: 32px;
}

.caps li {
  display: flex;
  align-items: center;
  gap: 11px;
}

.caps__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 8px;
  color: var(--primary);
  background: var(--primary-weak);
  border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
}

.caps div {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.caps strong {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text);
}

.caps small {
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.brand__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-xs);
  letter-spacing: 1.6px;
  color: var(--text-4);
}

.brand__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
}

/* 表单 */
.panel-wrap {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  padding: 40px 28px;
}

.form-card {
  width: 100%;
  max-width: 380px;
  padding: 30px 28px 24px;
  background: var(--surface);
  border: 1px solid var(--edge);
  border-radius: 22px;
  box-shadow: var(--shadow-pop);
}

.form-card__head {
  margin-bottom: 24px;
}

.form-card__head h2 {
  font-size: var(--fs-lg);
  font-weight: 650;
  letter-spacing: 0.4px;
}

.form-card__head p {
  margin-top: 5px;
  font-size: var(--fs-sm);
  color: var(--text-3);
}

.field + .field {
  margin-top: 15px;
}

.control {
  position: relative;
  display: flex;
  align-items: center;
}

.control__icon {
  position: absolute;
  left: 12px;
  color: var(--text-4);
  pointer-events: none;
}

.control__input {
  height: 44px;
  padding-left: 36px;
  font-size: var(--fs-base);
}

.control__toggle {
  position: absolute;
  right: 6px;
  height: 30px;
  padding: 0 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-4);
  font-size: var(--fs-xs);
  cursor: pointer;
}

.control__toggle:hover {
  background: var(--surface-2);
  color: var(--text-2);
}

.captcha-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.captcha-row__control {
  flex: 1;
  min-width: 0;
}

.captcha-chip {
  flex: 0 0 auto;
  min-width: 96px;
  padding: 0 12px;
  border: 1px solid var(--edge);
  border-radius: 10px;
  background:
    repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in srgb, var(--primary) 6%, transparent) 6px 12px),
    var(--surface-2);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, filter 0.15s ease;
}

.captcha-chip:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, transparent);
}

.captcha-chip:disabled {
  cursor: wait;
  filter: grayscale(0.4);
}

.captcha-chip__code {
  display: inline-block;
  font-family: var(--mono);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 4px;
  font-style: italic;
  color: var(--text);
  text-shadow: 1px 1px 0 color-mix(in srgb, var(--primary) 30%, transparent);
  transform: skewX(-6deg);
  pointer-events: none;
}

.captcha-chip__fallback {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-xs);
  color: var(--text-4);
}

.error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--danger-weak);
  border: 1px solid color-mix(in srgb, var(--danger) 26%, transparent);
  color: var(--danger);
  font-size: var(--fs-xs);
}

.submit {
  margin-top: 22px;
  letter-spacing: 1px;
}

.demo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px dashed var(--border-strong);
  background: var(--surface-2);
}

.demo__info {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.demo__label {
  font-size: var(--fs-xs);
  letter-spacing: 1px;
  color: var(--text-4);
}

.demo__value {
  font-size: var(--fs-xs);
  color: var(--text-2);
}

.demo__btn {
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  background: transparent;
  color: var(--primary);
  font-size: var(--fs-xs);
  font-weight: 600;
  cursor: pointer;
}

.demo__btn:hover {
  background: var(--primary-weak);
}

.terms {
  margin-top: 20px;
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-4);
}

@media (max-width: 960px) {
  .login {
    grid-template-columns: minmax(0, 1fr);
  }

  .brand {
    margin: 12px;
    padding: 18px 20px;
    gap: 18px;
  }

  .brand__body,
  .brand__foot {
    display: none;
  }

  .panel-wrap {
    padding: 26px 20px 44px;
    align-items: start;
  }

  .form-card {
    max-width: 420px;
  }
}
</style>
