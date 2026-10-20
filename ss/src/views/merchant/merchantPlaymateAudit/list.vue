<template>
  <div class="merchant-playmate-audit">
    <SearchForm
      ref="searchForm"
      :fields="searchItems"
      :initial-values="filterForm"
      :gutter="20"
      label-width="100px"
      :confirm-reset="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          v-loading="loading"
          height="100%"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="userId" label="陪陪ID" width="120" />
          <el-table-column prop="nickName" label="陪陪名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.nickName || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="手机号" width="150">
            <template slot-scope="{ row }">
              <PhoneDisplay :value="row.phone" />
            </template>
          </el-table-column>
          <el-table-column label="头像" width="80">
            <template slot-scope="{ row }">
              <div class="avatar-cell" @click="previewAvatar(row)">
                <img
                  v-if="row.avatar"
                  :src="row.avatar"
                  class="avatar-thumb"
                  @error="handleImgError"
                />
                <span v-else class="avatar-fallback">{{ getAvatarText(row.nickName) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="游戏名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.productName || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="申请类型" width="100">
            <template slot-scope="{ row }">
              {{ getApplyTypeText(row.applyType) }}
            </template>
          </el-table-column>
          <el-table-column label="认证信息" width="100">
            <template slot-scope="{ row }">
              <el-button type="text" class="link-btn" @click="showAuthDetail(row)">
                查看认证
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="提交时间" width="170" />
          <el-table-column label="公会审核结果" width="120">
            <template slot-scope="{ row }">
              <span :class="['status-text', getGuildStatusClass(row)]">
                {{ getGuildStatusText(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="平台复审结果" width="120">
            <template slot-scope="{ row }">
              <span :class="['status-text', getPlatformStatusClass(row)]">
                {{ getPlatformStatusText(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="驳回原因" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="isRejectedRow(row)" class="reject-reason">
                {{ getRejectReason(row) || "-" }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="陪陪类型" width="130">
            <template slot-scope="{ row }">
              <span :class="['companion-type-tag', getCompanionTypeClass(row)]">
                {{ getCompanionTypeText(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ getRemarkText(row) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template slot-scope="{ row }">
              <template v-if="canOperateRow(row)">
                <el-button type="text" class="approve-btn" @click="handleApprove(row)">
                  通过
                </el-button>
                <el-button type="text" class="reject-btn" @click="handleReject(row)">
                  驳回
                </el-button>
              </template>
              <span v-else class="empty-action">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      title="驳回"
      :visible.sync="rejectDialogVisible"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetRejectForm"
    >
      <el-form ref="rejectForm" :model="rejectForm" :rules="rejectRules" label-width="80px">
        <el-form-item label="原因" prop="rejectReason">
          <el-input
            v-model="rejectForm.rejectReason"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="rejectLoading" @click="submitReject">提交</el-button>
      </div>
    </el-dialog>

    <UserSkillAuthDrawer :visible.sync="authDrawerVisible" :source-row="authSourceRow" />

    <el-dialog :visible.sync="avatarDialogVisible" width="360px" append-to-body>
      <img v-if="previewAvatarUrl" :src="previewAvatarUrl" class="avatar-preview" />
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import UserSkillAuthDrawer from "@/components/UserSkillAuthDrawer/index.vue";
import { productSelect } from "@/api/goodsList";
import { assignSearchId } from "@/utils/index";
import {
  listTradeUnionCompanionAudit,
  approveTradeUnionCompanionAudit,
  rejectTradeUnionCompanionAudit,
} from "@/api/userSkillAudit";

const ALL_OPTION = { label: "全部", value: "" };

const COMPANION_TYPE_MAP = {
  1: { label: "个人陪陪", className: "is-personal" },
  2: { label: "公会陪陪", className: "is-guild" },
  3: { label: "商户公会陪陪", className: "is-merchant-guild" },
};

export default {
  name: "MerchantPlaymateAuditList",
  components: {
    SearchForm,
    PaginationSimple,
    PhoneDisplay,
    UserSkillAuthDrawer,
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "userId",
          label: "陪陪ID",
          inputType: "integer",
          placeholder: "请输入陪陪ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "nickName",
          label: "陪陪名称",
          placeholder: "请输入陪陪名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "phone",
          label: "手机号",
          placeholder: "请输入手机号",
          clearable: true,
        },
        {
          type: "select",
          prop: "merchantAuditStatus",
          label: "公会审核状态",
          placeholder: "全部",
          options: [
            ALL_OPTION,
            { label: "待审核", value: "0" },
            { label: "公会通过", value: "1" },
            { label: "公会驳回", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "platformAuditStatus",
          label: "平台审核状态",
          placeholder: "全部",
          options: [
            ALL_OPTION,
            { label: "待审核", value: "0" },
            { label: "实战考核", value: "1" },
            { label: "平台驳回", value: "2" },
            { label: "平台通过", value: "3" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "productId",
          label: "游戏名称",
          placeholder: "全部",
          filterable: true,
          options: [ALL_OPTION],
          clearable: true,
        },
        {
          type: "select",
          prop: "applyType",
          label: "申请类型",
          placeholder: "全部",
          options: [
            ALL_OPTION,
            { label: "娱乐陪", value: "1" },
            { label: "技术陪", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "type",
          label: "陪陪类型",
          placeholder: "全部",
          options: [
            ALL_OPTION,
            { label: "个人陪陪", value: "1" },
            { label: "公会陪陪", value: "2" },
            { label: "商户公会陪陪", value: "3" },
          ],
          clearable: true,
        },
      ],
      filterForm: {
        userId: "",
        nickName: "",
        phone: "",
        merchantAuditStatus: "",
        platformAuditStatus: "",
        productId: "",
        applyType: "",
        type: "",
        applyId: "",
      },
      tableData: [],
      loading: false,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      rejectDialogVisible: false,
      rejectLoading: false,
      currentRow: null,
      rejectForm: {
        rejectReason: "",
      },
      rejectRules: {
        rejectReason: [
          { required: true, message: "请输入驳回原因", trigger: "blur" },
          { max: 500, message: "不能超过500个字符", trigger: "blur" },
        ],
      },
      authDrawerVisible: false,
      authSourceRow: null,
      avatarDialogVisible: false,
      previewAvatarUrl: "",
    };
  },
  mounted() {
    this.loadProductOptions();
    this.applyRouteQuery();
    this.fetchTableData();
  },
  watch: {
    "$route.query"() {
      this.applyRouteQuery();
      this.fetchTableData();
    },
  },
  methods: {
    applyRouteQuery() {
      const query = (this.$route && this.$route.query) || {};
      const nextForm = { ...this.getDefaultFilterForm() };
      if (query.merchantAuditStatus) {
        nextForm.merchantAuditStatus = String(query.merchantAuditStatus);
      }
      if (query.platformAuditStatus) {
        nextForm.platformAuditStatus = String(query.platformAuditStatus);
      }
      if (query.applyType) {
        nextForm.applyType = String(query.applyType);
      }
      if (query.type) {
        nextForm.type = String(query.type);
      }
      if (query.userId) {
        nextForm.userId = String(query.userId);
      }
      if (query.nickName) {
        nextForm.nickName = String(query.nickName);
      }
      if (query.applyId || query.correlationId) {
        nextForm.applyId = String(query.applyId || query.correlationId);
      }
      this.filterForm = nextForm;
      this.pagination.pageNum = 1;
      this.$nextTick(() => {
        if (this.$refs.searchForm) {
          this.$refs.searchForm.setFormData(nextForm);
        }
      });
    },
    async loadProductOptions() {
      try {
        const res = await productSelect();
        if (res.code === 200 && Array.isArray(res.data)) {
          const productItem = this.searchItems.find((item) => item.prop === "productId");
          if (productItem) {
            productItem.options = [ALL_OPTION].concat(
              res.data.map((item) => ({
                label: item.productName,
                value: String(item.id),
              }))
            );
          }
        }
      } catch (error) {
        console.error("获取游戏列表失败:", error);
      }
    },
    buildListParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (this.filterForm.nickName) {
        params.nickName = this.filterForm.nickName;
      }
      if (this.filterForm.phone) {
        params.phone = this.filterForm.phone;
      }
      if (this.filterForm.platformAuditStatus) {
        params.platformAuditStatus = this.filterForm.platformAuditStatus;
      }
      if (this.filterForm.productId) {
        params.productId = this.filterForm.productId;
      }
      if (this.filterForm.applyType) {
        params.applyType = this.filterForm.applyType;
      }
      if (this.filterForm.merchantAuditStatus) {
        params.merchantAuditStatus = this.filterForm.merchantAuditStatus;
      }
      if (this.filterForm.type) {
        params.type = this.filterForm.type;
      }
      if (this.filterForm.applyId) {
        params.applyId = this.filterForm.applyId;
      }
      return params;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const params = this.buildListParams();
        if (!assignSearchId(params, "userId", this.filterForm.userId)) {
          this.$message.warning("陪陪ID格式不正确，请输入纯数字");
          return;
        }
        const res = await listTradeUnionCompanionAudit(params);
        if (res.success) {
          this.tableData = (res.data && res.data.rows) || [];
          this.pagination.total = (res.data && res.data.total) || 0;
        } else {
          this.$message.error(res.errorMessage || "查询失败");
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取商户陪玩审核列表失败:", error);
        this.$message.error("查询失败");
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    handleSearch(formValues) {
      this.filterForm = {
        ...this.filterForm,
        ...formValues,
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset(formValues) {
      this.filterForm = formValues
        ? { ...this.getDefaultFilterForm(), ...formValues }
        : this.getDefaultFilterForm();
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    getDefaultFilterForm() {
      return {
        userId: "",
        nickName: "",
        phone: "",
        merchantAuditStatus: "",
        platformAuditStatus: "",
        productId: "",
        applyType: "",
        type: "",
        applyId: "",
      };
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    getGuildAuditStatus(row) {
      const value = row.merchantAuditStatus;
      return value === undefined || value === null || value === "" ? "" : String(value);
    },
    getPlatformAuditStatus(row) {
      const value = row.platformAuditStatus;
      return value === undefined || value === null || value === "" ? "" : String(value);
    },
    getGuildStatusText(row) {
      const map = {
        0: "待审核",
        1: "公会通过",
        2: "公会驳回",
      };
      const status = this.getGuildAuditStatus(row);
      return status ? map[status] || "-" : "-";
    },
    getPlatformStatusText(row) {
      const map = {
        0: "待审核",
        1: "实战考核",
        2: "平台驳回",
        3: "平台通过",
      };
      const status = this.getPlatformAuditStatus(row);
      return status ? map[status] || "-" : "-";
    },
    getGuildStatusClass(row) {
      const map = {
        0: "is-pending",
        1: "is-success",
        2: "is-danger",
      };
      return map[this.getGuildAuditStatus(row)] || "";
    },
    getPlatformStatusClass(row) {
      const map = {
        0: "is-pending",
        1: "is-pending",
        2: "is-danger",
        3: "is-success",
      };
      return map[this.getPlatformAuditStatus(row)] || "";
    },
    getApplyTypeText(applyType) {
      const map = {
        1: "娱乐陪",
        2: "技术陪",
      };
      return map[String(applyType)] || "-";
    },
    getCompanionType(row) {
      const value = row.type;
      return value === undefined || value === null || value === "" ? "" : String(value);
    },
    getCompanionTypeText(row) {
      const type = this.getCompanionType(row);
      return (type && COMPANION_TYPE_MAP[type]?.label) || "-";
    },
    getCompanionTypeClass(row) {
      const type = this.getCompanionType(row);
      return (type && COMPANION_TYPE_MAP[type]?.className) || "";
    },
    getRemarkText(row) {
      const type = this.getCompanionType(row);
      if (!type || type === "1") {
        return "-";
      }
      const tradeName = row.tradeName || row.unionName || row.tradeUnionName || "";
      const merchantName = row.merchantName || "";
      if (type === "3") {
        if (merchantName && tradeName) {
          return `${merchantName}-${tradeName}`;
        }
        return row.remark || merchantName || tradeName || "-";
      }
      if (type === "2") {
        return tradeName || row.remark || "-";
      }
      return row.remark || "-";
    },
    isRejectedRow(row) {
      return this.getGuildAuditStatus(row) === "2" || this.getPlatformAuditStatus(row) === "2";
    },
    getRejectReason(row) {
      if (this.getPlatformAuditStatus(row) === "2") {
        return row.rejectReason || "";
      }
      if (this.getGuildAuditStatus(row) === "2") {
        return row.merchantRemark || row.rejectReason || "";
      }
      return "";
    },
    canOperateRow(row) {
      return this.getGuildAuditStatus(row) === "0";
    },
    getAvatarText(name) {
      const text = String(name || "").trim();
      return text ? text.slice(0, 1) : "陪";
    },
    previewAvatar(row) {
      if (!row.avatar) {
        return;
      }
      this.previewAvatarUrl = row.avatar;
      this.avatarDialogVisible = true;
    },
    handleImgError(event) {
      event.target.src = require("@/assets/defaulIcon.png");
      event.target.onerror = null;
    },
    showAuthDetail(row) {
      this.authSourceRow = row;
      this.authDrawerVisible = true;
    },
    handleApprove(row) {
      this.$confirm(`确定通过陪陪「${row.nickName || row.userId}」的公会审核吗？`, "审核通过", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "success",
      })
        .then(async () => {
          if (!row.applyId) {
            this.$message.warning("缺少申请ID，无法审核");
            return;
          }
          try {
            const res = await approveTradeUnionCompanionAudit({ applyId: row.applyId });
            if (res.success) {
              this.$message.success("审核通过");
              this.fetchTableData();
            } else {
              this.$message.error(res.errorMessage || "操作失败");
            }
          } catch (error) {
            console.error("审核通过失败:", error);
            this.$message.error("操作失败，请稍后重试");
          }
        })
        .catch(() => {});
    },
    handleReject(row) {
      this.currentRow = row;
      this.rejectForm.rejectReason = "";
      this.rejectDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.rejectForm) {
          this.$refs.rejectForm.clearValidate();
        }
      });
    },
    resetRejectForm() {
      this.currentRow = null;
      this.rejectForm.rejectReason = "";
      if (this.$refs.rejectForm) {
        this.$refs.rejectForm.resetFields();
      }
    },
    submitReject() {
      this.$refs.rejectForm.validate(async (valid) => {
        if (!valid || !this.currentRow) {
          return;
        }
        if (!this.currentRow.applyId) {
          this.$message.warning("缺少申请ID，无法驳回");
          return;
        }
        this.rejectLoading = true;
        try {
          const res = await rejectTradeUnionCompanionAudit({
            applyId: this.currentRow.applyId,
            rejectReason: this.rejectForm.rejectReason.trim(),
          });
          if (res.success) {
            this.$message.success("已驳回");
            this.rejectDialogVisible = false;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || "操作失败");
          }
        } catch (error) {
          console.error("审核驳回失败:", error);
          this.$message.error("操作失败，请稍后重试");
        } finally {
          this.rejectLoading = false;
        }
      });
    },
  },
};
</script>

<style scoped lang="scss">
.merchant-playmate-audit {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 24px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.avatar-cell {
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.avatar-thumb,
.avatar-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.avatar-thumb {
  object-fit: cover;
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #8f03ff;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.link-btn,
.approve-btn {
  color: #8f03ff;
}

.reject-btn,
.reject-reason {
  color: #ff4d4f;
}

.status-text {
  &.is-pending {
    color: #409eff;
  }

  &.is-success {
    color: #1bc286;
  }

  &.is-danger {
    color: #ff4d4f;
  }
}

.empty-action {
  color: #c0c4cc;
}

.companion-type-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;

  &.is-personal {
    background: #f2f3f5;
    color: #86909c;
  }

  &.is-guild {
    background: #f0e8ff;
    color: #8f03ff;
  }

  &.is-merchant-guild {
    background: #e8f8ef;
    color: #1bc286;
  }
}

.avatar-preview {
  display: block;
  width: 100%;
}
</style>
