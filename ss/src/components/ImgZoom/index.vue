<!-- 图片放大组件 -->
<template>
  <transition name="zoom-fade">
    <!-- 放大遮罩层：点击关闭，禁止冒泡 -->
    <div
      class="img-zoom-mask"
      v-show="visible"
      @click="handleClose"
      @wheel.prevent="handleZoom"
    >
      
      <!-- 多图轮播箭头：仅多图时显示 -->
      <div
        class="zoom-arrow zoom-prev"
        v-show="imgList.length > 1"
        @click.stop="handlePrev"
      >
        ←
      </div>
      <div
        class="zoom-arrow zoom-next"
        v-show="imgList.length > 1"
        @click.stop="handleNext"
      >
        →
      </div>
      <div class="imgClose" @click="handleClose">×</div>
      <!-- 放大的图片：支持滚轮缩放、居中 -->
      <img
        ref="zoomImg"
        class="img-zoom-content"
        :src="currentImg"
        :alt="`放大预览-${currentIndex+1}`"
        @click.stop
        :style="{ transform: `scale(${scale})` }"
      />

      <!-- 图片页码：多图时显示 -->
      <div class="zoom-page" v-show="imgList.length > 1">
        {{ currentIndex + 1 }} / {{ imgList.length }}
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ImgZoom',
  props: {
    // 控制组件显示/隐藏（父组件通过v-model绑定）
    value: {
      type: Boolean,
      default: false
    },
    // 图片列表：单图传数组[url]，多图传数组[url1,url2,...]
    imgList: {
      type: Array,
      required: true,
      validator: (val) => {
        // 校验：数组元素必须是字符串（图片地址）
        return val.every(item => typeof item === 'string')
      }
    },
    // 初始显示的图片索引（兼容 init-index / initial-index）
    initIndex: {
      type: Number,
      default: undefined
    },
    initialIndex: {
      type: Number,
      default: undefined
    }
  },
  data() {
    return {
      visible: this.value, // 内部显示状态
      currentIndex: this.resolveStartIndex(), // 当前显示的图片索引
      scale: 1, // 图片缩放比例
      minScale: 0.2, // 最小缩放比例
      maxScale: 3 // 最大缩放比例
    }
  },
  computed: {
    // 当前显示的图片地址
    currentImg() {
      return this.imgList[this.currentIndex] || ''
    },
    startIndex() {
      return this.resolveStartIndex()
    }
  },
  watch: {
    // 监听父组件v-model值，同步内部显示状态
    value(newVal) {
      this.visible = newVal
      // 显示时重置缩放比例+禁止页面滚动；隐藏时恢复
      if (newVal) {
        this.currentIndex = this.resolveStartIndex()
        this.scale = 1
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'auto'
      }
    },
    // 监听内部显示状态，向父组件同步（支持v-model）
    visible(newVal) {
      this.$emit('input', newVal)
    },
    // 监听图片列表/初始索引变化，重置当前索引
    imgList() {
      this.currentIndex = this.resolveStartIndex()
      this.scale = 1
    },
    startIndex(newVal) {
      this.currentIndex = newVal
      this.scale = 1
    }
  },
  methods: {
    resolveStartIndex() {
      const raw = this.initialIndex !== undefined && this.initialIndex !== null
        ? this.initialIndex
        : (this.initIndex !== undefined && this.initIndex !== null ? this.initIndex : 0)
      const index = Number(raw)
      if (!Number.isFinite(index) || index < 0) {
        return 0
      }
      const max = Array.isArray(this.imgList) ? this.imgList.length - 1 : 0
      return max >= 0 ? Math.min(index, max) : 0
    },
    // 关闭放大层
    handleClose() {
      this.visible = false
    },
    // 多图上一张
    handlePrev() {
      this.currentIndex = this.currentIndex === 0 
        ? this.imgList.length - 1 
        : this.currentIndex - 1
      this.scale = 1 // 切图重置缩放
    },
    // 多图下一张
    handleNext() {
      this.currentIndex = this.currentIndex === this.imgList.length - 1 
        ? 0 
        : this.currentIndex + 1
      this.scale = 1 // 切图重置缩放
    },
    // 滚轮缩放：向上滚放大，向下滚缩小
    handleZoom(e) {
      // e.deltaY > 0 向下滚（缩小），< 0 向上滚（放大）
      const step = e.deltaY > 0 ? -0.1 : 0.1
      let newScale = this.scale + step
      // 限制缩放范围在minScale和maxScale之间
      newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale))
      this.scale = newScale
    }
  },
  // 组件销毁时恢复页面滚动，防止全局样式污染
  beforeDestroy() {
    document.body.style.overflow = 'auto'
  }
}
</script>

<style scoped>
/* 淡入淡出过渡动画 */
.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition: all 0.2s ease;
}
.zoom-fade-enter,
.zoom-fade-leave-to {
  opacity: 0;
}

/* 遮罩层：全屏半透明，居中对齐，最高层级 */
.img-zoom-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  /* cursor: zoom-out; */
  padding: 20px;
}

/* 放大图片：自适应视口，保持比例，支持缩放过渡 */
.img-zoom-content {
  max-width: 100%;
  width: 40%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
  /* cursor: move; */
}

/* 轮播箭头：固定位置，半透明悬浮样式 */
.zoom-arrow {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  z-index: 10;
  user-select: none;
}
.zoom-prev {
  left: 20px;
}
.zoom-next {
  right: 20px;
}
.zoom-arrow:hover {
  background: rgba(0, 0, 0, 0.8);
}

/* 页码提示：右下角白色半透明背景 */
.zoom-page {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: rgba(255, 255, 255, 0.8);
  color: #000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  user-select: none;
}
.imgClose{
  font-size: 24px;
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 10;
  cursor: pointer;
  color: #ffffff;
}
</style>
