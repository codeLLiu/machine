<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import LoginIcon from '@/components/LoginIcon.vue'
import { fetchCaptcha } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import loginBackground from '@/assets/login/login_background_no_panel.png'

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
  <div class="login" :style="{ backgroundImage: `url(${loginBackground})` }">
    <header class="login-brand">
      <div class="login-brand__logo">
        <LoginIcon name="logo" :size="44" />
      </div>
      <div class="login-brand__text">
        <strong>机巢</strong>
        <small>Machine Nest</small>
      </div>
      <span class="login-brand__divider" />
      <p class="login-brand__slogan">让无人机管理更智能 · 让天空更有序</p>
    </header>

    <section class="form-wrap">
      <div class="form-card">
        <header class="form-head">
          <LoginIcon class="form-head__icon" name="account" :size="30" />
          <h2>账号登录</h2>
        </header>

        <form novalidate @submit.prevent="handleSubmit">
          <label class="form-control">
            <LoginIcon class="form-control__icon" name="account" :size="22" />
            <input
              v-model="account"
              type="text"
              autocomplete="username"
              placeholder="请输入用户名或手机号"
            />
          </label>

          <label class="form-control">
            <LoginIcon class="form-control__icon" name="password" :size="22" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button
              type="button"
              class="form-control__toggle"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z" />
                <circle cx="12" cy="12" r="3.2" />
                <path d="M5 19.5 19 4.5" />
              </svg>
              <svg
                v-else
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
            </button>
          </label>

          <label class="form-control form-control--captcha">
            <LoginIcon class="form-control__icon" name="security" :size="22" />
            <input
              v-model="captchaInput"
              type="text"
              maxlength="8"
              autocomplete="off"
              placeholder="请输入验证码"
            />
            <button
              type="button"
              class="captcha"
              :class="{ 'captcha--loading': captchaLoading }"
              title="点击刷新验证码"
              aria-label="点击刷新验证码"
              :disabled="captchaLoading"
              @click="refreshCaptcha"
            >
              <span v-if="captchaCode" class="captcha__code">{{ captchaCode }}</span>
              <span v-else class="captcha__fallback">
                <AppIcon name="refresh" :size="13" class="spin" />
                刷新
              </span>
            </button>
          </label>

          <Transition name="fade">
            <p v-if="errorMsg" class="form-error">
              <AppIcon name="alert" :size="14" />
              {{ errorMsg }}
            </p>
          </Transition>

          <button class="submit" type="submit" :disabled="userStore.loading">
            <span>{{ userStore.loading ? '登录中…' : '登录' }}</span>
            <AppIcon v-if="userStore.loading" name="refresh" :size="17" class="spin" />
            <AppIcon v-else name="arrowRight" :size="17" />
          </button>

          <div class="demo">
            <span class="demo__label">演示账号</span>
            <span class="demo__value mono">admin / 123456</span>
            <button type="button" class="demo__btn" @click="fillDemo">一键填入</button>
          </div>

          <p class="terms">登录即表示同意《服务条款》与《隐私政策》</p>
        </form>
      </div>
    </section>

    <footer class="login-foot">
      <LoginIcon class="login-foot__icon" name="security" :size="24" />
      <span>安全 · 稳定 · 高效</span>
    </footer>
  </div>
</template>

<style scoped>
.login {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background-image: url('@/assets/login/login_background_no_panel.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: #142341;
}

.login::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(90deg, rgba(238, 246, 255, 0) 48%, rgba(238, 246, 255, 0.42) 66%, rgba(238, 246, 255, 0.62) 100%);
}

.form-wrap {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 72px 28px;
}

.login-brand {
  position: absolute;
  z-index: 2;
  top: 36px;
  left: 40px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-brand__logo {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  filter: drop-shadow(0 6px 16px rgba(47, 107, 255, 0.24));
}

.login-brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.login-brand__text strong {
  color: #1f3ea8;
  font-size: 30px;
  font-weight: 760;
  letter-spacing: 3px;
}

.login-brand__text small {
  color: #546a94;
  font-size: 12px;
  font-weight: 600;
}

.login-brand__divider {
  width: 1px;
  height: 38px;
  margin: 0 8px;
  background: rgba(47, 82, 148, 0.28);
}

.login-brand__slogan {
  color: #3c66b6;
  font-size: 14px;
  font-weight: 560;
}

.form-card {
  width: min(432px, 100%);
  margin-left: auto;
  margin-right: clamp(0px, 7vw, 130px);
  padding: 48px 44px 36px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 26px 70px -26px rgba(31, 82, 190, 0.34);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
}

.login-foot {
  position: absolute;
  z-index: 2;
  left: 40px;
  bottom: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #3c66b6;
  font-size: 14px;
  font-weight: 620;
}

.login-foot__icon {
  filter: drop-shadow(0 4px 8px rgba(31, 107, 255, 0.16));
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 26px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(92, 124, 184, 0.22);
}

.form-head__icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.form-head h2 {
  color: #2049c0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
}

.form-control {
  position: relative;
  display: flex;
  align-items: center;
  height: 56px;
  margin-bottom: 18px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 10px 28px -18px rgba(31, 82, 190, 0.3);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.form-control:focus-within {
  border-color: rgba(31, 107, 255, 0.5);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 0 0 4px rgba(31, 107, 255, 0.14);
}

.form-control__icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  transform: translateY(1px);
}

.form-control input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #142341;
  font-size: 15px;
}

.form-control input::placeholder {
  color: #a9b8cf;
  font-weight: 500;
}

.form-control__toggle {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #9cb0cb;
  cursor: pointer;
}

.form-control__toggle:hover {
  color: #4f7fd0;
}

.form-control--captcha .captcha {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 108px;
  height: 38px;
  flex: 0 0 108px;
  border: 1px solid rgba(31, 107, 255, 0.22);
  border-radius: 10px;
  background:
    repeating-linear-gradient(45deg, transparent 0 5px, rgba(31, 107, 255, 0.06) 5px 10px),
    rgba(240, 247, 255, 0.92);
  cursor: pointer;
  transition: border-color 0.16s ease, filter 0.16s ease;
}

.form-control--captcha .captcha:hover {
  border-color: rgba(31, 107, 255, 0.46);
}

.form-control--captcha .captcha:disabled {
  cursor: wait;
  filter: grayscale(0.28);
}

.captcha__code {
  font-size: 18px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 4px;
  color: #1a3f98;
  transform: skewX(-5deg);
  pointer-events: none;
}

.captcha__fallback {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #7f95b8;
  font-size: 12px;
  font-weight: 600;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid rgba(238, 77, 92, 0.24);
  border-radius: 10px;
  background: rgba(255, 237, 240, 0.88);
  color: #d63d50;
  font-size: 12px;
  font-weight: 600;
}

.submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 56px;
  margin-top: 12px;
  border: 0;
  border-radius: 28px;
  background: linear-gradient(97deg, #a06df2 0%, #647bff 48%, #3fa8ff 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  cursor: pointer;
  box-shadow: 0 18px 36px -14px rgba(90, 116, 255, 0.52);
  transition: filter 0.18s ease, transform 0.18s ease;
}

.submit:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.submit:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.demo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 9px 12px;
  border: 1px dashed rgba(79, 127, 208, 0.34);
  border-radius: 10px;
  background: rgba(240, 248, 255, 0.76);
  font-size: 12px;
}

.demo__label {
  color: #6b82a6;
  font-weight: 600;
}

.demo__value {
  color: #2049c0;
  font-weight: 700;
}

.demo__btn {
  margin-left: auto;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #2049c0;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.demo__btn:hover {
  background: rgba(31, 107, 255, 0.1);
}

.terms {
  margin: 16px 0 0;
  text-align: center;
  color: #8ba0bf;
  font-size: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .login::before {
    background: linear-gradient(180deg, rgba(238, 246, 255, 0.56), rgba(238, 246, 255, 0.78));
  }

  .form-wrap {
    padding: 42px 18px;
  }

  .form-card {
    margin: 0;
  }

  .login-brand__slogan,
  .login-brand__divider {
    display: none;
  }

  .login-brand {
    top: 20px;
    left: 20px;
  }

  .login-brand__text strong {
    font-size: 24px;
  }

  .login-brand__text small {
    font-size: 11px;
  }

  .login-foot {
    left: 20px;
    bottom: 18px;
    font-size: 12px;
  }

  .form-card,
  .form-control {
    background: rgba(255, 255, 255, 0.78);
  }

  .form-card {
    padding: 36px 24px 28px;
  }
}
</style>
