<template>
    <div class="feedback-remark-page" v-loading="pageLoading">
        <el-card shadow="never" class="remark-card">
            <div slot="header" class="page-header">
                <div class="page-back" @click="handleCancel">
                    <i class="el-icon-arrow-left"></i>
                    <span>备注意见反馈</span>
                </div>
            </div>

            <div class="remark-content">
                <div class="detail-row">
                    <div class="detail-label">问题描述：</div>
                    <div class="detail-value">
                        <div class="description-box">
                            {{ formData.description || "-" }}
                        </div>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">问题图片：</div>
                    <div class="detail-value">
                        <div v-if="formData.imageList.length" class="preview-list">
                            <el-image
                                v-for="(image, index) in formData.imageList"
                                :key="`${formData.feedbackId || 'feedback'}-${index}`"
                                :src="image"
                                :preview-src-list="formData.imageList"
                                fit="cover"
                                class="preview-image"
                            />
                        </div>
                        <div v-else class="empty-text">-</div>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">用户账号信息：</div>
                    <div class="detail-value account-text">
                        {{ formData.name || "-" }}（ID：{{ formData.userId || "-" }}）
                    </div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">状态：</div>
                    <div class="detail-value">
                        <el-radio-group v-model="formData.status">
                            <el-radio label="1">已采纳</el-radio>
                            <el-radio label="0">未采纳</el-radio>
                        </el-radio-group>
                    </div>
                </div>

                <div class="detail-row detail-row--textarea">
                    <div class="detail-label">备注</div>
                    <div class="detail-value">
                        <div class="remark-input-wrapper">
                            <el-input
                                v-model="formData.remark"
                                type="textarea"
                                :rows="6"
                                :maxlength="200"
                                resize="none"
                                placeholder="请输入备注"
                                @input="handleRemarkInput"
                            />
                            <div class="remark-counter">{{ remainingRemarkCount }}/200</div>
                        </div>
                    </div>
                </div>

                <div class="page-footer">
                    <el-button class="footer-btn" @click="handleCancel">取消</el-button>
                    <el-button
                        type="primary"
                        class="footer-btn footer-btn--primary"
                        :loading="saveLoading"
                        @click="handleSave"
                    >
                        保存
                    </el-button>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script>
import { getUserFeedbackRemarkDetail, saveUserFeedbackRemark } from "@/api/marketing";

export default {
    name: "MarketingFeedbackRemark",
    inject: ["switchToFeedbackList", "getFeedbackSharedData"],
    data() {
        return {
            pageLoading: false,
            saveLoading: false,
            formData: {
                feedbackId: "",
                description: "",
                imageList: [],
                name: "",
                userId: "",
                status: "1",
                remark: "",
            },
        };
    },
    computed: {
        remainingRemarkCount() {
            return Math.max(200 - (this.formData.remark || "").length, 0);
        },
    },
    activated() {
        this.initializePage();
    },
    methods: {
        // 备注详情图片字段为逗号分隔字符串。
        parseImageList(value) {
            if (typeof value !== "string" || !value.trim()) {
                return [];
            }

            return value
                .split(",")
                .map((item) => item.trim())
                .filter((item) => !!item);
        },

        normalizeId(value) {
            if (value === null || value === undefined || value === "") {
                return "";
            }
            return String(value).trim();
        },

        buildRequestId(value) {
            const numericValue = Number(value);
            return Number.isSafeInteger(numericValue) ? numericValue : value;
        },

        normalizeStatus(value) {
            return String(value) === "1" ? "1" : "0";
        },

        resetFormData() {
            this.formData = {
                feedbackId: "",
                description: "",
                imageList: [],
                name: "",
                userId: "",
                status: "1",
                remark: "",
            };
        },

        async initializePage() {
            const sharedData = this.getFeedbackSharedData ? this.getFeedbackSharedData() || {} : {};
            const currentRow = sharedData.currentRow || {};
            const feedbackId = this.normalizeId(currentRow.feedbackId);

            if (!feedbackId) {
                this.switchToFeedbackList(false);
                return;
            }

            this.resetFormData();
            this.formData.feedbackId = feedbackId;
            this.formData.status = this.normalizeStatus(currentRow.status);
            await this.fetchDetail();
        },

        async fetchDetail() {
            this.pageLoading = true;
            try {
                const res = await getUserFeedbackRemarkDetail({
                    feedbackId: this.buildRequestId(this.formData.feedbackId),
                });
                this.formData = {
                    feedbackId: this.normalizeId(res.data.feedbackId || this.formData.feedbackId),
                    description: res.data.description || "",
                    imageList: this.parseImageList(res.data.img),
                    name: res.data.name || "",
                    userId: this.normalizeId(res.data.userId),
                    status: this.normalizeStatus(res.data.status),
                    remark: res.data.remark || "",
                };
            } catch (error) {
                console.error("获取意见反馈备注详情失败:", error);
                this.$message.error("获取详情失败，请稍后重试");
                this.switchToFeedbackList(false);
            } finally {
                this.pageLoading = false;
            }
        },

        handleRemarkInput(value) {
            this.formData.remark = typeof value === "string" ? value.slice(0, 200) : "";
        },

        async handleSave() {
            if (!this.formData.feedbackId) {
                this.$message.warning("缺少反馈ID");
                return;
            }

            if ((this.formData.remark || "").length > 200) {
                this.$message.warning("备注最多输入200字");
                return;
            }

            this.saveLoading = true;
            try {
                const res = await saveUserFeedbackRemark({
                    feedbackId: this.buildRequestId(this.formData.feedbackId),
                    status: this.formData.status,
                    remark: this.formData.remark || "",
                });

                if (res.success !== true) {
                    this.$message.error("保存失败");
                    return;
                }

                this.$message.success("保存成功");
                this.switchToFeedbackList(true);
            } catch (error) {
                console.error("保存意见反馈备注失败:", error);
                this.$message.error("保存失败，请稍后重试");
            } finally {
                this.saveLoading = false;
            }
        },

        handleCancel() {
            this.switchToFeedbackList(false);
        },
    },
};
</script>

<style scoped lang="scss">
.feedback-remark-page,
.remark-card {
    height: 100%;
}

.remark-card {
    border-radius: 12px;

    ::v-deep .el-card__body {
        height: calc(100% - 60px);
        padding: 0;
    }
}

.page-header {
    display: flex;
    align-items: center;
    min-height: 28px;
}

.page-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #1d2129;
    cursor: pointer;
}

.remark-content {
    height: 100%;
    padding: 28px 36px 24px;
    box-sizing: border-box;
    overflow-y: auto;
}

.detail-row {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 0 16px;
    align-items: start;
    margin-bottom: 24px;
}

.detail-row--textarea {
    margin-bottom: 0;
}

.detail-label {
    padding-top: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #1d2129;
    line-height: 22px;
    text-align: right;
}

.detail-value {
    min-width: 0;
    color: #1d2129;
    line-height: 22px;
}

.description-box {
    min-height: 84px;
    padding: 14px 16px;
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    background: #f7f8fa;
    white-space: pre-wrap;
    word-break: break-all;
}

.preview-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.preview-image {
    width: 88px;
    height: 88px;
    border-radius: 8px;
    border: 1px solid #e5e6eb;
    background: #f7f8fa;
    overflow: hidden;
}

.empty-text,
.account-text {
    padding-top: 8px;
}

.remark-input-wrapper {
    position: relative;
    width: 100%;
    max-width: 760px;
}

.remark-counter {
    position: absolute;
    right: 12px;
    bottom: 10px;
    font-size: 12px;
    color: #c0c4cc;
    pointer-events: none;
    background: #fff;
    line-height: 1;
}

.page-footer {
    margin-top: 56px;
    padding-top: 20px;
    border-top: 1px solid #e5e6eb;
    display: flex;
    justify-content: flex-end;
    gap: 16px;
}

.footer-btn {
    min-width: 96px;
    border-radius: 6px;
}

.footer-btn--primary {
    background: #6a35ff;
    border-color: #6a35ff;

    &:hover,
    &:focus {
        background: #5b2ce3;
        border-color: #5b2ce3;
    }
}

::v-deep .el-textarea__inner {
    min-height: 140px !important;
    padding-bottom: 32px;
    border-radius: 8px;
}

@media (max-width: 960px) {
    .remark-content {
        padding: 20px 16px 16px;
    }

    .detail-row {
        grid-template-columns: 1fr;
        gap: 8px 0;
    }

    .detail-label {
        padding-top: 0;
        text-align: left;
    }

    .page-footer {
        margin-top: 32px;
    }
}
</style>
