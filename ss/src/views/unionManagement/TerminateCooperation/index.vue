<template>
    <div class="terminate-cooperation-page">
        <div ref="responsiveModule">
            <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
                @search="handleSearch" @reset="handleReset">
            </SearchForm>
        </div>

        <el-card class="list-card" shadow="never">
            <div class="table-wrapper">
                <el-table :data="tableData" stripe v-loading="loading" :border="false" height="100%"
                    :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
                    :header-cell-style="{ textAlign: 'center' }">
                    <el-table-column prop="tradeId" label="公会ID" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="tradeName" label="公会名称" min-width="140" show-overflow-tooltip />

                    <el-table-column label="负责人名称" width="120">
                        <template slot-scope="{ row }">
                            {{ getManagerName(row) }}
                        </template>
                    </el-table-column>

                    <el-table-column label="负责人手机号" width="150">
                        <template slot-scope="{ row }">
                            <PhoneDisplay v-if="getManagerPhone(row) !== '-'" :value="getManagerPhone(row)" />
                            <span v-else>-</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="凭证图片" width="120">
                        <template slot-scope="{ row }">
                            <el-button v-if="normalizeVoucherImages(row.voucherImages).length" type="text"
                                class="voucher-link" @click="openVoucherPreview(row.voucherImages)">
                                查看
                            </el-button>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>

                    <el-table-column prop="createTime" label="提交时间" width="180">
                        <template slot-scope="{ row }">
                            {{ row.createTime || "-" }}
                        </template>
                    </el-table-column>

                    <el-table-column label="状态" width="120">
                        <template slot-scope="{ row }">
                            <span class="status-pill" :class="getStatusClass(row.status)">
                                {{ getStatusText(row.status) }}
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column prop="rejectReason" label="驳回原因" min-width="180" show-overflow-tooltip>
                        <template slot-scope="{ row }">
                            <span v-if="String(row.status) === '2' && row.rejectReason">{{ row.rejectReason }}</span>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="150" fixed="right" align="center">
                        <template slot-scope="{ row }">
                            <div v-if="String(row.status) === '0'" class="action-buttons">
                                <el-button type="text" class="action-link action-link--approve"
                                    @click="handleApprove(row)">
                                    通过
                                </el-button>
                                <el-button type="text" class="action-link action-link--reject"
                                    @click="openRejectDialog(row)">
                                    驳回
                                </el-button>
                            </div>
                            <span v-else>-</span>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <div class="pagination-fixed">
                <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize"
                    :total="pagination.total" @current-change="handleCurrentChange">
                </PaginationSimple>
            </div>
        </el-card>

        <el-dialog title="驳回原因" :visible.sync="rejectDialogVisible" width="480px" :close-on-click-modal="false"
            @close="handleRejectDialogClose">
            <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-position="top"
                :validate-on-rule-change="false">
                <el-form-item label="请输入驳回原因" prop="rejectReason">
                    <el-input v-model.trim="rejectForm.rejectReason" type="textarea" :rows="4" show-word-limit
                        maxlength="50" placeholder="请输入驳回原因" />
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="rejectDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="rejectSubmitting" @click="submitReject">提交</el-button>
            </div>
        </el-dialog>

        <el-dialog title="凭证图片" :visible.sync="voucherGalleryVisible" width="720px" :close-on-click-modal="false">
            <div class="voucher-gallery">
                <div class="voucher-gallery__head">
                    <div class="voucher-gallery__title">共 {{ voucherPreviewImages.length }} 张凭证图片</div>
                    <div class="voucher-gallery__sub">点击下方任意图片可进入大图预览</div>
                </div>
                <div v-if="voucherPreviewImages.length" class="voucher-gallery__grid">
                    <div v-for="(img, index) in voucherPreviewImages" :key="`${img}-${index}`" class="voucher-gallery__item"
                        @click="openVoucherZoom(index)">
                        <img :src="img" alt="凭证图片" />
                        <div class="voucher-gallery__mask">
                            <i class="el-icon-zoom-in"></i>
                            <span>预览</span>
                        </div>
                    </div>
                </div>
                <div v-else class="voucher-gallery__empty">暂无可预览图片</div>
            </div>
            <div slot="footer">
                <el-button @click="voucherGalleryVisible = false">关闭</el-button>
            </div>
        </el-dialog>

        <ImgZoom v-model="voucherPreviewVisible" :img-list="voucherPreviewImages" :init-index="voucherPreviewIndex" />
    </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import {
    PostClubExitList,
    PostClubExitAuditApprove,
    PostClubExitAuditReject
} from "@/api/table";

const EMPTY_REJECT_FORM = {
    id: "",
    rejectReason: ""
};

export default {
    name: "TerminateCooperation",
    components: {
        SearchForm,
        PaginationSimple,
        PhoneDisplay,
        ImgZoom
    },
    data() {
        return {
            searchItems: [
                {
                    type: "input",
                    prop: "tradeId",
                    label: "公会ID",
                    placeholder: "请输入公会ID",
                    clearable: true
                },
                {
                    type: "input",
                    prop: "tradeName",
                    label: "公会名称",
                    placeholder: "请输入公会名称",
                    clearable: true
                },
                {
                    type: "select",
                    prop: "status",
                    label: "状态",
                    placeholder: "请选择状态",
                    clearable: true,
                    options: [
                        { label: "全部", value: "" },
                        { label: "待审核", value: "0" },
                        { label: "通过", value: "1" },
                        { label: "驳回", value: "2" }
                    ]
                },
                {
                    type: "daterange",
                    prop: "submitTime",
                    label: "提交时间",
                    valueFormat: "yyyy-MM-dd HH:mm:ss",
                    startPlaceholder: "开始时间",
                    endPlaceholder: "结束时间",
                    clearable: true
                }
            ],
            filterForm: {
                tradeId: "",
                tradeName: "",
                status: "",
                submitTime: []
            },
            tableData: [],
            loading: false,
            pagination: {
                pageNum: 1,
                pageSize: 10,
                total: 0
            },
            rejectDialogVisible: false,
            rejectSubmitting: false,
            rejectForm: { ...EMPTY_REJECT_FORM },
            voucherGalleryVisible: false,
            voucherPreviewVisible: false,
            voucherPreviewImages: [],
            voucherPreviewIndex: 0
        };
    },
    computed: {
        rejectRules() {
            return {
                rejectReason: [
                    { required: true, message: "请输入驳回原因", trigger: "blur" },
                    { max: 50, message: "驳回原因最多50字", trigger: "blur" }
                ]
            };
        }
    },
    mounted() {
        this.applyRouteQuery();
        this.fetchTableData();
    },
    activated() {
        if (this.applyRouteQuery()) {
            this.pagination.pageNum = 1;
            this.fetchTableData();
        }
    },
    watch: {
        "$route.query": {
            deep: true,
            handler() {
                if (this.applyRouteQuery()) {
                    this.pagination.pageNum = 1;
                    this.fetchTableData();
                }
            }
        }
    },
    methods: {
        applyRouteQuery() {
            const q = (this.$route && this.$route.query) || {};
            let changed = false;
            const nextForm = { ...this.filterForm };
            if (q.tradeId !== undefined && q.tradeId !== null && q.tradeId !== "") {
                if (String(nextForm.tradeId || "") !== String(q.tradeId)) {
                    nextForm.tradeId = String(q.tradeId);
                    changed = true;
                }
            }
            if (q.status !== undefined && q.status !== null && q.status !== "") {
                if (String(nextForm.status) !== String(q.status)) {
                    nextForm.status = String(q.status);
                    changed = true;
                }
            }
            if (changed) {
                this.filterForm = nextForm;
                this.$nextTick(() => {
                    if (this.$refs.searchForm && this.$refs.searchForm.setFormData) {
                        this.$refs.searchForm.setFormData({ ...this.filterForm });
                    }
                });
            }
            return changed;
        },
        getStatusText(status) {
            return {
                "0": "待审核",
                "1": "通过",
                "2": "驳回"
            }[String(status)] || "-";
        },
        getStatusClass(status) {
            return {
                "0": "is-pending",
                "1": "is-pass",
                "2": "is-reject"
            }[String(status)] || "";
        },
        getManagerName(row) {
            return row.tradeNamePerson || row.managerName || row.chargeName || row.principalName || "-";
        },
        getManagerPhone(row) {
            return row.phone || row.tradeNamePersonPhone || row.managerPhone || row.chargePhone || row.principalPhone || "-";
        },
        normalizeVoucherImages(images) {
            if (Array.isArray(images)) {
                return images.filter(Boolean).map(item => String(item).trim());
            }
            if (typeof images === "string" && images.trim()) {
                return images
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
            return [];
        },
        buildQueryParams() {
            const params = {
                pageNum: this.pagination.pageNum,
                pageSize: this.pagination.pageSize
            };
            if (this.filterForm.tradeId) {
                const idNum = Number(this.filterForm.tradeId);
                params.tradeId = Number.isFinite(idNum) ? idNum : this.filterForm.tradeId;
            }
            if (this.filterForm.tradeName) {
                params.tradeName = this.filterForm.tradeName;
            }
            if (this.filterForm.status !== "") {
                params.status = this.filterForm.status;
            }
            if (Array.isArray(this.filterForm.submitTime) && this.filterForm.submitTime.length === 2) {
                params.startTime = this.filterForm.submitTime[0];
                params.endTime = this.filterForm.submitTime[1];
            }
            return params;
        },
        normalizeRows(data) {
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.rows)) return data.rows;
            if (Array.isArray(data?.list)) return data.list;
            if (Array.isArray(data?.data?.rows)) return data.data.rows;
            return [];
        },
        normalizeTotal(data, rows) {
            if (typeof data?.total === "number") return data.total;
            if (typeof data?.data?.total === "number") return data.data.total;
            return rows.length;
        },
        async fetchTableData() {
            this.loading = true;
            try {
                const res = await PostClubExitList(this.buildQueryParams());
                if (res.success || res.code === 200) {
                    const sourceData = res.data?.rows ? res.data : (res.data?.data || res.data || {});
                    const rows = this.normalizeRows(sourceData);
                    this.tableData = rows.map(item => ({
                        ...item,
                        voucherImages: this.normalizeVoucherImages(item.voucherImages)
                    }));
                    this.pagination.total = this.normalizeTotal(sourceData, rows);
                } else {
                    this.$message.error(res.errorMessage || res.message || "获取列表失败");
                }
            } catch (error) {
                this.$message.error("获取列表失败，请稍后重试");
            } finally {
                this.loading = false;
            }
        },
        handleSearch(formValues) {
            this.filterForm = {
                ...this.filterForm,
                ...formValues,
                submitTime: Array.isArray(formValues.submitTime) ? formValues.submitTime : []
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleReset() {
            this.filterForm = {
                tradeId: "",
                tradeName: "",
                status: "",
                submitTime: []
            };
            this.pagination.pageNum = 1;
            this.fetchTableData();
        },
        handleCurrentChange(page) {
            this.pagination.pageNum = page;
            this.fetchTableData();
        },
        openVoucherPreview(images, index = 0) {
            const list = this.normalizeVoucherImages(images);
            if (!list.length) return;
            this.voucherPreviewImages = list;
            this.voucherPreviewIndex = index;
            this.voucherGalleryVisible = true;
        },
        openVoucherZoom(index) {
            this.voucherPreviewIndex = index;
            this.voucherPreviewVisible = true;
        },
        handleApprove(row) {
            this.$confirm(`确定通过公会「${row.tradeName || "-"}」的终止合作申请吗？`, "审核通过", {
                confirmButtonText: "确定",
                cancelButtonText: "取消",
                type: "warning"
            }).then(async () => {
                const res = await PostClubExitAuditApprove({
                    id: row.id
                });
                if (res.success || res.code === 200) {
                    this.$message.success("审核通过成功");
                    this.fetchTableData();
                } else {
                    this.$message.error(res.errorMessage || res.message || "审核通过失败");
                }
            }).catch(() => { });
        },
        openRejectDialog(row) {
            this.rejectForm = {
                id: row.id,
                rejectReason: ""
            };
            this.rejectDialogVisible = true;
            this.$nextTick(() => {
                if (this.$refs.rejectFormRef) {
                    this.$refs.rejectFormRef.clearValidate();
                }
            });
        },
        handleRejectDialogClose() {
            this.rejectSubmitting = false;
            this.rejectForm = { ...EMPTY_REJECT_FORM };
            if (this.$refs.rejectFormRef) {
                this.$refs.rejectFormRef.resetFields();
            }
        },
        submitReject() {
            this.$refs.rejectFormRef.validate(async valid => {
                if (!valid) return;
                this.rejectSubmitting = true;
                try {
                    const res = await PostClubExitAuditReject({
                        id: this.rejectForm.id,
                        rejectReason: this.rejectForm.rejectReason
                    });
                    if (res.success || res.code === 200) {
                        this.$message.success("审核驳回成功");
                        this.rejectDialogVisible = false;
                        this.fetchTableData();
                    } else {
                        this.$message.error(res.errorMessage || res.message || "审核驳回失败");
                    }
                } catch (error) {
                    this.$message.error("审核驳回失败，请稍后重试");
                } finally {
                    this.rejectSubmitting = false;
                }
            });
        }
    }
};
</script>

<style scoped>
.terminate-cooperation-page {
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.list-card {
    margin-top: 16px;
    flex: 1;
    min-height: 0;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.table-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.pagination-fixed {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
}

.info-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.info-block--left {
    text-align: left;
}

.info-title {
    color: #303133;
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
}

.info-sub {
    color: #909399;
    font-size: 12px;
    line-height: 18px;
}

.voucher-link {
    color: #409EFF;
    font-weight: 600;
}

.voucher-gallery {
    padding: 4px 2px;
}

.voucher-gallery__head {
    margin-bottom: 18px;
    padding: 16px 18px;
    border-radius: 16px;
    background: linear-gradient(180deg, #f8f9ff 0%, #f2f5ff 100%);
}

.voucher-gallery__title {
    color: #303133;
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
}

.voucher-gallery__sub {
    margin-top: 6px;
    color: #8c93a8;
    font-size: 12px;
    line-height: 18px;
}

.voucher-gallery__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 16px;
    max-height: 420px;
    overflow-y: auto;
    padding-right: 4px;
}

.voucher-gallery__item {
    position: relative;
    height: 132px;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    background: #f5f7fa;
    box-shadow: 0 10px 22px rgba(67, 79, 128, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.voucher-gallery__item:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 28px rgba(67, 79, 128, 0.14);
}

.voucher-gallery__item img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
}

.voucher-gallery__mask {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(26, 34, 62, 0.42);
    color: #fff;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.voucher-gallery__item:hover .voucher-gallery__mask {
    opacity: 1;
}

.voucher-gallery__mask i {
    font-size: 20px;
}

.voucher-gallery__mask span {
    font-size: 12px;
    font-weight: 600;
}

.voucher-gallery__empty {
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    font-size: 14px;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 76px;
    height: 30px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
}

.status-pill.is-pending {
    color: #d48806;
    background: rgba(250, 173, 20, 0.16);
}

.status-pill.is-pass {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.14);
}

.status-pill.is-reject {
    color: #f5222d;
    background: rgba(245, 34, 45, 0.12);
}

.action-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
}

.action-link {
    font-weight: 600;
}

.action-link--approve {
    color: #409EFF;
}

.action-link--reject {
    color: #F56C6C;
}

.full-width {
    width: 100%;
}

::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

::v-deep .el-dialog__body {
    padding-top: 12px;
}
</style>
