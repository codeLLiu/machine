<template>
  <section class="feature-pending" aria-label="功能待开发">
    <h2>功能待开发</h2>
  </section>
</template>

<style scoped>
.feature-pending {
  display: grid;
  place-items: center;
  min-height: min(62vh, 640px);
  width: 100%;
}

h2 {
  margin: 0;
  color: var(--text-2);
  font-size: clamp(32px, 4vw, 52px);
  font-weight: 700;
  letter-spacing: 0.08em;
}
</style>
