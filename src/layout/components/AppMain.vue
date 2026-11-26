<template>
  <main class="app-main">
    <router-view v-slot="{ Component, route }">
      <KeepAlive v-if="route.matched[1]?.name === 'PersonalCenter'">
        <component :is="Component" :key="route.name" />
      </KeepAlive>
      <transition v-else name="page-fade">
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
  background: var(--bg-page);
  padding: 20px;
}

/* 页面切换过渡：淡入 + 从下方轻微上移 */
.page-fade-enter-active {
  transition: opacity 0.22s ease-out, transform 0.22s ease-out;
}
.page-fade-leave-active {
  transition: opacity 0.12s ease-in, transform 0.12s ease-in;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
