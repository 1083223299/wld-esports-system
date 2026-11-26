<script setup>
import { ref, watch } from 'vue';
import { useConfirm } from '../composables/useConfirm';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '460px' },
  height: { type: String, default: 'auto' },
  zIndex: { type: Number, default: 100 },
  closeOnClickOutside: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue']);
const hasUnsavedInput = ref(false);
const escapeConfirmationOpen = ref(false);
const { confirm } = useConfirm();

watch(
  () => props.modelValue,
  () => {
    hasUnsavedInput.value = false;
  }
);

function close() {
  emit('update:modelValue', false);
}

function handleOverlayClick() {
  if (props.closeOnClickOutside) close();
}

function markDirtyOnClick(event) {
  if (event.target instanceof Element && event.target.closest('[data-modal-dirty]')) {
    hasUnsavedInput.value = true;
  }
}

async function handleEscape() {
  if (!props.modelValue) return;
  if (!hasUnsavedInput.value) {
    close();
    return;
  }
  if (escapeConfirmationOpen.value) return;

  escapeConfirmationOpen.value = true;
  try {
    const shouldClose = await confirm({
      title: '未保存的修改',
      message: '当前弹窗有尚未保存的修改，确定放弃并关闭吗？',
      okText: '放弃修改',
    });
    if (shouldClose) close();
  } finally {
    escapeConfirmationOpen.value = false;
  }
}

</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal-overlay"
      :style="{ zIndex }"
      @click.self="handleOverlayClick"
      @keydown.esc.stop.prevent="handleEscape"
    >
      <div class="modal-box" :style="{ width: `calc(${width} + 300px)`, height }">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-title-dot"></span>
            <strong>{{ title }}</strong>
          </div>
          <button
            type="button"
            class="modal-close-btn"
            @click="close"
            aria-label="关闭弹窗"
            title="关闭"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div
          class="modal-body"
          @input.capture="hasUnsavedInput = true"
          @change.capture="hasUnsavedInput = true"
          @click.capture="markDirtyOnClick"
        >
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--el-mask-color, rgba(15, 23, 42, 0.52));
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-box {
  background: var(--bg-panel);
  border-radius: 18px;
  max-width: 90vw;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--bg-toolbar);
}
.modal-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.modal-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-hover), var(--primary));
  box-shadow: 0 0 0 4px var(--primary-ring);
}
.modal-header strong {
  font-size: 18px;
  color: var(--text-main);
}
.modal-close-btn {
  display: inline-flex;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-sub);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.modal-close-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.modal-close-btn:hover {
  border-color: rgba(217, 45, 32, 0.28);
  background: rgba(217, 45, 32, 0.08);
  color: var(--danger, #d92d20);
}

.modal-close-btn:active {
  transform: scale(0.96);
}

.modal-close-btn:focus-visible {
  outline: 3px solid var(--primary-ring);
  outline-offset: 2px;
}
.modal-body {
  padding: 20px 20px 18px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--border-soft);
  background: var(--bg-toolbar);
}
</style>
