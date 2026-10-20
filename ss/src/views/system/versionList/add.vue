<template>
  <div class="activity-form-container">
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">{{ isEdit ? '返回' : '返回' }}</div>
    </div>

    <el-form ref="form" :model="form" :rules="rules" label-width="100px" class="version-form">
      <!-- 版本号 -->
      <el-form-item label="版本号" prop="versionCode">
        <el-input v-model="form.versionCode" placeholder="请输入版本号" maxlength="15" show-word-limit style="width: 400px" />
      </el-form-item>

      <!-- 渠道 -->
      <el-form-item label="渠道" prop="platform">
        <el-select v-model="form.platform" placeholder="请选择渠道" style="width: 400px" @change="handleChange">
          <el-option label="android" :value="0" />
          <el-option label="iOS" :value="1" />
        </el-select>
      </el-form-item>

      <!-- 更新类型 -->
      <el-form-item label="更新类型" prop="isForceUpdate">
        <el-select v-model="form.isForceUpdate" placeholder="请选择更新类型" style="width: 400px">
          <el-option label="强制更新" :value="1" />
          <el-option label="非强制更新" :value="0" />
        </el-select>
      </el-form-item>

      <!-- 更新内容 -->
      <el-form-item label="更新内容" prop="updateContent">
        <el-input type="textarea" v-model="form.updateContent" placeholder="请输入更新说明" maxlength="100" show-word-limit
          :rows="4" style="width: 400px" />
      </el-form-item>

      <!-- 安卓 → 显示安装包上传 -->
      <el-form-item v-if="form.platform == '0'" label="安装包" prop="packageFile">
        <el-upload class="avatar-uploader" action="#" :show-file-list="false" :http-request="handleAvatarUpload"
          accept=".apk" :disabled="uploading">
          <!-- 上传中状态 -->
          <div v-if="uploading" class="uploading-state">
            <div class="uploading-content">
              <i class="el-icon-loading uploading-icon"></i>
              <div class="uploading-text">上传中 {{ uploadProgress }}%</div>
              <el-progress :percentage="uploadProgress" :stroke-width="8" color="#6A35FF" :show-text="false"
                class="upload-progress">
              </el-progress>
            </div>
          </div>
          <div v-if="!packageFile.updateFileName" class="upload-box">
            <i class="el-icon-upload" />
            <span>点击上传安卓安装包</span>
          </div>
          <div v-else class="file-info">
            <!-- <i class="el-icon-document" /> -->
            <img src="@/assets/apk.png" alt="" class="apkTextLogo" />
            <span class="filename">{{ packageFile.updateFileName }}</span>
            <el-button type="text" icon="el-icon-close" @click.stop="removePackage" />
          </div>
        </el-upload>
      </el-form-item>

      <!-- iOS → 显示下载链接 -->
      <el-form-item v-if="form.platform == '1'" label="下载链接" prop="updateFileUrl">
        <el-input v-model="form.updateFileUrl" placeholder="请输入iOS下载链接" style="width: 400px" />
      </el-form-item>

      <!-- 按钮 -->
      <el-form-item>
        <div style="text-align: right;width: 400px">
          <el-button @click="handleBack">返回</el-button>
          <el-button type="primary" @click="submitForm('form')">提交</el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import {
  versionEat,    // 获取详情
  versionAdd,    // 新增
  versionEdit, // 编辑
  fileUpload, // 文件上传
} from "@/api/versionList";
export default {
  name: 'VersionAdd',
  inject: ['switchToList', 'getSharedData'], // 注入父组件方法
  data() {
    return {
      uploading: false, // 上传中
      uploadProgress: 0, // 上传进度
      formData: {},
      // 是否编辑（可根据路由/父组件传值控制）
      isEdit: false,
      // 表单
      form: {
        versionCode: '',
        platform: null,
        isForceUpdate: '',
        updateContent: '',
        updateFileUrl: '',
        updateFileName: '',
        updateOssId: '',
        // appStoreUrl: '',
      },
      packageFile: {
        updateFileName: '',
        updateOssId: '',
        updateFileUrl: ''
      },
      // 上传文件列表
      fileList: [],
      // 上传接口（换成你自己的）
      uploadUrl: '/api/upload/apk',
      // 校验规则
      rules: {
        versionCode: [
          { required: true, message: '请输入版本号', trigger: 'blur' }
        ],
        platform: [
          { required: true, message: '请选择渠道', trigger: 'change' }
        ],
        isForceUpdate: [
          { required: true, message: '请选择更新类型', trigger: 'change' }
        ],
        updateContent: [
          { required: true, message: '请输入更新内容', trigger: 'blur' }
        ],
        updateOssId: [
          { required: true, message: '请上传安装包', trigger: 'change' }
        ],
        updateFileUrl: [
          { required: true, message: '请输入iOS下载链接', trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    // 从父组件获取共享数据，判断是否为编辑模式
    const sharedData = this.getSharedData()
    if (sharedData.editId) {
      this.isEdit = true
      this.formData.id = sharedData.editId
      console.log('>>详情接口数据', this.formData.id)
      this.getDetail(this.formData.id)
    }
  },
  methods: {

    // 详情接口
    async getDetail(id) {

      const res = await versionEat(id)
      console.log('详情接口数据', res)
      this.form = res.data
      this.packageFile = {
        updateFileName: this.form.updateFileName,
        updateOssId: this.form.updateOssId,
        updateFileUrl: this.form.updateFileUrl
      }
    },
    // 提交
    async submit() {
      this.$refs.form.validate(async () => {

      })
    },
    // 返回列表页（适配无路由切换）
    handleBack() {
      this.switchToList(false)
    },
    // 上传处理
    /**
     * 异步处理头像/凭证上传
     * @param {Object} params - 上传参数
     * @param {File} params.file - 要上传的文件对象
     * @param {Function} params.onSuccess - 上传成功回调函数
     * @param {Function} params.onProgress - 上传进度回调函数
     */
    async handleAvatarUpload({ file, onSuccess, onProgress }) {
      try {
        // 1. 设置上传状态
        this.uploading = true;          // 标记正在上传中
        this.uploadProgress = 0;        // 重置上传进度为0

        // 2. 创建模拟进度定时器（用于视觉效果，让用户感觉更流畅）
        const progressInterval = setInterval(() => {
          // 仅在进度小于90%时增加模拟进度，避免覆盖实际进度
          if (this.uploadProgress < 90) {
            this.uploadProgress += 10;      // 每次增加10%
            onProgress({ percent: this.uploadProgress }); // 触发进度回调
          }
        }, 200); // 每200ms更新一次

        // 3. 准备上传数据
        const formData = new FormData();    // 创建表单数据对象
        formData.append('file', file);      // 将文件添加到表单数据中

        // 4. 创建中断控制器，支持取消上传
        const controller = new AbortController();

        // 暴露取消上传方法，供外部调用
        this.cancelUpload = () => {
          controller.abort();              // 中断请求
          clearInterval(progressInterval); // 清除模拟进度定时器
          this.uploading = false;         // 重置上传状态
          this.uploadProgress = 0;         // 重置进度
        };

        // 5. 执行实际上传
        const response = await fileUpload(formData, {
          signal: controller.signal,      // 传入中断信号
          onUploadProgress: (progressEvent) => {
            // 根据实际上传进度计算百分比
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            this.uploadProgress = percent;      // 更新实际进度
            onProgress({ percent });            // 触发进度回调
          }

        });

        // 6. 上传完成，清理模拟进度定时器
        clearInterval(progressInterval);
        this.uploadProgress = 100;          // 确保进度显示为100%

        // 7. 处理上传结果
        if (response.code === 200) {
          // 上传成功

          // 延迟300ms返回成功，确保UI有足够时间显示100%进度
          setTimeout(() => {
            onSuccess("success");                   // 调用成功回调
            this.$message.success("上传成功");   // 显示成功提示
            let packageFile = response.data
            this.packageFile = {
              updateFileName: packageFile.fileName,
              updateOssId: packageFile.ossId,
              updateFileUrl: packageFile.url,
            },
              console.log('》》上传文件', this.form.packageFile)
            this.uploading = false;
            this.uploadProgress = 0;
            this.form.updateFileName = this.packageFile.updateFileName
            this.form.updateOssId = this.packageFile.updateOssId
            this.form.updateFileUrl = this.packageFile.updateFileUrl
          }, 300);
        } else {
          // 服务器返回错误状态码
          throw new Error(response.message || '上传失败');
        }
      } catch (error) {
        // 8. 错误处理
        // 如果是用户主动取消上传（AbortError），不显示错误提示
        if (error.name !== 'AbortError') {
          this.$message.error(error.message || '上传失败');
        }
        // 重置上传状态
        this.uploading = false;
        this.uploadProgress = 0;
      }
    },

    handleChange() {
      this.removePackage()
      // 切换渠道时，清除所有可能残留的校验错误提示
      if (this.$refs.form) {
        // 清除安装包和下载链接的校验错误
        this.$refs.form.clearValidate(['updateOssId', 'updateFileUrl']);
      }
    },
    // 删除安装包
    removePackage() {

      this.packageFile = {
        updateFileName: '',
        updateOssId: '',
        updateFileUrl: ''
      },
        this.form.updateFileName = ''
      this.form.updateOssId = ''
      this.form.updateFileUrl = ''
      this.fileList = []
      console.log('》》删除安装包', this.form.packageFile)
    },
    // 提交表单
    async submitForm(form) {
      this.$refs[form].validate(async (valid) => {
        if (valid) {
          try {
            let res = {}
            if (this.isEdit) {
              res = await versionEdit(this.form)
            } else {
              res = await versionAdd(this.form)
            }
            if (res.code === 200) {
              this.$message.success(this.isEdit ? "更新成功" : "新增成功")
              // this.handleBack() // 返回列表页
              this.switchToList(true)
            } else {
              this.$message.error(res.msg || (this.isEdit ? "更新失败" : "新增失败"))
            }
          } catch (error) {
            console.error('提交表单异常:', error)
            // this.$message.error("提交失败，请稍后重试")
          } finally {
            this.submitLoading = false
          }
        } else {
          console.log('error submit!!');
          return this.$message.warning('请填写完整信息');
        }
      });

    }
  }
}
</script>

<style scoped lang="scss">
.activity-form-container {
  padding: 20px;
  background: #fff;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.activity-form {
  margin-top: 20px;
  max-width: 800px;
}

.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.avatar-uploader .el-upload:hover {
  border-color: #409EFF;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 80px;
  height: 80px;
  line-height: 80px;
  text-align: center;
}

.avatar {
  width: 80px;
  height: 80px;
  display: block;
}

.upload-tip,
.tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.app-version-page {
  padding: 20px;
  background: #fff;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.version-form {
  margin-top: 20px;
}

.upload-box {
  border: 1px dashed #dcdcdc;
  width: 400px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  cursor: pointer;
}

.file-info {
  display: flex;
  align-items: center;
  width: 400px;
  padding: 10px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.filename {
  margin-left: 8px;
  flex: 1;
}

// 上传中状态
.uploading-state {
  padding: 40px 20px;
  text-align: center;

  .uploading-content {
    .uploading-icon {
      font-size: 32px;
      color: #6A35FF;
      margin-bottom: 16px;
      animation: rotating 2s linear infinite;
    }

    .uploading-text {
      color: #333;
      font-size: 14px;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .upload-progress {
      width: 80%;
      margin: 0 auto;

      ::v-deep .el-progress-bar__outer {
        background-color: #f0f0f0;
        border-radius: 10px;
        height: 8px;
      }

      ::v-deep .el-progress-bar__inner {
        border-radius: 10px;
        background: linear-gradient(90deg, #6A35FF, #9047F8);
      }
    }
  }
}

.apkTextLogo {
  width: 30px;
  height: 30px;
}
</style>