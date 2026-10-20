<template>
    <div class="union-operation-page" v-loading="pageLoading">
        <!-- 头部 -->
        <div class="page-header">
            <h3 class="page-title">公会运营信息</h3>
        </div>

        <!-- 表单卡片 -->
        <el-card shadow="never" class="form-card">
            <el-form ref="operationForm" :model="formData" :rules="formRules" label-width="120px"
                class="operation-form">
                <!-- 俱乐部简介 -->
                <el-form-item label="俱乐部简介" prop="introduction">
                    <el-input v-model="formData.introduction" type="textarea" :rows="5" placeholder="请输入俱乐部简介"
                        maxlength="70" show-word-limit style="width: 600px;">
                    </el-input>
                    <div class="form-tip">
                        <i class="el-icon-info"></i>
                        请输入公会运营相关介绍，最多70个字符
                    </div>
                </el-form-item>

                <!-- 俱乐部宣传图片 -->
                <el-form-item label="俱乐部宣传图片" prop="photos">
                    <div class="photos-upload-wrapper">
                        <div class="photos-list">
                            <div v-for="(photo, index) in formData.photos" :key="index" class="photo-item">
                                <img :src="photo" class="photo-image" />
                                <div class="photo-mask">
                                    <i class="el-icon-zoom-in" @click.stop="previewPhoto(index)"></i>
                                    <i class="el-icon-edit-outline" @click.stop="triggerPhotoUpload(index)"></i>
                                    <i class="el-icon-delete" @click.stop="removePhoto(index)"></i>
                                </div>
                                <div v-if="photoUploading && uploadingIndex === index" class="photo-loading">
                                    <i class="el-icon-loading"></i>
                                </div>
                            </div>
                            <div v-if="formData.photos.length < 1" class="photo-upload-btn" @click="triggerPhotoUpload()">
                                <i class="el-icon-plus"></i>
                                <span>上传图片</span>
                            </div>
                        </div>
                        <input ref="photoInput" type="file" accept="image/png,image/jpeg,image/jpg"
                            style="display: none" @change="handlePhotoChange" />
                    </div>
                    <div class="form-tip">
                        <i class="el-icon-info"></i>
                        最多上传1张图片，支持png、jpg格式，单张不超过50M，上传后支持修改
                    </div>
                    <div class="inline-actions">
                        <el-button type="primary" @click="submitForm" :loading="submitLoading" class="submit-btn"
                            v-permission="'system:clubOperation:edit'">
                            保存配置
                        </el-button>
                    </div>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- 图片预览弹窗 -->
        <el-dialog :visible.sync="previewVisible" title="图片预览" width="500px" append-to-body>
            <img :src="previewUrl" style="width: 100%;" />
        </el-dialog>
    </div>
</template>

<script>
import { fileUpload } from '@/api/user'
import { operationDetail, updateOperation } from '@/api/clubOperation'

export default {
    name: 'UnionOperation',
    data() {
        return {
            pageLoading: false,
            submitLoading: false,
            photoUploading: false,
            uploadingIndex: -1,
            replacePhotoIndex: -1,
            photoOssIds: [],
            previewVisible: false,
            previewUrl: '',

            formData: {
                introduction: '',
                photos: []
            },

            formRules: {
                introduction: [
                    { required: true, message: '请输入俱乐部简介', trigger: 'blur' },
                    { max: 70, message: '俱乐部简介不能超过70个字符', trigger: 'blur' }
                ]
            }
        }
    },

    created() {
        this.fetchDetail();
    },

    methods: {
        // ==================== 获取详情 ====================
        async fetchDetail() {
            this.pageLoading = true;
            try {
                const res = await operationDetail();
                if (res.success) {
                    const data = res.data || {};

                    // 处理简介
                    this.formData.introduction = data.introduction || '';

                    // 处理图片
                    let photosArray = [];
                    let photoOssIdsArray = [];

                    if (data.photos) {
                        photoOssIdsArray = data.photos.split(',').filter(id => id && id.trim());
                    }

                    if (data.photosUrl) {
                        photosArray = data.photosUrl.split(',').filter(url => url && url.trim());
                    }

                    this.formData.photos = photosArray;
                    this.photoOssIds = photoOssIdsArray;
                } else {
                    this.$message.error(res.errorMessage || '获取运营信息失败');
                }
            } catch (error) {
                console.error("获取运营信息失败:", error);
                this.$message.error("获取运营信息失败");
            } finally {
                this.pageLoading = false;
            }
        },

        // ==================== 俱乐部图片上传 ====================
        triggerPhotoUpload(index = -1) {
            this.replacePhotoIndex = index;
            this.$refs.photoInput.click();
        },

        async handlePhotoChange(e) {
            const files = Array.from(e.target.files || []);
            this.$refs.photoInput.value = '';
            if (!files.length) {
                this.replacePhotoIndex = -1;
                return;
            }

            const validFiles = files.filter(file => {
                const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
                const isLt50M = file.size / 1024 / 1024 <= 50;
                if (!isImage) {
                    this.$message.error(`${file.name} 格式不支持，仅支持 png、jpg`);
                    return false;
                }
                if (!isLt50M) {
                    this.$message.error(`${file.name} 大小超过50MB`);
                    return false;
                }
                return true;
            });

            if (!validFiles.length) {
                this.replacePhotoIndex = -1;
                return;
            }

            if (this.replacePhotoIndex === -1 && this.formData.photos.length >= 1) {
                this.$message.warning('最多只能上传1张图片');
                this.replacePhotoIndex = -1;
                return;
            }

            await this.uploadPhoto(validFiles[0], this.replacePhotoIndex);
            this.replacePhotoIndex = -1;
        },

        async uploadPhoto(file, replaceIndex = -1) {
            const isReplace = replaceIndex > -1 && replaceIndex < this.formData.photos.length;
            const currentIndex = isReplace ? replaceIndex : this.formData.photos.length;
            if (!isReplace) {
                this.formData.photos.push('');
                this.photoOssIds.push('');
            }
            this.uploadingIndex = currentIndex;
            this.photoUploading = true;

            try {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fileUpload(formData);

                if (response.code === 200) {
                    this.$set(this.formData.photos, currentIndex, URL.createObjectURL(file));
                    this.$set(this.photoOssIds, currentIndex, response.data.ossId);
                    this.$message.success(isReplace ? '修改成功' : '上传成功');
                } else {
                    throw new Error(response.message || '上传失败');
                }
            } catch (error) {
                this.$message.error(error.message || '上传失败');
                if (!isReplace) {
                    this.formData.photos.splice(currentIndex, 1);
                    this.photoOssIds.splice(currentIndex, 1);
                }
            } finally {
                this.photoUploading = false;
                this.uploadingIndex = -1;
            }
        },

        removePhoto(index) {
            this.formData.photos.splice(index, 1);
            this.photoOssIds.splice(index, 1);
        },

        previewPhoto(index) {
            if (this.formData.photos[index]) {
                this.previewUrl = this.formData.photos[index];
                this.previewVisible = true;
            }
        },

        // ==================== 提交 ====================
        async submitForm() {
            try {
                await this.$refs.operationForm.validate();
            } catch {
                return;
            }

            // 构建提交数据
            const photosStr = this.photoOssIds.filter(id => id).join(',');

            const submitData = {
                introduction: this.formData.introduction,
                photos: photosStr
            };

            this.submitLoading = true;
            try {
                const res = await updateOperation(submitData);
                if (res.success) {
                    this.$message.success('保存成功');
                    // 重新获取数据刷新页面
                    await this.fetchDetail();
                } else {
                    this.$message.error(res.errorMessage || '保存失败');
                }
            } catch (error) {
                console.error("保存失败:", error);
                this.$message.error("保存失败，请稍后重试");
            } finally {
                this.submitLoading = false;
            }
        }
    }
}
</script>

<style scoped lang="scss">
.union-operation-page {
    height: 100%;
    padding: 24px;
    background: #F5F7FA;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    box-sizing: border-box;
}

.page-header {
    margin-bottom: 24px;
    flex-shrink: 0;

    .page-title {
        font-size: 20px;
        font-weight: 600;
        color: #303133;
        margin: 0;
    }
}

.form-card {
    flex: 1;
    border-radius: 12px;
    border: none;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    ::v-deep .el-card__body {
        padding: 24px;
    }
}

.operation-form {
    max-width: 800px;

    ::v-deep .el-form-item {
        margin-bottom: 24px;
    }

    .form-tip {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        font-size: 13px;
        color: #909399;

        i {
            color: #8F03FF;
            font-size: 14px;
        }
    }
}

.inline-actions {
    margin-top: 20px;
}

// 俱乐部图片上传样式
.photos-upload-wrapper {
    .photos-list {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    .photo-item {
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e8e8e8;
        cursor: pointer;

        .photo-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .photo-mask {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            opacity: 0;
            transition: opacity 0.3s;

            i {
                font-size: 18px;
                color: #fff;
                cursor: pointer;

                &:hover {
                    color: #8F03FF;
                }
            }
        }

        &:hover .photo-mask {
            opacity: 1;
        }

        .photo-loading {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;

            i {
                font-size: 24px;
                color: #8F03FF;
                animation: rotate 1s linear infinite;
            }
        }
    }

    .photo-upload-btn {
        width: 100px;
        height: 100px;
        border: 1px dashed #d9d9d9;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: #fafafa;
        transition: border-color 0.3s;

        &:hover {
            border-color: #8F03FF;
        }

        i {
            font-size: 28px;
            color: #8c939d;
            margin-bottom: 8px;
        }

        span {
            font-size: 12px;
            color: #8c939d;
        }
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.submit-btn {
    min-width: 120px;
    height: 40px;
    border-radius: 8px;
    background: #8F03FF;
    border-color: #8F03FF;

    &:hover,
    &:focus {
        background: #7A00E0;
        border-color: #7A00E0;
    }
}
</style>
