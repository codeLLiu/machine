<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <AppToast />
</template>
