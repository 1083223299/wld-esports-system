<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { configureHost } from '../api';
import { createPersonalCenterHostAdapter } from '../hostAdapter';
import AppModal from '../../../../components/AppModal.vue';
import BusinessForm from './BusinessForm.vue';
import '../../../../assets/styles/pages/personal-center-theme.css';

const props = defineProps({
  pc: {
    type: Object,
    required: true,
  },
});

const route = useRoute();
const ownerRouteName = route.name;
const formVisible = computed({
  get: () => Boolean(props.pc.activeForm) && route.name === ownerRouteName,
  set: (visible) => {
    if (!visible) props.pc.closeForm();
  },
});

configureHost(createPersonalCenterHostAdapter());

/* ===== 证明材料缩略图 + 点击放大（支持多图左右切换） ===== */
const thumbs = ref({}); // { attachmentId: objectURL }
const previewIndex = ref(-1); // 当前预览在下标中的位置，-1 表示未打开

function isImageItem(item) {
  const name = item?.name || '';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return true;
  return /image/i.test(item?.type || '') || /image/i.test(item?.mimeType || '');
}

function thumbOf(item) {
  return (item && thumbs.value[item.id]) || '';
}

/** 当前操作结果里已取到缩略图的图片附件（决定预览里的左右顺序与张数） */
const imageList = computed(() => {
  const list = Array.isArray(props.pc.result) ? props.pc.result : [];
  return list.filter(
    (item) => item?.id && item.type && item.name && isImageItem(item) && thumbs.value[item.id]
  );
});

const previewItem = computed(() => imageList.value[previewIndex.value] || null);

async function loadThumb(item) {
  if (!item?.id || thumbs.value[item.id]) return;
  try {
    const url = await props.pc.attachmentSrc(item);
    thumbs.value = { ...thumbs.value, [item.id]: url };
  } catch {
    // 无权限 / 已失效：退化为纯文件名，不打断其它内容
  }
}

function openPreview(item) {
  const index = imageList.value.findIndex((entry) => entry.id === item.id);
  previewIndex.value = index >= 0 ? index : -1;
}

function closePreview() {
  previewIndex.value = -1;
}

/** 多图循环切换：1 张时只在原地 */
function stepPreview(delta) {
  const total = imageList.value.length;
  if (total < 2) return;
  previewIndex.value = (previewIndex.value + delta + total) % total;
}

function onPreviewKeydown(event) {
  if (previewIndex.value < 0) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closePreview();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    stepPreview(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    stepPreview(1);
  }
}

watch(
  () => props.pc.result,
  (list) => {
    previewIndex.value = -1;
    if (!Array.isArray(list)) return;
    list
      .filter((item) => item?.id && item.type && item.name && isImageItem(item))
      .forEach(loadThumb);
  },
  { immediate: true }
);

onMounted(() => window.addEventListener('keydown', onPreviewKeydown));

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onPreviewKeydown);
  Object.values(thumbs.value).forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* 忽略 */
    }
  });
});
</script>

<template>
  <div class="personal-center-root">
    <div class="personal-center-page" :aria-busy="pc.loading || pc.busy">
      <p v-if="!pc.identity && !pc.error" role="status" class="empty">正在加载个人中心…</p>
      <p v-if="pc.error" role="alert" class="banner error">
        {{ pc.error }}
        <button class="btn" @click="pc.connect">重试加载</button>
      </p>
      <p v-if="pc.notice" role="status" class="banner success">{{ pc.notice }}</p>
      <p v-if="pc.identity && !pc.identity.linked" class="banner">
        账号尚未关联员工，请联系管理完成关联。
      </p>

      <slot />

      <AppModal
        v-if="route.name === ownerRouteName"
        v-model="formVisible"
        :title="pc.activeForm?.title || '业务表单'"
        width="640px"
      >
        <div class="personal-center-root personal-center-form-modal">
          <BusinessForm
            :form="pc.activeForm"
            :sources="pc.sources"
            :initial="pc.initial"
            :busy="pc.busy"
            @submit="pc.submit"
            @dirty="pc.dirty = $event"
          />
        </div>
      </AppModal>

      <section v-if="pc.result && !pc.activeForm" class="card">
        <h3>{{ pc.seatingPreview ? '自动安排预览' : '操作结果' }}</h3>
        <div v-if="pc.result.assignments" class="seat-preview">
          <div v-for="item in pc.result.assignments" :key="item.employeeId">
            {{ pc.name(item.employeeId) }} →
            {{ pc.sources.seats?.find((seat) => seat.id === item.seatId)?.name || item.seatId }}
          </div>
          <p>未分配人员：{{ pc.result.unassigned?.map(pc.name).join('、') || '无' }}</p>
        </div>
        <div v-if="pc.seatingPreview" class="seat-preview-actions">
          <span>确认发布后，此座次安排将正式生效。</span>
          <button class="btn btn-primary" type="button" :disabled="pc.busy" @click="pc.publishPreview">
            {{ pc.busy ? '正在处理…' : '确认发布' }}
          </button>
        </div>
        <div v-else-if="Array.isArray(pc.result)">
          <div v-for="item in pc.result" :key="item.id">
            <template v-if="item.type && item.name">
              <div class="attachment-row">
                <button
                  v-if="isImageItem(item) && thumbOf(item)"
                  type="button"
                  class="attachment-thumb"
                  :aria-label="'预览 ' + item.name"
                  @click="openPreview(item)"
                >
                  <img :src="thumbOf(item)" :alt="item.name">
                </button>
                <span class="attachment-name">{{ item.name }}</span>
                <button class="btn btn-link" @click="pc.download('attachment', item).catch(pc.message)">
                  下载证明材料
                </button>
              </div>
            </template>
            <template v-else>
              <h4>{{ item.date }} · {{ pc.label(item.shiftId) }}</h4>
              <div class="seat-preview">
                <div
                  v-for="seat in item.assignments"
                  :key="seat.employeeId"
                  :class="{ mine: seat.employeeId === pc.identity.employeeId }"
                >
                  {{ seat.seatName }}
                  <strong>{{ seat.employeeName }}</strong>
                </div>
              </div>
              <p v-if="!item.assignments?.length">暂无有效分配，请联系管理安排。</p>
            </template>
          </div>
        </div>
        <pre v-else>{{ JSON.stringify(pc.result, null, 2) }}</pre>
      </section>
    </div>

    <div
      v-if="previewItem"
      class="attachment-preview"
      role="dialog"
      aria-label="附件大图预览"
      @click.self="closePreview"
    >
      <img :src="thumbOf(previewItem)" :alt="previewItem.name" @click="closePreview">
      <button
        v-if="imageList.length > 1"
        type="button"
        class="attachment-preview-nav prev"
        aria-label="上一张"
        @click.stop="stepPreview(-1)"
      >
        ‹
      </button>
      <button
        v-if="imageList.length > 1"
        type="button"
        class="attachment-preview-nav next"
        aria-label="下一张"
        @click.stop="stepPreview(1)"
      >
        ›
      </button>
      <div class="attachment-preview-bar">
        <span class="attachment-preview-count">{{ previewIndex + 1 }} / {{ imageList.length }}</span>
        <span class="attachment-preview-name">{{ previewItem.name }}</span>
      </div>
      <button type="button" class="attachment-preview-close" aria-label="关闭预览" @click.stop="closePreview">
        ×
      </button>
      <button
        type="button"
        class="attachment-preview-download"
        @click.stop="pc.download('attachment', previewItem).catch(pc.message)"
      >
        下载图片
      </button>
    </div>
  </div>
</template>
