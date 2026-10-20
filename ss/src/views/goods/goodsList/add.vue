<template>
  <div class="add-companion-container">
    <!-- 头部返回 -->
    <div class="page-header" @click="handleBack">
      <i class="el-icon-arrow-left"></i>
      <div class="page-title">{{ pageTitle }}</div>
    </div>

    <el-card shadow="hover" class="form-card">
      <el-form ref="companionForm" :rules="formRules" :model="formData" label-width="104px" class="companion-form"
        size="medium">
        <el-form-item label="商品名称" prop="productName">
          <el-input v-model="formData.productName" style="width: 300px" placeholder="请输入商品名称" maxlength="15" />
        </el-form-item>
        <el-form-item label="商品图片" prop="productImg">
          <el-upload class="avatar-uploader" action="#" :show-file-list="false" :before-upload="beforeAvatarUpload"
            :http-request="handleAvatarUpload" :disabled="uploading" accept=".png,.jpg,.jpeg">
            <!-- 上传容器 -->
            <div class="upload-container">
              <!-- 图片预览 + 删除按钮 -->
              <div v-if="formData.productImg" class="avatar-wrapper">
                <img :src="formData.productImg" alt="" class="avatar" />
                <div class="avatar-actions">
                  <el-button type="danger" icon="el-icon-delete" circle size="mini" @click.stop="handleRemoveLogo"
                    title="删除图片">
                  </el-button>
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
                  <el-progress v-if="uploadProgress > 0" :percentage="uploadProgress" :stroke-width="6"
                    :show-text="false" class="upload-progress">
                  </el-progress>
                </div>
              </div>
            </div>
            <div class="el-upload__tip" slot="tip">仅支持上传png、jpg格式，图片大小不得超过2M</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="业务类型" prop="businessType">
          <el-checkbox-group v-model="formData.businessType">
            <el-checkbox label="1" name="type">搭档</el-checkbox>
            <el-checkbox label="2" name="type">代练</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="价格分类" prop="priceType">
          <el-select v-model="formData.priceType" placeholder="请选择类型" style="width: 300px">
            <el-option label="一局" value="1" />
            <el-option label="一小时" value="2" />
            <el-option label="半小时" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="分润属性" prop="profitType">
          <el-radio-group v-model="formData.profitType">
            <el-radio label="0">特殊</el-radio>
            <el-radio label="1">通用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="搜索联想词" prop="searchKeywords">
          <div class="keyword-editor">
            <div class="keyword-editor__section-head">
              <div>
                <div class="keyword-editor__section-title">已选联想词</div>
                <div class="keyword-editor__section-subtitle">把玩家真的会搜的词放进来，比如官方全称、简称、别名、英文缩写</div>
              </div>
              <button v-if="searchKeywordTagList.length" type="button" class="keyword-editor__clear" @click="clearSearchKeywords">
                清空全部
              </button>
            </div>

            <div class="keyword-editor__tags" :class="{ 'is-empty': !searchKeywordTagList.length }">
              <template v-if="searchKeywordTagList.length">
                <el-tag
                  v-for="keyword in searchKeywordTagList"
                  :key="keyword"
                  closable
                  disable-transitions
                  class="keyword-tag"
                  @close="removeSearchKeyword(keyword)"
                >
                  {{ keyword }}
                </el-tag>
              </template>
              <div v-else class="keyword-editor__empty">
                <i class="el-icon-magic-stick"></i>
                <span>先带入游戏主词，再手动补简称、别名和英文缩写，这样前台搜游戏时命中会更稳</span>
              </div>
            </div>

            <div class="keyword-editor__controls">
              <el-input
                v-model.trim="searchKeywordDraft"
                class="keyword-editor__field"
                placeholder="手动补充简称、别名、英文名，按回车或英文逗号生成标签"
                maxlength="20"
                @keydown.native="handleSearchKeywordKeydown"
                @blur="handleSearchKeywordBlur"
              />
              <el-button class="keyword-editor__add" type="primary" @click="handleSearchKeywordCreate">
                添加联想词
              </el-button>
              <el-button class="keyword-editor__assist" plain :disabled="!baseSearchKeywords.length" @click="fillBaseSearchKeywords">
                带入商品名
              </el-button>
            </div>
          </div>
        </el-form-item>
        <!-- 保存和取消按钮 -->
        <el-form-item class="form-actions">
          <el-button type="primary" size="medium" @click="handleSubmit" :loading="submitLoading"
            style="background: #4d23d9; border-color: #4d23d9;">
            保存
          </el-button>
          <el-button type="default" size="medium" @click="handleBack">
            取消
          </el-button>
        </el-form-item>
      </el-form>

    </el-card>
  </div>
</template>

<script>
import { addProduct, editProduct, getProductDetail } from '@/api/goodsList'
import { fileUpload } from "@/api/user";

export default {
  name: 'AddCompanion', // 必须与keep-alive的include匹配
  inject: ['switchToList', 'getSharedData'], // 注入父组件方法
  data() {
    return {
      isEditMode: false,
      submitLoading: false,
      ossId: '',// 图片ossId
      uploading: false, // 上传状态
      uploadProgress: 0, // 上传进度
      cancelUpload: null, // 取消上传的函数
      // 表单数据
      formData: {
        productName: "", // 商品名称
        productImg: "",// 商品名称
        businessType: [],
        priceType: null,
        profitType: '',
        searchKeywords: ''
      },
      searchKeywordDraft: '',
      // 渠道选项
      clientTypeOptions: [
        { label: "安卓", value: '1' },
        { label: "IOS ", value: '2' },
      ],
      // 表单验证规则
      formRules: {
        productName: [
          { required: true, message: "请输入商品名称", trigger: 'blur' },
          { max: 15, message: "商品名称最多15个字符", trigger: 'blur' },
        ],
        productImg: [
          { required: true, message: "请上传商品图片", trigger: 'blur' },
        ],
        businessType: [
          { required: true, message: "请选择业务类型", trigger: 'blur' },
          { type: 'array', min: 1, message: "至少选择一个业务类型", trigger: 'change' }
        ],
        priceType: [
          { required: true, message: "请选择价格分类", trigger: 'blur' },
        ],
        profitType: [
          { required: true, message: "请选择分润属性", trigger: 'blur' },
        ],
      },
    };
  },
  created() {
    // 获取共享数据，判断是否是编辑模式
    const sharedData = this.getSharedData();
    if (sharedData && sharedData.editId) {
      this.isEditMode = true;
      // 编辑模式，获取商品详情
      this.getProductInfo(sharedData.editId);
    } else {
      this.isEditMode = false;
    }
  },
  computed: {
    pageTitle() {
      return this.isEditMode ? '编辑商品' : '新增商品';
    },
    searchKeywordTagList() {
      return this.normalizeSearchKeywords(this.formData.searchKeywords);
    },
    baseSearchKeywords() {
      return this.buildBaseSearchKeywords();
    }
  },
  activated() {
    console.log('批量新增/编辑组件被激活')
    // 获取共享数据，判断是否是编辑模式
    const sharedData = this.getSharedData();
    if (sharedData && sharedData.editId) {
      this.isEditMode = true;
      // 编辑模式，获取商品详情
      this.getProductInfo(sharedData.editId);
    } else {
      this.isEditMode = false;
    }
  },
  deactivated() {
    this.isEditMode = false;
    this.formData = {
      productName: "", // 商品名称
      productImg: "",// 商品图片
      businessType: [],
      priceType: null,
      profitType: '',
      searchKeywords: ''
    };
    this.searchKeywordDraft = '';
    // 重置共享数据中的编辑ID，避免影响下一次编辑
    const sharedData = this.getSharedData();
    if (sharedData) {
      sharedData.editId = null;
      sharedData.editRow = null;
    }
  },
  methods: {
    sanitizeSearchKeyword(value) {
      return String(value || '')
        .replace(/[\n,，]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },
    normalizeSearchKeywords(value) {
      return Array.from(new Set(
        String(value || '')
          .split(/[\n,，]+/)
          .map(item => this.sanitizeSearchKeyword(item))
          .filter(Boolean)
      ));
    },
    syncSearchKeywords(keywords) {
      this.formData.searchKeywords = keywords.join(',');
    },
    buildSearchKeywordSeed() {
      const productName = this.sanitizeSearchKeyword(this.formData.productName);
      if (!productName) {
        return '';
      }

      const seed = productName
        .replace(/(陪玩|陪练|代练|上分|服务|套餐|专区|商品|一局|半小时|小时|专属|通用)/g, '')
        .replace(/[()（）【】{}]/g, ' ')
        .replace(/\[/g, ' ')
        .replace(/\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return seed || productName;
    },
    buildBaseSearchKeywords() {
      const productName = this.sanitizeSearchKeyword(this.formData.productName);
      const keywordSeed = this.buildSearchKeywordSeed();
      return this.normalizeSearchKeywords([keywordSeed, productName].filter(Boolean).join(','));
    },
    mergeSearchKeywords(inputKeywords) {
      const normalizedKeywords = Array.isArray(inputKeywords)
        ? this.normalizeSearchKeywords(inputKeywords.join(','))
        : this.normalizeSearchKeywords(inputKeywords);
      const nextKeywords = this.searchKeywordTagList.slice();
      let addedCount = 0;
      let hasTooLongKeyword = false;
      let reachedMaxLength = false;

      for (const keyword of normalizedKeywords) {
        if (keyword.length > 20) {
          hasTooLongKeyword = true;
          continue;
        }

        if (nextKeywords.includes(keyword)) {
          continue;
        }

        const mergedKeywords = nextKeywords.concat(keyword);
        if (mergedKeywords.join(',').length > 200) {
          reachedMaxLength = true;
          break;
        }

        nextKeywords.push(keyword);
        addedCount += 1;
      }

      return {
        nextKeywords,
        addedCount,
        hasTooLongKeyword,
        reachedMaxLength
      };
    },
    applySearchKeywordResult(result, options = {}) {
      const {
        nextKeywords,
        addedCount,
        hasTooLongKeyword,
        reachedMaxLength
      } = result;
      const {
        resetDraft = false,
        silent = false,
        emptyMessage = '',
        successMessage = ''
      } = options;

      if (hasTooLongKeyword) {
        this.$message.warning('单个联想词最多 20 个字符');
      }

      if (reachedMaxLength) {
        this.$message.warning('搜索联想词总长度不能超过 200 个字符');
      }

      this.syncSearchKeywords(nextKeywords);

      if (resetDraft) {
        this.searchKeywordDraft = '';
      }

      this.$nextTick(() => {
        if (this.$refs.companionForm) {
          this.$refs.companionForm.clearValidate('searchKeywords');
        }
      });

      if (silent) {
        return addedCount;
      }

      if (addedCount > 0 && successMessage) {
        this.$message.success(successMessage.replace('{count}', addedCount));
      } else if (addedCount === 0 && emptyMessage) {
        this.$message.info(emptyMessage);
      }

      return addedCount;
    },
    appendSearchKeywords(keywords, options = {}) {
      return this.applySearchKeywordResult(this.mergeSearchKeywords(keywords), options);
    },
    handleSearchKeywordKeydown(event) {
      if (event.isComposing || event.keyCode === 229) {
        return;
      }

      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        this.handleSearchKeywordCreate();
        return;
      }

      if (event.key === 'Backspace' && !this.searchKeywordDraft) {
        const lastKeyword = this.searchKeywordTagList[this.searchKeywordTagList.length - 1];
        if (lastKeyword) {
          this.removeSearchKeyword(lastKeyword);
        }
      }
    },
    handleSearchKeywordCreate() {
      if (!this.normalizeSearchKeywords(this.searchKeywordDraft).length) {
        this.searchKeywordDraft = '';
        return;
      }
      this.appendSearchKeywords(this.searchKeywordDraft, {
        resetDraft: true,
        silent: true
      });
    },
    handleSearchKeywordBlur() {
      this.handleSearchKeywordCreate();
    },
    removeSearchKeyword(keyword) {
      const nextKeywords = this.searchKeywordTagList.filter(item => item !== keyword);
      this.syncSearchKeywords(nextKeywords);
    },
    fillBaseSearchKeywords() {
      if (!this.baseSearchKeywords.length) {
        this.$message.info('先填商品名称，我才能帮你带入基础主词');
        return;
      }
      this.appendSearchKeywords(this.baseSearchKeywords, {
        successMessage: '已带入 {count} 个基础主词',
        emptyMessage: '基础主词已经都在上面了'
      });
    },
    clearSearchKeywords() {
      this.syncSearchKeywords([]);
      this.searchKeywordDraft = '';
    },
    // 删除图片
    handleRemoveLogo() {
      this.$confirm('确定要删除图片吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true;
            // 这里可以调用删除文件的API
            this.executeRemoveLogo().finally(() => {
              instance.confirmButtonLoading = false;
              done();
            });
          } else {
            done();
          }
        }
      }).then(() => {
        // 在beforeClose中已经处理
      }).catch(() => {
        // 取消删除
      });
    },
    async executeRemoveLogo() {
      try {
        // 清除本地数据
        this.formData.productImg = '';
        this.ossId = null;
        this.$message.success('图片已删除');

        // 如果使用了表单验证，可能需要手动触发验证
        this.$nextTick(() => {
          if (this.$refs.addFormRef) {
            this.$refs.addFormRef.validateField('productImg');
          }
        });
      } catch (error) {
        this.$message.error('删除失败：' + (error.message || '请稍后重试'));
      }
    },

    // 图片上传前校验
    beforeAvatarUpload(file) {
      const fileName = (file.name || '').toLowerCase();
      const isValidType = ['image/png', 'image/jpg', 'image/jpeg'].includes(file.type)
        || /\.(png|jpg|jpeg)$/.test(fileName);
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isValidType) {
        this.$message.error("仅支持上传png、jpg格式图片");
      }
      if (!isLt2M) {
        this.$message.error("图片大小不能超过 2MB");
      }
      return isValidType && isLt2M;
    },
    // 上传处理
    async handleAvatarUpload({ file, onSuccess, onProgress }) {
      try {
        // 开始上传，显示loading
        this.uploading = true;
        this.uploadProgress = 0;

        // 模拟上传进度（实际项目中根据API进度更新）
        const progressInterval = setInterval(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += 10;
            // 调用进度回调
            onProgress({ percent: this.uploadProgress });
          }
        }, 200);

        // 转换为二进制数据
        const formData = new FormData();
        formData.append('file', file);

        // 创建取消上传的Promise
        const controller = new AbortController();
        this.cancelUpload = () => {
          controller.abort();
          clearInterval(progressInterval);
          this.uploading = false;
          this.uploadProgress = 0;
        };

        // 上传文件（添加signal支持取消）
        const response = await fileUpload(formData, {
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            // 如果有实际的上传进度，使用这个
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            this.uploadProgress = percent;
            onProgress({ percent });
          }
        });

        clearInterval(progressInterval);
        this.uploadProgress = 100;

        if (response.code === 200) {
          this.formData.productImg = URL.createObjectURL(file);
          this.ossId = response.data.ossId;

          // 延迟显示成功，让进度条到100%
          setTimeout(() => {
            onSuccess("success");
            this.$message.success("商品图片上传成功");
            this.uploading = false;
            this.uploadProgress = 0;
          }, 300);
        } else {
          throw new Error(response.message || '上传失败');
        }
      } catch (error) {
        // 取消上传不显示错误
        if (error.name !== 'AbortError') {
          this.$message.error(error.message || '上传失败');
        }
        this.uploading = false;
        this.uploadProgress = 0;
      }
    },

    // 获取商品详情
    async getProductInfo(id) {
      try {
        const res = await getProductDetail(id);
        console.log('商品详情数据:', res);
        // 处理不同的数据结构
        let product;
        if (res.success && res.data) {
          product = res.data;
        } else if (res.id) {
          product = res;
        }

        if (product) {
          this.formData = {
            id: product.id,
            productName: product.productName || '',
            productImg: product.productImgUrl || '',  // 预览用URL
            businessType: product.businessType || [],
            priceType: product.priceType || null,
            profitType: product.profitType || '',
            searchKeywords: product.searchKeywords || ''
          };
          // 关键：保存 OSS ID 用于编辑时提交
          this.ossId = product.productImg || '';  // productImg 是 OSS ID
          console.log('表单数据填充:', this.formData);
        } else {
          this.$message.error('获取商品详情失败');
        }
      } catch (error) {
        console.error('获取商品详情失败:', error);
        this.$message.error('获取商品详情失败');
      }
    },

    // 表单提交
    async handleSubmit() {
      try {
        this.handleSearchKeywordCreate();
        // 触发表单验证
        const isValid = await this.$refs.companionForm.validate()
        if (!isValid) {
          return
        }

        // 构造提交参数
        this.submitLoading = true
        const submitData = {
          productName: this.formData.productName,
          productImg: this.ossId,  // 直接使用 ossId，不再使用 ||
          priceType: this.formData.priceType,
          profitType: this.formData.profitType,
          businessType: this.formData.businessType,
          searchKeywords: this.formData.searchKeywords
        };

        // 如果是编辑模式，添加id
        const sharedData = this.getSharedData();
        if (sharedData && sharedData.editId) {
          submitData.id = sharedData.editId;
        }

        // 调用后端接口
        let res;
        if (submitData.id) {
          res = await editProduct(submitData);
        } else {
          res = await addProduct(submitData);
        }

        if (res.success) {
          this.$message.success(submitData.id ? "修改成功" : "新增成功")
          this.switchToList(true)
        } else {
          this.$message.error(res.errorMessage || (submitData.id ? "修改失败" : "新增失败"))
        }
      } catch (error) {
        console.error('提交表单异常:', error)
      } finally {
        this.submitLoading = false
      }
    },

    // 返回列表页（适配无路由切换）
    handleBack() {
      // 调用父组件方法返回列表
      this.switchToList(false)
      // 重置表单
      this.searchKeywordDraft = ''
      this.$refs.companionForm.resetFields()
    },
  },
};
</script>

<style scoped lang="scss">
::v-deep .el-card__body {
  padding: 0 0 0 0;
}

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

.add-companion-container {
  background-color: #fff;
  // min-height: 100vh;
  padding: 32px;
  border-radius: 24px
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

.form-card {
  margin: 0 auto;
  border-radius: 0;
  border: 0;
}

.el-card.is-always-shadow,
.el-card.is-hover-shadow:focus,
.el-card.is-hover-shadow:hover {
  -webkit-box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0);
}

.companion-form {
  margin-top: 20px;
  padding: 0 0;
}


// 按钮组样式
.btn-group,
.btn-group2 {
  display: inline-block;
  margin-left: 10px;
}

.btn-group .el-button--text {
  border-radius: 50%;
  background: #4d23d9;
  color: #fff;
  height: 20px;
  width: 20px;
  padding: 0;

  &:hover {
    background: #3a19b8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
}

.btn-group2 .el-button--text {
  border-radius: 50%;
  background: #FF4D4F;
  color: #fff;
  height: 20px;
  width: 20px;
  padding: 0;

  &:hover {
    background: #fa4548;
  }
}

// 提示信息样式
.tip-wrapper {
  display: flex;
  align-items: center;
  margin-top: 4px;
  line-height: 12px;
}

.loading-icon {
  color: #4d23d9;
  font-size: 12px;
  margin-right: 4px;
  animation: rotate 1.5s linear infinite;
}

.error-tip {
  color: #f56c6c;
  font-size: 12px;
}

.success-tip {
  color: #67c23a;
  font-size: 12px;
}

// 批量操作样式
.phone-count-tip {
  margin-left: 15px;
  font-size: 12px;
  color: #909399;
}

// 按钮区域
.form-actions {
  padding-left: 120px;
  margin-top: 30px;

  button {
    padding: 8px 24px;
    margin-right: 15px;
  }
}

.keyword-editor {
  width: 660px;
  max-width: 100%;
  padding: 20px;
  border: 1px solid #d9e7ff;
  border-radius: 24px;
  background: linear-gradient(180deg, #fafdff 0%, #f5fbf7 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.keyword-editor__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.keyword-editor__section-title {
  color: #1d2129;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
}

.keyword-editor__section-subtitle {
  margin-top: 3px;
  color: #86909c;
  font-size: 12px;
  line-height: 18px;
}

.keyword-editor__tags {
  min-height: 102px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px;
  margin-bottom: 16px;
  border-radius: 22px;
  border: 1px dashed #d6dff7;
  background: rgba(255, 255, 255, 0.9);
}

.keyword-editor__tags.is-empty {
  align-items: center;
}

.keyword-editor__empty {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #86909c;
  font-size: 13px;
  line-height: 20px;
}

.keyword-tag {
  height: 40px;
  line-height: 38px;
  padding: 0 18px;
  margin: 0;
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #4d86ff 0%, #5b7dff 100%);
  box-shadow: 0 10px 22px rgba(91, 125, 255, 0.2);
}

.keyword-editor__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.keyword-editor__field {
  flex: 1;
  min-width: 240px;
}

.keyword-editor__add {
  height: 40px;
  padding: 0 28px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #2f6bff 0%, #4f8dff 100%);
  box-shadow: 0 10px 24px rgba(47, 107, 255, 0.22);
}

.keyword-editor__add:hover,
.keyword-editor__add:focus {
  background: linear-gradient(135deg, #255ff0 0%, #437ff5 100%);
}

.keyword-editor__assist {
  height: 40px;
  padding: 0 24px;
  border: 0;
  border-radius: 14px;
  color: #ffffff;
  background: linear-gradient(135deg, #6f6bff 0%, #9758ff 100%);
  box-shadow: 0 10px 24px rgba(121, 101, 255, 0.2);
}

.keyword-editor__assist:hover,
.keyword-editor__assist:focus {
  color: #ffffff;
  background: linear-gradient(135deg, #655ff3 0%, #8b4df4 100%);
}

.keyword-editor__clear {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  color: #8b95a3;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  background: transparent;
}

.keyword-editor__clear:hover,
.keyword-editor__clear:focus {
  color: #f56c6c;
}

::v-deep .keyword-editor__field .el-input__inner {
  height: 48px;
  border-radius: 14px;
  border-color: #d6deef;
  background: rgba(255, 255, 255, 0.96);
  padding: 0 18px;
  font-size: 14px;
}

::v-deep .keyword-editor__field .el-input__inner:focus {
  border-color: #2f6bff;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.12);
}

::v-deep .keyword-tag .el-tag__close {
  color: rgba(255, 255, 255, 0.88);
  background: transparent;
}

::v-deep .keyword-tag .el-tag__close:hover {
  color: #316dff;
  background: #ffffff;
}

// 动画
@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

// 响应式适配
@media (max-width: 768px) {
  .add-companion-container {
    padding: 10px;
  }

  .form-actions {
    padding-left: 0;
    text-align: center;

    button {
      width: 100%;
      max-width: 200px;
      margin: 5px auto;
      display: block;
    }
  }

  .el-select {
    width: 100% !important;
  }

  .el-input {
    width: 100% !important;
  }

  .keyword-editor {
    padding: 14px;
  }

  .keyword-editor__controls,
  .keyword-editor__section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .keyword-editor__add {
    width: 100%;
  }

  .keyword-editor__assist {
    width: 100%;
  }

  .keyword-editor__clear {
    align-self: flex-end;
  }
}
</style>
