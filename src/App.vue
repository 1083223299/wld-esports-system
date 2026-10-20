<script setup>
import { onMounted } from 'vue';
import ToastHost from './components/ToastHost.vue';
import ConfirmHost from './components/ConfirmHost.vue';
import WsBubbleHost from './components/WsBubbleHost.vue';
import { useNotifyStore } from './stores/notify';
import { requestNotifyPermission } from './utils/browserNotify';

const notifyStore = useNotifyStore();

onMounted(() => {
  // 初始化系统通知即时通讯通道（卡单订单推送 / 消息冒泡 / 铃铛提醒）
  notifyStore.init();

  // 首次用户交互时请求浏览器通知权限（授权后新消息可在操作系统层面弹系统通知）
  const requestPermission = () => requestNotifyPermission();
  window.addEventListener('pointerdown', requestPermission, { once: true });
  window.addEventListener('keydown', requestPermission, { once: true });
});
</script>

<template>
  <div class="app-frame">
    <div class="app-root">
      <router-view />
    </div>

    <ToastHost />
    <ConfirmHost />
    <WsBubbleHost />
  </div>
</template>

<style scoped>
.app-frame {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  overflow: hidden;
}

.app-root {
  flex: 1;
  width: 100%;
  min-height: 0;
}
</style>
