<template>
  <el-upload
    class="avatar-uploader"
    action="#"
    :show-file-list="false"
    :before-upload="beforeAvatarUpload"
    :http-request="handleAvatarUpload"
    :disabled="uploading"
  >
    <!-- 上传容器 -->
    <div class="upload-container">
      <!-- 图片预览 + 删除按钮 -->
      <div v-if="imageUrl" class="avatar-wrapper">
        <img :src="imageUrl" class="avatar" />
        <div class="avatar-actions">
          <el-button
            type="danger"
            icon="el-icon-delete"
            circle
            size="mini"
            @click.stop="handleRemoveLogo"
            title="删除图片"
          />
        </div>
      </div>

      <!-- 上传按钮（无图片时） -->
      <div v-else-if="!uploading" class="upload-placeholder">
        <i class="el-icon-plus"></i>
        <span class="upload-text">上传</span>
      </div>

      <!-- 上传中遮罩层 -->
      <div v-if="uploading" class="uploading-overlay">
        <div class="uploading-content">
          <i class="el-icon-loading"></i>
          <span class="uploading-text">上传中...</span>
          <el-progress
            v-if="uploadProgress > 0"
            :percentage="uploadProgress"
            :stroke-width="6"
            :show-text="false"
            class="upload-progress"
          />
        </div>
      </div>
    </div>

    <div class="el-upload__tip" slot="tip">
      仅支持上传png、jpg、jpeg格式，图片大小不得超过2M
    </div>
  </el-upload>
</template>

<script>
import { fileUpload } from '@/api/user'

export default {
  name: 'AvatarUpload',
  props: {
    // 初始图片URL
    value: {
      type: String,
      default: ''
    },
    // 初始OSS ID
    ossId: {
      type: String,
      default: ''
    },
    // 是否禁用上传
    disabled: {
      type: Boolean,
      default: false
    },
    // 上传文件大小限制(MB)
    sizeLimit: {
      type: Number,
      default: 2
    },
    // 允许的文件类型
    accept: {
      type: Array,
      default: () => ['png', 'jpg', 'jpeg']
    }
  },
  data() {
    return {
      uploading: false, // 上传状态
      uploadProgress: 0, // 上传进度
      cancelUpload: null, // 取消上传的函数
      localOssId: this.ossId // 本地存储OSS ID
    }
  },
  computed: {
    // 计算当前显示的图片URL
    imageUrl() {
      return this.value
    }
  },
  watch: {
    // 监听外部传入的ossId变化
    ossId(newVal) {
      this.localOssId = newVal
    },
    // 监听外部传入的value变化
    value(newVal) {
      // 同步图片URL
    }
  },
  methods: {
    // 删除图片
    handleRemoveLogo() {
      this.$confirm('确定要删除图片吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            this.executeRemoveLogo().finally(() => {
              instance.confirmButtonLoading = false
              done()
            })
          } else {
            done()
          }
        }
      })
    },

    // 执行删除逻辑
    async executeRemoveLogo() {
      try {
        // 如果有OSS ID，调用删除接口（根据实际项目调整）
        if (this.localOssId) {
          // await deleteFile({ ossId: this.localOssId });
        }

        // 重置本地状态
        this.localOssId = ''
        this.uploadProgress = 0
        
        // 向父组件发送删除事件
        this.$emit('input', '')
        this.$emit('change', {
          url: '',
          ossId: ''
        })
        
        this.$message.success('图片已删除')
      } catch (error) {
        this.$message.error('删除失败：' + (error.message || '请稍后重试'))
      }
    },

    // 上传前校验
    beforeAvatarUpload(file) {
      if (this.disabled) return false
      
      // 校验文件类型
      const fileExt = file.name.split('.').pop().toLowerCase()
      const isAccept = this.accept.includes(fileExt)
      if (!isAccept) {
        this.$message.error(`只能上传${this.accept.join('、')}格式的图片`)
        return false
      }

      // 校验文件大小
      const isLtSize = file.size / 1024 / 1024 < this.sizeLimit
      if (!isLtSize) {
        this.$message.error(`图片大小不能超过 ${this.sizeLimit}MB`)
        return false
      }

      return true
    },

    // 处理文件上传
    async handleAvatarUpload({ file, onSuccess, onProgress }) {
      try {
        this.uploading = true
        this.uploadProgress = 0

        // 模拟上传进度（实际项目中使用真实进度）
        const progressInterval = setInterval(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += 10
            onProgress({ percent: this.uploadProgress })
          }
        }, 200)

        // 构建上传表单
        const formData = new FormData()
        formData.append('file', file)

        // 创建取消上传控制器
        const controller = new AbortController()
        this.cancelUpload = () => {
          controller.abort()
          clearInterval(progressInterval)
          this.uploading = false
          this.uploadProgress = 0
        }

        // 调用上传接口
        const response = await fileUpload(formData, {
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            this.uploadProgress = percent
            onProgress({ percent })
          }
        })

        clearInterval(progressInterval)
        this.uploadProgress = 100

        if (response.code === 200) {
          // 创建本地预览URL
          const previewUrl = URL.createObjectURL(file)
          this.localOssId = response.data.ossId
          
          // 向父组件发送上传成功事件
          this.$emit('input', previewUrl)
          this.$emit('change', {
            url: previewUrl,
            ossId: response.data.ossId,
            file
          })

          // 延迟完成上传状态
          setTimeout(() => {
            onSuccess("success")
            this.$message.success("图片上传成功")
            this.uploading = false
            this.uploadProgress = 0
          }, 300)
        } else {
          throw new Error(response.message || '上传失败')
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.$message.error(error.message || '上传失败')
        }
        this.uploading = false
        this.uploadProgress = 0
      }
    },

    // 取消上传（供父组件调用）
    cancelUploadAction() {
      if (this.cancelUpload) {
        this.cancelUpload()
      }
    },

    // 获取当前OSS ID（供父组件调用）
    getOssId() {
      return this.localOssId
    }
  }
}
</script>

<style lang="scss" scoped>
.upload-container {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  background: #fafafa;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

/* 图片操作按钮 */
.avatar-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-wrapper:hover .avatar-actions {
  opacity: 1;
}

/* 删除按钮样式 */
.avatar-actions .el-button {
  background: rgba(255, 0, 0, 0.7);
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.avatar-actions .el-button:hover {
  background: #f56c6c;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  font-size: 14px;
}

.upload-placeholder .el-icon-plus {
  font-size: 18px;
  color: #1D2129;
  font-weight: 700;
  margin-bottom: 5px;
}

/* 上传中遮罩层 */
.uploading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.uploading-content {
  text-align: center;
  color: #409eff;
}

.uploading-content .el-icon-loading {
  font-size: 24px;
  margin-bottom: 8px;
  display: block;
}

.uploading-text {
  display: block;
  font-size: 12px;
  margin-bottom: 8px;
}

.upload-progress {
  width: 80px;
}

.upload-text {
  font-size: 14px;
  color: #1D2129;
  line-height: 22px;
}

::v-deep .el-upload__tip {
  font-size: 12px;
  color: #C9CDD4;
  line-height: 17px !important;
}
</style>