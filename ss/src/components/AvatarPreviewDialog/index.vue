<template>
  <el-dialog :visible="visible" custom-class="avatar-preview-dialog" :close-on-click-modal="true"
    :close-on-press-escape="true" @close="handleClose" width="600px">
    <span slot="title" class="dialog-title">{{ Title }}</span>

    <el-image :src="avatarUrl" :preview-src-list="[avatarUrl]" fit="contain" class="preview-image" :z-index="9999">
      <template #error>
        <div class="image-error">
          <i class="el-icon-picture-outline"></i>
          <p>图片加载失败</p>
        </div>
      </template>
      <template #placeholder>
        <div class="image-loading">
          <i class="el-icon-loading"></i>
          <p>加载中...</p>
        </div>
      </template>
    </el-image>
  </el-dialog>
</template>

<script>
export default {
  name: 'AvatarPreviewDialog',
  props: {
    Title: {
      type: String,
      default: ''
    },
    visible: {
      type: Boolean,
      default: false
    },
    avatarUrl: {
      type: String,
      default: ''
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped lang="scss">
:deep(.avatar-preview-dialog) {
  border-radius: 12px;
  overflow: hidden;

  .el-dialog__header {
    padding: 20px 20px 10px;
    border-bottom: 1px solid #e8e8e8;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  }

  .el-dialog__body {
    padding: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.preview-image {
  max-width: 100%;
  //   max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-error,
.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  text-align: center;
}

.image-error i,
.image-loading i {
  font-size: 48px;
  margin-bottom: 12px;
}

.image-loading i {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 576px) {
  :deep(.avatar-preview-dialog) {
    width: 95% !important;
    margin-top: 5vh !important;
  }

  .preview-image {
    max-height: 250px;
  }
}
</style>
