<!-- src/views/AvatarUploadDemo.vue -->
<template>
  <div class="demo-container">
    <h2>图片上传组件 Demo</h2>
    
    <el-card class="demo-card">
      <el-form label-width="100px" :model="form" class="demo-form">
        <!-- 上传组件使用示例 -->
        <el-form-item label="头像上传" prop="avatar">
          <avatar-upload
            v-model="form.avatarUrl"
            :oss-id="form.ossId"
            :size-limit="2"
            :accept="['png', 'jpg', 'jpeg']"
            :disabled="false"
            @change="handleAvatarChange"
            @upload-success="handleUploadSuccess"
            @upload-fail="handleUploadFail"
            @delete="handleAvatarDelete"
            ref="avatarUploadRef"
          />
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">提交数据</el-button>
          <el-button @click="handleCancelUpload">取消上传</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 提交结果展示 -->
    <div class="result-container" v-if="submitResult">
      <h3>提交的数据：</h3>
      <pre>{{ submitResult }}</pre>
    </div>
  </div>
</template>

<script>
import AvatarUpload from '@/components/ImageUpload/index.vue'

export default {
  name: 'AvatarUploadDemo',
  components: {
    AvatarUpload
  },
  data() {
    return {
      form: {
        avatarUrl: '', // 图片预览URL
        ossId: ''      // 图片OSS ID
      },
      submitResult: null // 提交结果
    }
  },
  methods: {
    // 头像变化回调
    handleAvatarChange(data) {
      console.log('头像变化：', data)
      this.form.ossId = data.ossId || ''
      this.form.avatarUrl = data.url || ''
    },

    // 上传成功回调
    handleUploadSuccess(response) {
      console.log('上传成功：', response)
      this.$message.success('上传成功，OSS ID：' + response.data.ossId)
    },

    // 上传失败回调
    handleUploadFail(error) {
      console.error('上传失败：', error)
      this.$message.error('上传失败：' + error.message)
    },

    // 头像删除回调
    handleAvatarDelete() {
      console.log('头像已删除')
      this.$message.info('头像已删除')
    },

    // 提交数据
    handleSubmit() {
      this.submitResult = {
        avatarUrl: this.form.avatarUrl,
        ossId: this.form.ossId,
        submitTime: new Date().toLocaleString()
      }
      this.$message.success('数据已提交，查看下方结果')
    },

    // 取消上传
    handleCancelUpload() {
      this.$refs.avatarUploadRef?.cancelUploadAction()
    },

    // 重置
    handleReset() {
      this.form = {
        avatarUrl: '',
        ossId: ''
      }
      this.submitResult = null
      this.$message.info('已重置')
    }
  }
}
</script>

<style lang="scss" scoped>
.demo-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 0 20px;
}

.demo-card {
  margin-top: 20px;
}

.demo-form {
  padding: 20px;
}

.result-container {
  margin-top: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;

  pre {
    background: #fff;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
    max-height: 400px;
    overflow: auto;
  }
}
</style>