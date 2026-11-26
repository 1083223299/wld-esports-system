<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { imageUrl } from '../api';
import { downloadImageFile } from '../../../../utils/downloadImage';
import { useToast } from '../../../../composables/useToast';

const props = defineProps({
  row: { type: Object, required: true },
});

/** 缩略图列表：内部图片（需换取本地 blob 地址）与外链图片合并成一个可左右切换的预览序列 */
const images = ref([]);
const failures = ref([]);
const loading = ref(false);
const previewVisible = ref(false);
const previewIndex = ref(0);
let generation = 0;
const { show } = useToast();

const previewUrls = computed(() => images.value.map((image) => image.url));

function readMediaIds() {
  const value = props.row.mediaIds;
  if (!Array.isArray(value)) return [];
  return value.filter((id) => id != null && id !== '').map((id) => String(id));
}

function readExternalImages() {
  const value = props.row.externalImages;
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,，]/) : [];
  return list.map((url) => (typeof url === 'string' ? url.trim() : '')).filter(Boolean);
}

function releaseImages() {
  images.value.forEach((image) => {
    if (image.revocable) URL.revokeObjectURL(image.url);
  });
  images.value = [];
}

async function loadImages() {
  const current = ++generation;
  releaseImages();
  failures.value = [];

  const ids = readMediaIds();
  const externals = readExternalImages();
  if (!ids.length) {
    loading.value = false;
    images.value = externals.map((url, index) => ({
      key: `external-${index}-${url}`,
      url,
      revocable: false,
      external: true,
      alt: `外链图片 ${index + 1}`,
    }));
    return;
  }

  loading.value = true;
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return { id, url: await imageUrl(id) };
      } catch (error) {
        return { id, error: error?.message || '图片无权读取或已失效' };
      }
    })
  );

  if (current !== generation) {
    results.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    return;
  }

  loading.value = false;
  const loaded = results.filter((item) => item.url);
  images.value = [
    ...loaded.map((item, index) => ({
      key: `media-${item.id}`,
      url: item.url,
      revocable: true,
      external: false,
      alt: `内部图片 ${index + 1}`,
    })),
    ...externals.map((url, index) => ({
      key: `external-${index}-${url}`,
      url,
      revocable: false,
      external: true,
      alt: `外链图片 ${index + 1}`,
    })),
  ];
  failures.value = Array.from(new Set(results.filter((item) => item.error).map((item) => item.error)));
}

function openPreview(index) {
  if (!images.value[index]) return;
  previewIndex.value = index;
  previewVisible.value = true;
}

function closePreview() {
  previewVisible.value = false;
}

async function downloadImage(image) {
  try {
    await downloadImageFile(image.url, image.alt);
  } catch (error) {
    show(error?.message || '图片下载失败', 'error');
  }
}

watch(
  () => JSON.stringify([props.row?.id, props.row?.mediaIds || [], props.row?.externalImages || []]),
  loadImages,
  { immediate: true }
);
onBeforeUnmount(() => {
  generation++;
  releaseImages();
});
</script>

<template>
  <small v-if="loading" class="record-image-hint">图片加载中…</small>
  <div v-if="images.length" class="record-images">
    <div v-for="(image, index) in images" :key="image.key" class="record-image-item">
      <img
        :src="image.url"
        :alt="image.alt + '，点击放大查看'"
        :referrerpolicy="image.external ? 'no-referrer' : undefined"
        class="post-image record-image-thumb"
        title="点击放大查看"
        role="button"
        tabindex="0"
        @click="openPreview(index)"
        @keydown.enter.prevent="openPreview(index)"
        @keydown.space.prevent="openPreview(index)"
      >
      <button type="button" class="record-image-download" :aria-label="`下载${image.alt}`" title="下载图片" @click.stop="downloadImage(image)">
        下载
      </button>
    </div>
  </div>
  <small v-for="(message, index) in failures" :key="'failure-' + index" class="record-image-hint error">
    {{ message }}
  </small>
  <el-image-viewer
    v-if="previewVisible"
    :url-list="previewUrls"
    :initial-index="previewIndex"
    hide-on-click-modal
    show-progress
    teleported
    @close="closePreview"
  />
</template>

<style scoped>
.record-image-item {
  position: relative;
  display: inline-flex;
}

.record-image-download {
  position: absolute;
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
</style>
