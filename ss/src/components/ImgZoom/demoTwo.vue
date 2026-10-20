<template>
  <div class="demo" style="display: flex; gap: 10px;">
    <!-- 多图循环：点击传递当前索引 -->
    <img
      v-for="(img, index) in imgList"
      :key="index"
      :src="img"
      width="200px"
      style="cursor: zoom-in"
      @click="() => { zoomVisible = true; initIndex = index }"
    />

    <!-- 多图放大组件：传imgList和初始索引 -->
    <ImgZoom
      v-model="zoomVisible"
      :img-list="imgList"
      :init-index="initIndex"
    />
  </div>
</template>

<script>
import ImgZoom from './index.vue'
export default {
  components: { ImgZoom },
  data() {
    return {
      zoomVisible: false,
      initIndex: 0,
      // 多图地址数组
      imgList: [
        '@/assets/logo.png',
        '@/assets/none.png',
        '@/assets/no_logo.png'
      ]
    }
  }
}
</script>
