<template>
  <div class="demo">
    <!-- 普通图片：点击触发放大 -->
    <img
      src="https://picsum.photos/400/300"
      width="200px"
      style="cursor: zoom-in"
      @click="zoomVisible = true"
    />

    <!-- 图片放大组件：v-model控制显示，单图传[url] -->
    <ImgZoom
      v-model="zoomVisible"
      :img-list="['@/assets/defaulIcon.png']"
    />
  </div>
</template>

<script>
import ImgZoom from './index.vue'
export default {
  components: { ImgZoom },
  data() {
    return {
      zoomVisible: false // 控制放大层显示
    }
  }
}
</script>