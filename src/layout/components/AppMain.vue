<script setup></script>

<template>
  <main class="app-main">
    <router-view v-slot="{ Component, route }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
  </main>
</template>

<style scoped>
.app-main {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: var(--app-bg, var(--bg-page));
  padding: 20px;
}

/* 页面切换过渡：淡入 + 轻微上移，离开时快速淡出 */
.page-fade-enter-active {
  transition: opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-fade-leave-active {
  transition: opacity 0.16s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-fade-leave-to {
  opacity: 0;
}

/* 减少动画偏好下直接无动画 */
@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
}
</style>
