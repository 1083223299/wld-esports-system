<script setup>
import { useAttrs } from 'vue';
import { ElImage } from 'element-plus';
import { useToast } from '../composables/useToast';
import { downloadImageFile } from '../utils/downloadImage';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const { show } = useToast();

async function download() {
  try {
    await downloadImageFile(attrs.src, attrs.downloadName || attrs.alt);
  } catch (error) {
    show(error?.message || '图片下载失败', 'error');
  }
}
</script>

<template>
  <span class="enhanced-image el-image" :class="attrs.class" :style="attrs.style">
    <ElImage v-bind="attrs" :hide-on-click-modal="true" />
    <button
      v-if="attrs.src"
      type="button"
      class="enhanced-image__download"
      :aria-label="`下载${attrs.alt || '图片'}`"
      title="下载图片"
      @click.stop.prevent="download"
    >
      下载
    </button>
  </span>
</template>

<style scoped>
.enhanced-image {
  position: relative;
  display: inline-flex;
  max-width: 100%;
  max-height: 100%;
  vertical-align: middle;
  line-height: normal;
  overflow: hidden;
}

.enhanced-image :deep(.el-image) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.enhanced-image__download {
  position: absolute;
  z-index: 2;
  right: 2px;
  bottom: 2px;
  padding: 1px 3px;
  border: 0;
  border-radius: 4px;
  background: rgb(15 23 42 / 72%);
  color: #fff;
  cursor: pointer;
  font-size: 8px;
  line-height: 1.2;
}

.enhanced-image__download:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
</style>
