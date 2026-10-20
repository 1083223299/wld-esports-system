<template>
    <div class="config-page" v-loading="pageLoading">
        <el-card shadow="never" class="config-card">
            <div slot="header" class="page-header">
                <div class="page-back" @click="handleCancel">
                    <i class="el-icon-arrow-left"></i>
                    <span>{{ isBatchMode ? "批量配置广告位" : "配置广告位" }}</span>
                </div>
            </div>

            <div class="config-content">
                <el-form ref="formRef" :model="formData" label-width="96px" class="config-form">
                    <el-form-item label="关联游戏" required>
                        <el-select
                            v-if="!isBatchMode"
                            v-model="formData.productId"
                            disabled
                            class="game-select"
                        >
                            <el-option
                                :label="formData.productName || formData.productId || '-'"
                                :value="formData.productId"
                            />
                        </el-select>

                        <el-select
                            v-else
                            v-model="formData.productIds"
                            multiple
                            collapse-tags
                            disabled
                            class="game-select"
                        >
                            <el-option
                                v-for="item in batchProducts"
                                :key="item.productId"
                                :label="item.productName || item.productId"
                                :value="item.productId"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="状态" required>
                        <el-radio-group v-model="formData.status">
                            <el-radio :label="STATUS_MAP.ENABLED">开启</el-radio>
                            <el-radio :label="STATUS_MAP.DISABLED">关闭</el-radio>
                        </el-radio-group>
                    </el-form-item>
                </el-form>

                <div class="section-header">
                    <div>
                        <div class="section-title">关联俱乐部管理</div>
                        <div class="section-subtitle">已关联俱乐部</div>
                    </div>
                    <el-button type="primary" class="add-club-btn" @click="handleOpenClubDialog">
                        添加俱乐部
                    </el-button>
                </div>

                <div class="club-list">
                    <div
                        v-for="(club, index) in formData.clubList"
                        :key="club.tradeId"
                        class="club-card"
                    >
                        <button type="button" class="remove-btn" @click="handleRemoveClub(index)">
                            <i class="el-icon-close"></i>
                        </button>

                        <div class="club-meta">
                            <div class="club-avatar">
                                <img v-if="club.logoUrl" :src="club.logoUrl" :alt="club.tradeName" />
                                <span v-else>{{ getAvatarText(club.tradeName) }}</span>
                            </div>

                            <div class="club-info">
                                <div class="club-name">{{ club.tradeName || "-" }}</div>
                                <div class="club-id">{{ club.tradeNo || club.tradeId || "-" }}</div>
                            </div>
                        </div>

                        <div class="club-fields">
                            <div class="club-field">
                                <div class="club-field__label">开始时间</div>
                                <el-date-picker
                                    v-model="club.startTime"
                                    type="datetime"
                                    value-format="yyyy-MM-dd HH:mm:ss"
                                    format="yyyy-MM-dd HH:mm:ss"
                                    placeholder="年-月-日"
                                    :disabled="club.isPermanent === 1"
                                    class="club-field__input"
                                />
                            </div>

                            <div class="club-field">
                                <div class="club-field__label">结束时间</div>
                                <el-date-picker
                                    v-model="club.endTime"
                                    type="datetime"
                                    value-format="yyyy-MM-dd HH:mm:ss"
                                    format="yyyy-MM-dd HH:mm:ss"
                                    placeholder="年-月-日"
                                    :disabled="club.isPermanent === 1"
                                    class="club-field__input"
                                />
                            </div>

                            <div class="club-field club-field--checkbox">
                                <el-checkbox
                                    :value="club.isPermanent === 1"
                                    @change="handlePermanentChange(club, $event)"
                                >
                                    永久有效
                                </el-checkbox>
                            </div>

                            <div class="club-field club-field--sort">
                                <div class="club-field__label">序号</div>
                                <el-input
                                    v-model="club.sortValue"
                                    placeholder="请输入"
                                    class="club-field__sort-input"
                                    @input="handleSortInput(club)"
                                    @blur="sortClubList"
                                />
                            </div>
                        </div>
                    </div>

                    <div v-if="!formData.clubList.length" class="club-empty">
                        暂无关联俱乐部
                    </div>
                </div>

                <div class="page-footer">
                    <el-button class="footer-btn" @click="handleCancel">取消</el-button>
                    <el-button type="primary" class="footer-btn footer-btn--primary" :loading="saveLoading" @click="handleSave">
                        保存
                    </el-button>
                </div>
            </div>
        </el-card>

        <ClubSelectDialog
            :visible.sync="clubDialogVisible"
            :selected-clubs="formData.clubList"
            @confirm="handleClubConfirm"
        />
    </div>
</template>

<script>
import {
    batchSaveGameZoneClubAdSlot,
    getGameZoneClubAdSlotDetail,
    saveGameZoneClubAdSlot,
} from "@/api/marketing";
import ClubSelectDialog from "./components/ClubSelectDialog.vue";

const STATUS_MAP = {
    DISABLED: "0",
    ENABLED: "1",
};

export default {
    name: "GameZoneClubAdvConfig",
    components: {
        ClubSelectDialog,
    },
    inject: ["switchToList", "getSharedData"],
    data() {
        return {
            STATUS_MAP,
            pageLoading: false,
            saveLoading: false,
            clubDialogVisible: false,
            sharedData: {},
            batchProducts: [],
            formData: {
                productId: "",
                productIds: [],
                productName: "",
                entranceImage: "",
                status: STATUS_MAP.ENABLED,
                clubList: [],
            },
        };
    },
    computed: {
        isBatchMode() {
            return this.sharedData.mode === "batch";
        },
    },
    activated() {
        this.initializePage();
    },
    methods: {
        unwrapResponse(res) {
            if (res && res.config && Object.prototype.hasOwnProperty.call(res, "status")) {
                const responseData = res.data || {};
                return responseData.data !== undefined ? responseData.data : responseData;
            }
            return res || {};
        },
        isActionRequestSuccess(res) {
            const data = this.unwrapResponse(res);
            return res === true || data === true || data.success === true || String(data.code) === "200" || String(data.errorCode) === "0";
        },
        getResponseMessage(res, fallback) {
            const data = this.unwrapResponse(res);
            return data.errorMessage || data.msg || fallback;
        },
        // 统一处理单游戏与批量配置入口，避免两套页面状态分叉。
        async initializePage() {
            this.sharedData = this.getSharedData ? this.getSharedData() || {} : {};
            this.resetFormData();

            if (this.isBatchMode) {
                this.buildBatchData();
                return;
            }

            await this.buildSingleData();
        },
        resetFormData() {
            this.batchProducts = [];
            this.formData = {
                productId: "",
                productIds: [],
                productName: "",
                entranceImage: "",
                status: STATUS_MAP.ENABLED,
                clubList: [],
            };
        },
        buildBatchData() {
            const rows = Array.isArray(this.sharedData.selectedRows) ? this.sharedData.selectedRows : [];
            this.batchProducts = rows.map((item) => ({
                productId: this.normalizeId(item.productId),
                productName: item.productName || "",
            }));
            this.formData.productIds = this.batchProducts.map((item) => item.productId);
            this.formData.status = STATUS_MAP.ENABLED;
        },
        async buildSingleData() {
            const editRow = this.sharedData.editRow || {};
            this.formData.productId = this.normalizeId(editRow.productId);
            this.formData.productName = editRow.productName || "";
            this.formData.productIds = this.formData.productId ? [this.formData.productId] : [];
            this.formData.status = this.normalizeStatus(editRow.status, STATUS_MAP.ENABLED);

            if (!this.formData.productId) {
                return;
            }

            this.pageLoading = true;
            try {
                const res = await getGameZoneClubAdSlotDetail({
                    productId: this.buildRequestId(this.formData.productId),
                });
                const detail = this.unwrapResponse(res.data);
                this.formData.productId = this.normalizeId(detail.productId || this.formData.productId);
                this.formData.productName = detail.productName || this.formData.productName;
                this.formData.productIds = this.formData.productId ? [this.formData.productId] : [];
                this.formData.entranceImage = this.normalizeId(detail.entranceImage);
                this.formData.status = this.normalizeStatus(detail.status, this.formData.status);
                this.formData.clubList = Array.isArray(detail.clubList)
                    ? detail.clubList.map((item, index) => this.normalizeClubItem(item, index))
                    : [];
                this.sortClubList();
            } catch (error) {
                console.error("获取俱乐部广告位详情失败:", error);
                this.$message.error("获取详情失败，请稍后重试");
            } finally {
                this.pageLoading = false;
            }
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
        normalizeStatus(value, fallback = STATUS_MAP.ENABLED) {
            if (value === null || value === undefined || value === "") {
                return fallback;
            }
            return String(value);
        },
        normalizeClubItem(item, index = 0) {
            return {
                tradeId: this.normalizeId(item.tradeId),
                tradeNo: item.tradeNo || "",
                tradeName: item.tradeName || "",
                logo: this.normalizeId(item.logo),
                logoUrl: item.logoUrl || "",
                isPermanent: Number(item.isPermanent) === 1 ? 1 : 0,
                startTime: item.startTime || "",
                endTime: item.endTime || "",
                sortValue: String(
                    item.sortValue === null || item.sortValue === undefined || item.sortValue === ""
                        ? this.getDefaultSortValue(index)
                        : item.sortValue
                ),
            };
        },
        getDefaultSortValue(index) {
            return index + 1;
        },
        getNextSortValue() {
            const currentValues = this.formData.clubList.map((item) => Number(item.sortValue || 0));
            const currentMax = currentValues.length ? Math.max(...currentValues) : 0;
            return String(currentMax + 1);
        },
        getAvatarText(name) {
            return name ? String(name).slice(0, 1).toUpperCase() : "A";
        },
        handleOpenClubDialog() {
            this.clubDialogVisible = true;
        },
        // 弹窗确认后按 tradeId 去重，已存在的俱乐部保留当前时间与排序配置。
        handleClubConfirm(selectedClubs) {
            const currentMap = {};
            this.formData.clubList.forEach((item) => {
                currentMap[item.tradeId] = item;
            });

            const mergedList = [];
            let nextSortValue = Number(this.getNextSortValue());
            (selectedClubs || []).forEach((item, index) => {
                const tradeId = this.normalizeId(item.tradeId);
                if (currentMap[tradeId]) {
                    mergedList.push(currentMap[tradeId]);
                    return;
                }
                mergedList.push(
                    this.normalizeClubItem(
                        {
                            ...item,
                            isPermanent: 1,
                            sortValue: String(nextSortValue),
                        },
                        index
                    )
                );
                nextSortValue += 1;
            });

            this.formData.clubList = mergedList;
            this.sortClubList();
        },
        handleRemoveClub(index) {
            this.formData.clubList.splice(index, 1);
        },
        handlePermanentChange(club, checked) {
            club.isPermanent = checked ? 1 : 0;
            if (checked) {
                club.startTime = "";
                club.endTime = "";
            }
        },
        handleSortInput(club) {
            club.sortValue = String(club.sortValue || "").replace(/[^\d]/g, "");
        },
        sortClubList() {
            this.formData.clubList.sort((a, b) => Number(b.sortValue || 0) - Number(a.sortValue || 0));
        },
        validateForm() {
            if (!this.isBatchMode && !this.formData.productId) {
                this.$message.warning("缺少关联游戏");
                return false;
            }

            if (this.isBatchMode && !this.formData.productIds.length) {
                this.$message.warning("请先选择需要批量配置的游戏");
                return false;
            }
            for (let index = 0; index < this.formData.clubList.length; index += 1) {
                const club = this.formData.clubList[index];
                if (!club.tradeId) {
                    this.$message.warning(`第 ${index + 1} 个俱乐部缺少俱乐部ID`);
                    return false;
                }

                if (club.sortValue === "") {
                    this.$message.warning(`请填写 ${club.tradeName || `第 ${index + 1} 个`} 俱乐部的序号`);
                    return false;
                }

                if (club.isPermanent === 1) {
                    continue;
                }

                if (!club.startTime || !club.endTime) {
                    this.$message.warning(`请完善 ${club.tradeName || `第 ${index + 1} 个`} 俱乐部的生效时间`);
                    return false;
                }

                if (new Date(club.startTime).getTime() > new Date(club.endTime).getTime()) {
                    this.$message.warning(`请检查 ${club.tradeName || `第 ${index + 1} 个`} 俱乐部的起止时间`);
                    return false;
                }
            }

            return true;
        },
        buildClubSaveList() {
            return this.formData.clubList.map((item) => {
                const clubItem = {
                    tradeId: this.buildRequestId(item.tradeId),
                    isPermanent: item.isPermanent,
                    sortValue: Number(item.sortValue || 0),
                };

                if (item.isPermanent !== 1) {
                    clubItem.startTime = item.startTime;
                    clubItem.endTime = item.endTime;
                }

                return clubItem;
            });
        },
        buildSavePayload() {
            const payload = {
                status: this.formData.status,
                clubList: this.buildClubSaveList(),
            };

            if (this.formData.entranceImage) {
                payload.entranceImage = this.buildRequestId(this.formData.entranceImage);
            }

            if (this.isBatchMode) {
                payload.productIds = this.formData.productIds.map((item) => this.buildRequestId(item));
            } else {
                payload.productId = this.buildRequestId(this.formData.productId);
            }

            return payload;
        },
        async handleSave() {
            if (!this.validateForm()) {
                return;
            }

            this.saveLoading = true;
            try {
                const request = this.isBatchMode ? batchSaveGameZoneClubAdSlot : saveGameZoneClubAdSlot;
                const res = await request(this.buildSavePayload());
                if (!this.isActionRequestSuccess(res)) {
                    this.$message.error(this.getResponseMessage(res, "保存失败"));
                    return;
                }

                this.$message.success(this.isBatchMode ? "批量配置成功" : "保存成功");
                this.switchToList();
            } catch (error) {
                console.error("保存俱乐部广告位配置失败:", error);
                this.$message.error("保存失败，请稍后重试");
            } finally {
                this.saveLoading = false;
            }
        },
        handleCancel() {
            this.$confirm("确认放弃当前编辑？未保存的数据将丢失。", "提示", {
                confirmButtonText: "确认",
                cancelButtonText: "取消",
                type: "warning",
            })
                .then(() => {
                    this.switchToList();
                })
                .catch(() => {});
        },
    },
};
</script>

<style scoped lang="scss">
.config-page,
.config-card {
    height: 100%;
}

.config-card {
    border-radius: 12px;

    ::v-deep .el-card__body {
        height: calc(100% - 60px);
        padding: 0;
        display: flex;
        flex-direction: column;
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

.config-content {
    flex: 1;
    padding: 24px 28px 20px;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.config-form {
    flex-shrink: 0;
}

.game-select {
    width: 520px;
    max-width: 100%;
}

.section-header {
    margin-top: 8px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.section-title {
    font-size: 20px;
    font-weight: 600;
    color: #1d2129;
    line-height: 28px;
}

.section-subtitle {
    margin-top: 4px;
    font-size: 14px;
    color: #86909c;
}

.add-club-btn {
    min-width: 96px;
    border-radius: 6px;
    background: #6a35ff;
    border-color: #6a35ff;

    &:hover,
    &:focus {
        background: #5b2ce3;
        border-color: #5b2ce3;
    }
}

.club-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}

.club-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 18px 20px;
    border: 1px solid #e5e6eb;
    border-radius: 10px;
    background: #fff;
    margin-bottom: 14px;
}

.remove-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 24px;
    height: 24px;
    border: 1px solid #dcdfe6;
    border-radius: 50%;
    background: #fff;
    color: #606266;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        color: #f56c6c;
        border-color: #f56c6c;
    }
}

.club-meta {
    flex-shrink: 0;
    width: 210px;
    display: flex;
    align-items: center;
    gap: 14px;
}

.club-avatar {
    width: 52px;
    height: 52px;
    border-radius: 8px;
    overflow: hidden;
    background: #f2f3f5;
    color: #1d2129;
    font-size: 22px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.club-info {
    min-width: 0;
}

.club-name {
    font-size: 16px;
    font-weight: 600;
    color: #1d2129;
    line-height: 22px;
    word-break: break-all;
}

.club-id {
    margin-top: 6px;
    font-size: 14px;
    color: #4e5969;
    line-height: 20px;
}

.club-fields {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    align-items: end;
}

.club-field__label {
    margin-bottom: 8px;
    font-size: 13px;
    color: #4e5969;
    line-height: 20px;
}

.club-field__input,
.club-field__sort-input {
    width: 100%;
}

.club-field--checkbox {
    padding-bottom: 10px;
}

.club-field--sort {
    max-width: 92px;
}

.club-empty {
    border: 1px dashed #dcdfe6;
    border-radius: 10px;
    padding: 40px 16px;
    text-align: center;
    font-size: 14px;
    color: #86909c;
}

.page-footer {
    flex-shrink: 0;
    margin-top: 24px;
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

@media (max-width: 1360px) {
    .club-card {
        flex-direction: column;
        align-items: stretch;
    }

    .club-meta {
        width: 100%;
    }

    .club-fields {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 960px) {
    .config-content {
        padding: 20px 16px 16px;
    }

    .club-fields {
        grid-template-columns: minmax(0, 1fr);
    }

    .club-field--sort {
        max-width: none;
    }

    .section-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .page-footer {
        justify-content: stretch;

        .footer-btn {
            flex: 1;
        }
    }
}
</style>
