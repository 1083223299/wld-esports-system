<template>
  <section class="app-main">
    <transition name="fade-transform" mode="out-in">
      <router-view :key="key" />
    </transition>

    <!-- 巡查悬浮窗挂在常驻的 AppMain 上，切换路由时不会销毁，TRTC 连接得以保持 -->
    <VoiceRoomPatrolFloat />
  </section>
</template>

<script>
import VoiceRoomPatrolFloat from '@/components/VoiceRoomPatrolFloat/index.vue'

export default {
  name: 'AppMain',
  components: { VoiceRoomPatrolFloat },
  computed: {
    key() {
      return this.$route.path
    }
  }
}
</script>

<style scoped>
.app-main {
  /*50 = navbar  */
  /* min-height: calc(100vh - 80px); */
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.fixed-header+.app-main {
  padding-top: 80px;
}
</style>

<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
  .fixed-header {
    padding-right: 15px;
  }
}
</style>
