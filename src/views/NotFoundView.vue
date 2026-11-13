<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
</script>

<template>
  <div class="nf">
    <div class="nf__card">
      <span class="nf__code">404</span>
      <h1>页面走丢了</h1>
      <p>你访问的地址不存在，或者已经被移动到其他位置。</p>
      <div class="nf__actions">
        <button class="btn" type="button" @click="router.back()">
          <AppIcon name="chevronLeft" :size="14" />
          返回上一页
        </button>
        <button class="btn btn--primary" type="button" @click="router.replace({ name: 'overview' })">
          回到机巢
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nf {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--bg);
}

.nf__card {
  width: min(440px, 100%);
  padding: 40px 32px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}

.nf__code {
  display: inline-block;
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1;
  background: var(--primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nf__card h1 {
  margin-top: 12px;
  font-size: var(--fs-lg);
  font-weight: 650;
}

.nf__card p {
  margin-top: 8px;
  font-size: var(--fs-sm);
  color: var(--text-3);
  line-height: 1.7;
}

.nf__actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
}
</style>
