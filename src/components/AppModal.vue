<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '460px' },
});
const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal-box" :style="{ width }">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-title-dot"></span>
            <strong>{{ title }}</strong>
          </div>
          <button class="btn btn-link" @click="close" aria-label="关闭">✕</button>
        </div>
        <div class="modal-body">
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
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fade-in 0.18s ease;
}
.modal-box {
  background: var(--bg-panel);
  border-radius: 20px;
  max-width: 90vw;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: modal-pop 0.22s var(--ease-out, ease);
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes modal-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border-soft);
  background: linear-gradient(180deg, var(--bg-elevated), var(--bg-toolbar));
  position: relative;
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
  font-size: 16px;
  color: var(--text-main);
  letter-spacing: 0.02em;
}
.btn-link {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-sub);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
}
.btn-link:hover {
  background: var(--primary-soft);
  color: var(--primary);
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
