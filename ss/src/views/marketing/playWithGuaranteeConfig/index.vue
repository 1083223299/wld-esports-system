<template>
    <div class="guarantee-page">
        <template v-if="currentView === 'list'">
            <div class="search-module">
                <SearchForm
                    ref="searchForm"
                    :fields="searchItems"
                    :initial-values="queryForm"
                    :gutter="20"
                    label-width="88px"
                    :confirm-reset="false"
                    @search="handleSearch"
                    @reset="handleReset"
                />
            </div>

            <el-card class="list-card" shadow="never">
                <div class="table-wrapper">
                    <el-table
                        ref="tableRef"
                        :data="tableData"
                        stripe
                        v-loading="loading"
                        :row-key="getRowKey"
                        :header-row-style="{ backgroundColor: '#F6F6FB' }"
                        :cell-style="{ textAlign: 'center' }"
                        :header-cell-style="{ textAlign: 'center' }"
                    >
                        <el-table-column prop="productId" label="游戏ID" min-width="150" show-overflow-tooltip>
                            <template slot-scope="{ row }">
                                {{ row.productId || "-" }}
                            </template>
                        </el-table-column>

                        <el-table-column prop="productName" label="游戏名称" min-width="180" show-overflow-tooltip>
                            <template slot-scope="{ row }">
                                {{ row.productName || "-" }}
                            </template>
                        </el-table-column>

                        <el-table-column prop="itemCount" label="保障条目数量" min-width="140">
                            <template slot-scope="{ row }">
                                {{ row.itemCount }}
                            </template>
                        </el-table-column>

                        <el-table-column label="配置类型" min-width="150">
                            <template slot-scope="{ row }">
                                <span :class="['config-type-text', getConfigTypeClass(row.configType)]">
                                    {{ row.configTypeName || getConfigTypeName(row.configType) }}
                                </span>
                            </template>
                        </el-table-column>

                        <el-table-column label="操作" width="120" fixed="right" align="center">
                            <template slot-scope="{ row }">
                                <el-button type="text" class="config-btn" @click="handleConfig(row)">
                                    配置
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div class="pagination-wrapper">
                    <PaginationSimple
                        :current-page="pagination.pageNum"
                        :page-size="pagination.pageSize"
                        :total="pagination.total"
                        :show-batch-actions="false"
                        @current-change="handleCurrentChange"
                    />
                </div>
            </el-card>
        </template>

        <el-card v-else class="config-card" shadow="never" v-loading="detailLoading">
            <div slot="header" class="config-header">
                <div class="page-back" @click="handleBackToList">
                    <i class="el-icon-arrow-left"></i>
                    <span>陪玩保障配置</span>
                </div>
            </div>

            <div class="config-content">
                <el-form ref="configForm" :model="configForm" label-width="96px" class="config-form">
                    <el-form-item label="关联游戏：" required>
                        <el-select v-model="configForm.productId" disabled class="game-select">
                            <el-option
                                :label="configForm.productName || configForm.productId || '-'"
                                :value="configForm.productId"
                            />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="保障条目：">
                        <div class="items-area">
                            <div
                                v-for="(item, index) in configForm.items"
                                :key="item.localKey"
                                class="guarantee-item"
                            >
                                <button
                                    type="button"
                                    class="delete-item-btn"
                                    title="删除"
                                    @click="handleRemoveItem(index)"
                                >
                                    <i class="el-icon-delete"></i>
                                </button>

                                <div class="item-grid">
                                    <div class="field-inline">
                                        <span class="field-label">标题：</span>
                                        <el-input
                                            v-model="item.title"
                                            maxlength="10"
                                            placeholder="请输入"
                                            class="short-input"
                                        />
                                    </div>

                                    <div class="field-inline">
                                        <span class="field-label">文案：</span>
                                        <el-input
                                            v-model="item.content"
                                            maxlength="20"
                                            placeholder="请输入"
                                            class="long-input"
                                        />
                                    </div>

                                    <div class="field-inline">
                                        <span class="field-label">状态：</span>
                                        <el-radio-group v-model="item.status">
                                            <el-radio label="1">开启</el-radio>
                                            <el-radio label="0">关闭</el-radio>
                                        </el-radio-group>
                                    </div>

                                    <div class="field-inline">
                                        <span class="field-label">图标</span>
                                        <el-upload
                                            action="#"
                                            :show-file-list="false"
                                            :before-upload="beforeIconUpload"
                                            :http-request="(option) => handleIconUpload(option, item)"
                                            class="icon-uploader"
                                        >
                                            <div class="icon-upload-box">
                                                <img v-if="item.iconUrl" :src="item.iconUrl" class="icon-preview" />
                                                <i v-else class="el-icon-upload2"></i>
                                            </div>
                                        </el-upload>
                                    </div>
                                </div>
                            </div>

                            <el-button
                                v-if="configForm.items.length < 3"
                                type="primary"
                                plain
                                icon="el-icon-plus"
                                class="add-item-btn"
                                @click="handleAddItem"
                            >
                                添加保障条目
                            </el-button>
                        </div>
                    </el-form-item>
                </el-form>
            </div>

            <div class="config-footer">
                <el-button class="footer-btn" @click="handleBackToList">取消</el-button>
                <el-button
                    type="primary"
                    class="footer-btn save-btn"
                    :loading="saveLoading"
                    @click="handleSaveConfig"
                >
                    保存配置
                </el-button>
            </div>
        </el-card>
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { productSelect } from "@/api/goodsList";
import { fileUpload } from "@/api/user";
import {
    getPlayGuaranteeDetail,
    listPlayGuaranteeConfig,
    savePlayGuaranteeConfig,
} from "@/api/marketing";

const CONFIG_TYPE_MAP = {
    "0": "全局默认",
    "1": "自定义专属",
    "2": "【未配置】",
};

export default {
    name: "PlayWithGuaranteeConfig",
    components: {
        SearchForm,
        PaginationSimple,
    },
    data() {
        return {
            currentView: "list",
            currentRow: null,
            queryForm: {
                productId: "",
                configType: "",
            },
            searchItems: [
                {
                    type: "select",
                    prop: "productId",
                    label: "游戏名称",
                    placeholder: "请选择",
                    filterable: true,
                    clearable: true,
                    options: [
                        { label: "全部", value: "" },
                        { label: "默认配置", value: "0" },
                    ],
                },
                {
                    type: "select",
                    prop: "configType",
                    label: "配置类型",
                    placeholder: "请选择",
                    clearable: true,
                    options: [
                        { label: "全部", value: "" },
                        { label: "全局默认", value: "0" },
                        { label: "自定义专属", value: "1" },
                        { label: "未配置", value: "2" },
                    ],
                },
            ],
            tableData: [],
            loading: false,
            detailLoading: false,
            saveLoading: false,
            pagination: {
                pageNum: 1,
                pageSize: 10,
                total: 0,
            },
            configForm: {
                productId: "",
                productName: "",
                configType: "",
                items: [],
            },
        };
    },
    mounted() {
        this.fetchProductOptions();
        this.fetchTableData();
    },
    methods: {
        createEmptyItem(index = 0) {
            return {
                id: "",
                title: "",
                content: "",
                status: "1",
                iconOssId: "",
                iconUrl: "",
                sortOrder: index + 1,
                localKey: `new-${Date.now()}-${Math.random()}`,
            };
        },
        normalizeId(value) {
            if (value === null || value === undefined || value === "") {
                return "";
            }
            return String(value).trim();
        },
        buildRequestId(value) {
            if (value === "" || value === null || value === undefined) {
                return undefined;
            }
            const numericValue = Number(value);
            return Number.isSafeInteger(numericValue) ? numericValue : value;
        },
        getConfigTypeName(configType) {
            return CONFIG_TYPE_MAP[String(configType)] || "-";
        },
        getConfigTypeClass(configType) {
            const type = String(configType);
            if (type === "0") {
                return "is-default";
            }
            if (type === "1") {
                return "is-custom";
            }
            if (type === "2") {
                return "is-empty";
            }
            return "";
        },
        normalizeRow(row = {}) {
            return {
                ...row,
                productId: this.normalizeId(row.productId),
                productName: row.productName || "-",
                itemCount: Number(row.itemCount || 0),
                configType: this.normalizeId(row.configType),
                configTypeName: row.configTypeName || this.getConfigTypeName(row.configType),
            };
        },
        normalizeDetail(detail = {}) {
            const items = Array.isArray(detail.items)
                ? detail.items.map((item, index) => ({
                    id: this.normalizeId(item.id),
                    title: item.title || "",
                    content: item.content || "",
                    status: String(item.status) === "0" ? "0" : "1",
                    iconOssId: this.normalizeId(item.iconOssId),
                    iconUrl: item.iconUrl || "",
                    sortOrder: Number(item.sortOrder || index + 1),
                    localKey: `${item.id || "item"}-${index}-${Date.now()}`,
                }))
                : [];

            return {
                productId: this.normalizeId(detail.productId),
                productName: detail.productName || "",
                configType: this.normalizeId(detail.configType),
                items: items.length ? items.slice(0, 3) : [this.createEmptyItem(0)],
            };
        },
        getResponseData(res) {
            if (res && res.success === true) {
                return res.data || {};
            }
            if (res && String(res.code) === "200") {
                return res.data || {};
            }
            return res || {};
        },
        isRequestSuccess(res) {
            return res === true || res?.success === true || String(res?.code) === "200" || String(res?.errorCode) === "0";
        },
        getRowKey(row) {
            return `${row.productId || "default"}-${row.configType || "unknown"}`;
        },
        syncQueryForm(formData = {}) {
            this.queryForm = {
                productId: formData.productId === undefined || formData.productId === null ? "" : String(formData.productId),
                configType: formData.configType || "",
            };
        },
        buildQueryParams() {
            const params = {
                pageNum: this.pagination.pageNum,
                pageSize: this.pagination.pageSize,
                productId: this.buildRequestId(this.queryForm.productId),
                configType: this.queryForm.configType || undefined,
            };

            Object.keys(params).forEach((key) => {
                if (params[key] === undefined || params[key] === "") {
                    delete params[key];
                }
            });

            return params;
        },
        async fetchProductOptions() {
            try {
                const res = await productSelect({ pageNum: 1, pageSize: 999 });
                const list = Array.isArray(res.data) ? res.data : [];
                const productOptions = list.map((item) => {
                    const productId = this.normalizeId(item.productId || item.id);
                    return {
                        label: item.productName || item.name || productId,
                        value: productId,
                    };
                }).filter((item) => item.value);
                const productItem = this.searchItems.find((item) => item.prop === "productId");
                if (productItem) {
                    productItem.options = [
                        { label: "全部", value: "" },
                        { label: "默认配置", value: "0" },
                        ...productOptions,
                    ];
                }
            } catch (error) {
                console.error("获取游戏下拉失败:", error);
            }
        },
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await listPlayGuaranteeConfig(this.buildQueryParams());
                const data = this.getResponseData(res);
                this.tableData = Array.isArray(data.rows)
                    ? data.rows.map((row) => this.normalizeRow(row))
                    : [];
                this.pagination.total = Number(data.total || 0);
            } catch (error) {
                console.error("获取陪玩保障配置列表失败:", error);
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error("获取列表数据失败，请稍后重试");
            } finally {
                this.loading = false;
                this.$nextTick(() => {
                    if (this.$refs.tableRef) {
                        this.$refs.tableRef.doLayout();
                    }
                });
            }
        },
        handleSearch(formData) {
            this.syncQueryForm(formData);
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleReset() {
            // 显式重置 productId，避免 SearchForm 异步选项导致的残留
            this.queryForm = {
                productId: "",
                configType: "",
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleCurrentChange(page) {
            this.pagination.pageNum = page;
            this.fetchTableData();
        },
        async handleConfig(row) {
            this.currentRow = { ...row };
            this.currentView = "config";
            await this.fetchConfigDetail(row);
        },
        async fetchConfigDetail(row) {
            this.detailLoading = true;
            try {
                const productId = this.buildRequestId(row.productId || "0");
                const res = await getPlayGuaranteeDetail({ productId });
                const detail = this.getResponseData(res);
                this.configForm = this.normalizeDetail({
                    ...detail,
                    productId: detail.productId !== undefined ? detail.productId : row.productId,
                    productName: detail.productName || row.productName,
                    configType: detail.configType || row.configType,
                });
            } catch (error) {
                console.error("获取陪玩保障配置详情失败:", error);
                this.$message.error("获取详情失败，请稍后重试");
                this.currentView = "list";
            } finally {
                this.detailLoading = false;
            }
        },
        handleAddItem() {
            if (this.configForm.items.length >= 3) {
                this.$message.warning("最多配置3条保障条目");
                return;
            }
            this.configForm.items.push(this.createEmptyItem(this.configForm.items.length));
        },
        handleRemoveItem(index) {
            this.configForm.items.splice(index, 1);
            this.configForm.items.forEach((item, itemIndex) => {
                item.sortOrder = itemIndex + 1;
            });
        },
        beforeIconUpload(file) {
            const isImage = file.type.startsWith("image/");
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isImage) {
                this.$message.error("只能上传图片文件");
                return false;
            }
            if (!isLt2M) {
                this.$message.error("图片大小不能超过2MB");
                return false;
            }
            return true;
        },
        async handleIconUpload({ file, onSuccess }, item) {
            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fileUpload(formData);
                if (String(res.code) !== "200" || !res.data?.ossId) {
                    throw new Error(res.errorMessage || res.msg || "上传失败");
                }
                item.iconOssId = this.normalizeId(res.data.ossId);
                item.iconUrl = res.data.url || res.data.fileUrl || URL.createObjectURL(file);
                onSuccess("success");
                this.$message.success("图标上传成功");
            } catch (error) {
                console.error("上传保障图标失败:", error);
                this.$message.error(error.message || "上传失败，请稍后重试");
            }
        },
        validateConfig() {
            if (!this.configForm.productId) {
                this.$message.warning("缺少关联游戏");
                return false;
            }
            if (this.configForm.items.length > 3) {
                this.$message.warning("最多配置3条保障条目");
                return false;
            }

            for (let index = 0; index < this.configForm.items.length; index += 1) {
                const item = this.configForm.items[index];
                const label = `第${index + 1}条保障`;
                if (!item.title || !item.title.trim()) {
                    this.$message.warning(`请输入${label}标题`);
                    return false;
                }
                if (item.title.trim().length > 10) {
                    this.$message.warning(`${label}标题最多10个字`);
                    return false;
                }
                if (!item.content || !item.content.trim()) {
                    this.$message.warning(`请输入${label}文案`);
                    return false;
                }
                if (item.content.trim().length > 20) {
                    this.$message.warning(`${label}文案最多20个字`);
                    return false;
                }
                if (!item.iconOssId) {
                    this.$message.warning(`请上传${label}图标`);
                    return false;
                }
            }
            return true;
        },
        buildSavePayload() {
            return {
                productId: this.buildRequestId(this.configForm.productId),
                items: this.configForm.items.map((item) => ({
                    title: item.title.trim(),
                    content: item.content.trim(),
                    status: item.status,
                    iconOssId: this.buildRequestId(item.iconOssId),
                })),
            };
        },
        async handleSaveConfig() {
            if (!this.validateConfig()) {
                return;
            }
            this.saveLoading = true;
            try {
                const res = await savePlayGuaranteeConfig(this.buildSavePayload());
                if (!this.isRequestSuccess(res)) {
                    this.$message.error(res?.errorMessage || res?.msg || "保存失败");
                    return;
                }
                this.$message.success("保存成功");
                this.currentView = "list";
                this.fetchTableData();
            } catch (error) {
                console.error("保存陪玩保障配置失败:", error);
                this.$message.error("保存失败，请稍后重试");
            } finally {
                this.saveLoading = false;
            }
        },
        handleBackToList() {
            this.currentView = "list";
        },
    },
};
</script>

<style scoped lang="scss">
.guarantee-page {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.search-module {
    flex-shrink: 0;
}

.list-card,
.config-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    border-radius: 24px;
}

.list-card {
    ::v-deep .el-card__body {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 20px 20px 0;
    }
}

.table-wrapper {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.pagination-wrapper {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #ebeef5;
}

.config-type-text {
    font-size: 14px;
    font-weight: 500;

    &.is-default {
        color: #6a35ff;
    }

    &.is-custom {
        color: #1bc286;
    }

    &.is-empty {
        color: #1d2129;
    }
}

.config-btn {
    color: #409eff;
    padding: 0;
}

.config-card {
    ::v-deep .el-card__header {
        padding: 18px 24px;
        border-bottom: 1px solid #ebeef5;
    }

    ::v-deep .el-card__body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        padding: 0;
    }
}

.config-header {
    display: flex;
    align-items: center;
}

.page-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #1d2129;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}

.config-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 32px 28px;
    box-sizing: border-box;
}

.config-form {
    max-width: 820px;
}

.game-select {
    width: 300px;
}

.items-area {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.guarantee-item {
    position: relative;
    width: 980px;
    max-width: 100%;
    padding: 16px 40px 14px 16px;
    border-radius: 8px;
    background: #f2f3f5;
    box-sizing: border-box;
}

.delete-item-btn {
    position: absolute;
    top: 24px;
    right: 12px;
    padding: 0;
    border: none;
    background: transparent;
    color: #1d2129;
    font-size: 18px;
    cursor: pointer;

    &:hover {
        color: #f56c6c;
    }
}

.item-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: 12px 24px;
    align-items: center;
}

.field-inline {
    min-width: 0;
    display: flex;
    align-items: center;
}

.field-label {
    flex-shrink: 0;
    margin-right: 6px;
    color: #1d2129;
    font-size: 14px;
}

.short-input {
    width: 176px;
}

.long-input {
    width: 320px;
}

.icon-uploader {
    display: inline-flex;
}

.icon-upload-box {
    width: 30px;
    height: 30px;
    border: 1px solid #909399;
    border-radius: 4px;
    background: #fff;
    color: #1d2129;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.icon-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.add-item-btn {
    width: 140px;
    border-color: #6a35ff;
    color: #6a35ff;
}

.config-footer {
    flex-shrink: 0;
    padding: 20px 28px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
    gap: 14px;
}

.footer-btn {
    min-width: 92px;
    border-radius: 8px;
}

.save-btn {
    background: #6a35ff;
    border-color: #6a35ff;

    &:hover,
    &:focus {
        background: #5b2ce3;
        border-color: #5b2ce3;
    }
}

@media (max-width: 960px) {
    .item-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .short-input,
    .long-input,
    .game-select {
        width: 100%;
    }
}
</style>
