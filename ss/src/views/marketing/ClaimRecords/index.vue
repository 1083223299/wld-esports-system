<template>
  <div class="claim-record-wrapper">
    <div ref="responsiveModule">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        @search="handleSearch"
        @reset="handleReset"
      >
      </SearchForm>
    </div>

    <el-card class="list-card" shadow="never">
      <div class="action-bar">
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="handleOpenManualGrant"
          >人工发奖</el-button
        >
      </div>

      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          v-loading="loading"
          :border="false"
          height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column
            label="活动信息"
            min-width="220"
            show-overflow-tooltip
          >
            <template slot-scope="{ row }">
              <div class="info-block">
                <div class="info-title">{{ row.activityName || "-" }}</div>
                <div class="info-sub">活动ID：{{ row.activityId || "-" }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="奖品信息"
            min-width="220"
            show-overflow-tooltip
          >
            <template slot-scope="{ row }">
              <div class="info-block">
                <div class="info-title">{{ row.prizeName || "-" }}</div>
                <div class="info-sub">奖品ID：{{ row.prizeId || "-" }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="领取人信息"
            min-width="220"
            show-overflow-tooltip
          >
            <template slot-scope="{ row }">
              <div class="info-block">
                <div class="info-title">{{ row.userNickname || "-" }}</div>
                <div class="info-sub">用户ID：{{ row.userId || "-" }}</div>
                <div class="info-sub">
                  <PhoneDisplay :value="row.userPhone" />
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="receiveTime" label="领取时间" width="180">
            <template slot-scope="{ row }">
              {{ row.receiveTime || "-" }}
            </template>
          </el-table-column>

          <el-table-column label="奖品类型" width="110">
            <template slot-scope="{ row }">
              {{ getPrizeCategoryText(row.prizeCategory) }}
            </template>
          </el-table-column>

          <el-table-column label="最新使用状态" width="120">
            <template slot-scope="{ row }">
              <el-tag
                v-if="!isFutureCoinPrize(row)"
                size="small"
                :type="getStatusTagType(row.status)"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="发放来源" width="150">
            <template slot-scope="{ row }">
              {{ getGrantSourceText(row.grantSource) }}
            </template>
          </el-table-column>

          <el-table-column
            prop="remark"
            label="备注"
            min-width="160"
            show-overflow-tooltip
          >
            <template slot-scope="{ row }">
              {{ row.remark || "-" }}
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="120"
            fixed="right"
            align="center"
          >
            <template slot-scope="{ row }">
              <el-button
                v-if="!isFutureCoinPrize(row)"
                type="text"
                style="color: #409eff"
                @click="handleViewLogs(row)"
                >日志</el-button
              >
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
        >
        </PaginationSimple>
      </div>
    </el-card>

    <el-dialog
      title="奖品使用记录"
      :visible.sync="logDialogVisible"
      width="680px"
      :close-on-click-modal="false"
    >
      <div v-loading="logLoading" class="log-dialog-body">
        <div v-if="currentLogRow" class="dialog-header-card">
          <div class="dialog-header-title">
            {{ currentLogRow.prizeName || "-" }}
          </div>
          <div
            v-if="currentLogRow.activityName || currentLogRow.activityId"
            class="dialog-header-sub"
          >
            活动：{{ currentLogRow.activityName || "-" }}（ID：{{
              currentLogRow.activityId || "-"
            }}）
          </div>
          <div class="dialog-header-sub">
            用户：{{ currentLogRow.userNickname || "-" }} /
            <PhoneDisplay :value="currentLogRow.userPhone" />
          </div>
        </div>

        <el-empty
          v-if="!logLoading && logList.length === 0"
          description="暂无日志记录"
        />

        <el-timeline v-else class="log-timeline">
          <el-timeline-item
            v-for="(item, index) in logList"
            :key="item.id || index"
            :timestamp="getLogTime(item)"
            placement="top"
            :type="getLogNodeType(item.statusNode)"
          >
            <div class="timeline-card">
              <div class="timeline-title">
                {{ getLogTitle(item.statusNode) }}
              </div>
              <div v-if="showLogOrderInfo(item)" class="timeline-sub">
                订单号：{{ getLogOrderNo(item) }}
              </div>
              <div v-if="showLogPhoneInfo(item)" class="timeline-sub">
                手机号：<PhoneDisplay
                  :value="currentLogRow && currentLogRow.userPhone"
                />
              </div>
              <div v-if="getLogRemark(item)" class="timeline-sub">
                备注：{{ getLogRemark(item) }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>

    <el-dialog
      title="人工发奖"
      :visible.sync="manualDialogVisible"
      width="620px"
      :close-on-click-modal="false"
      @close="handleManualDialogClose"
    >
      <el-form
        ref="manualFormRef"
        :model="manualForm"
        :rules="manualRules"
        label-width="110px"
        :validate-on-rule-change="false"
      >
        <el-form-item label="选择奖品" prop="prizeId">
          <el-select
            v-model="manualForm.prizeId"
            filterable
            clearable
            placeholder="请选择人工发放奖品"
            style="width: 100%"
            :loading="manualPrizeLoading"
            @change="handleManualPrizeChange"
          >
            <el-option
              v-for="item in manualPrizeOptions"
              :key="item.id"
              :label="`${item.prizeName} ${item.id}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <div
          v-if="selectedManualPrize || manualPrizeDetailLoading"
          v-loading="manualPrizeDetailLoading"
          class="manual-prize-card"
        >
          <template v-if="selectedManualPrize">
            <div class="manual-prize-title">
              {{ selectedManualPrize.prizeName || "-" }}
            </div>
            <div class="manual-prize-info">
              奖品ID：{{ selectedManualPrize.id || "-" }}
            </div>
            <div class="manual-prize-info">
              奖品属性：{{
                getPrizeSourceText(selectedManualPrize.prizeSource)
              }}
            </div>
            <div class="manual-prize-info">
              券类型：{{ getPrizeTypeText(selectedManualPrize.prizeType) }}
            </div>
            <div class="manual-prize-info">
              优惠内容：{{ formatPrizeContent(selectedManualPrize) }}
            </div>
            <div class="manual-prize-info">
              有效时间：{{ formatValidPeriod(selectedManualPrize) }}
            </div>
          </template>
        </div>

        <el-form-item label="用户手机号" prop="userPhone">
          <el-input
            v-model.trim="manualForm.userPhone"
            maxlength="11"
            placeholder="请输入用户手机号"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="manualForm.remark"
            type="textarea"
            :rows="3"
            maxlength="50"
            show-word-limit
            placeholder="请输入备注，最多50字"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="manualDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="manualSubmitLoading"
          @click="submitManualGrant"
          >确定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import {
  claimRecordPage,
  claimRecordLogList,
  manualGrant,
} from "@/api/claimRecords";
import { OperationPrizeList, OperationPrizeDetail } from "@/api/prize";

const EMPTY_MANUAL_FORM = {
  prizeId: "",
  userPhone: "",
  remark: "",
};

export default {
  name: "ClaimRecords",
  components: { SearchForm, PaginationSimple, PhoneDisplay },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "orderNo",
          label: "订单号",
          placeholder: "请输入订单号",
          clearable: true,
        },
        {
          type: "input",
          prop: "activityId",
          label: "活动ID",
          placeholder: "请输入活动ID",
          inputType: "integer",
          clearable: true,
        },
        {
          type: "input",
          prop: "prizeId",
          label: "奖品ID",
          placeholder: "请输入奖品ID",
          inputType: "integer",
          clearable: true,
        },
        {
          type: "select",
          prop: "prizeCategory",
          label: "奖品类型",
          placeholder: "请选择奖品类型",
          options: [
            { label: "全部", value: "" },
            { label: "优惠券", value: "1" },
            { label: "未来币", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "input",
          prop: "userPhone",
          label: "用户手机号",
          placeholder: "请输入用户手机号",
          clearable: true,
        },
        {
          type: "daterange",
          prop: "receiveTime",
          label: "领取时间",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间",
          allowFutureDate: true,
          clearable: true,
        },
      ],
      filterForm: {
        orderNo: "",
        activityId: "",
        prizeId: "",
        prizeCategory: "",
        userPhone: "",
        receiveTime: [],
      },
      tableData: [],
      loading: false,
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },

      logDialogVisible: false,
      logLoading: false,
      currentLogRow: null,
      logList: [],

      manualDialogVisible: false,
      manualSubmitLoading: false,
      manualPrizeLoading: false,
      manualPrizeDetailLoading: false,
      manualPrizeOptions: [],
      manualForm: { ...EMPTY_MANUAL_FORM },
      selectedManualPrize: null,
    };
  },
  computed: {
    manualRules() {
      return {
        prizeId: [{ required: true, message: "请选择奖品", trigger: "change" }],
        userPhone: [
          { required: true, message: "请输入用户手机号", trigger: "blur" },
          {
            pattern: /^1[3-9]\d{9}$/,
            message: "请输入正确的手机号码",
            trigger: "blur",
          },
        ],
        remark: [{ max: 50, message: "备注最多50字", trigger: "blur" }],
      };
    },
  },
  mounted() {
    this.fetchTableData();
    this.fetchManualPrizeOptions();
  },
  methods: {
    getPrizeSourceText(value) {
      return { 1: "活动奖品", 2: "人工发放奖品" }[String(value)] || "-";
    },
    getPrizeTypeText(value) {
      return { 1: "满减券", 2: "折扣券", 3: "代金券" }[String(value)] || "-";
    },
    getPrizeCategoryText(value) {
      return { 1: "优惠券", 2: "未来币" }[String(value)] || "-";
    },
    isFutureCoinPrize(row) {
      return String(row && row.prizeCategory) === "2";
    },
    getValidTypeText(value) {
      return (
        { 1: "固定时间", 2: "领取后生效", 3: "永久有效" }[String(value)] || "-"
      );
    },
    getStatusText(status) {
      return (
        {
          0: "未使用",
          1: "已使用",
          3: "已过期",
        }[String(status)] || "-"
      );
    },
    getStatusTagType(status) {
      return (
        {
          0: "info",
          1: "success",
          3: "danger",
        }[String(status)] || "info"
      );
    },
    getGrantSourceText(source) {
      return (
        {
          1: "用户在C端手动领取",
          2: "人工发奖",
        }[String(source)] || "-"
      );
    },
    formatPrizeContent(row) {
      const prizeType = String(row.prizeType || "");
      if (prizeType === "1") {
        return `满${row.thresholdAmount || "-"}元 立减${
          row.reduceAmount || "-"
        }元`;
      }
      if (prizeType === "2") {
        return row.discountValue ? `${row.discountValue}折` : "-";
      }
      if (prizeType === "3") {
        return row.faceValue != null && row.faceValue !== ""
          ? `${row.faceValue}元`
          : "-";
      }
      return "-";
    },
    formatValidPeriod(row) {
      const validType = String(row.validType || "");
      if (validType === "1") {
        if (row.validStartTime && row.validEndTime) {
          return `${row.validStartTime} -- ${row.validEndTime}`;
        }
        return "固定时间";
      }
      if (validType === "2") {
        return row.validDays ? `领取后${row.validDays}天内有效` : "领取后生效";
      }
      if (validType === "3") {
        return "永久有效";
      }
      return this.getValidTypeText(validType);
    },
    maskPhone(phone) {
      const text = String(phone || "").trim();
      if (!text) return "-";
      if (/^\d{11}$/.test(text)) {
        return `${text.slice(0, 3)}****${text.slice(-4)}`;
      }
      if (text.length > 7) {
        return `${text.slice(0, 3)}****${text.slice(-4)}`;
      }
      return text;
    },
    buildQueryParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (this.filterForm.orderNo) params.orderNo = this.filterForm.orderNo;
      if (this.filterForm.activityId)
        params.activityId = this.filterForm.activityId;
      if (this.filterForm.prizeId) params.prizeId = this.filterForm.prizeId;
      if (this.filterForm.prizeCategory)
        params.prizeCategory = this.filterForm.prizeCategory;
      if (this.filterForm.userPhone)
        params.userPhone = this.filterForm.userPhone;
      if (
        Array.isArray(this.filterForm.receiveTime) &&
        this.filterForm.receiveTime.length === 2
      ) {
        params.startTime = this.filterForm.receiveTime[0];
        params.endTime = this.filterForm.receiveTime[1];
      }
      return params;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await claimRecordPage(this.buildQueryParams());
        if (res.success) {
          this.tableData = res.data?.rows || [];
          this.pagination.total = res.data?.total || 0;
        } else {
          this.tableData = [];
          this.pagination.total = 0;
          this.$message.error(res.errorMessage || "获取领取记录失败");
        }
      } catch {
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取领取记录失败");
      } finally {
        this.loading = false;
      }
    },
    async fetchManualPrizeOptions() {
      this.manualPrizeLoading = true;
      try {
        const res = await OperationPrizeList({
          pageNum: 1,
          pageSize: 999,
          prizeSource: "2",
        });
        if (res.success) {
          this.manualPrizeOptions = res.data?.rows || [];
        } else {
          this.manualPrizeOptions = [];
        }
      } catch {
        this.manualPrizeOptions = [];
      } finally {
        this.manualPrizeLoading = false;
      }
    },
    handleSearch(formData) {
      this.filterForm = {
        orderNo: formData?.orderNo || "",
        activityId: formData?.activityId || "",
        prizeId: formData?.prizeId || "",
        prizeCategory: formData?.prizeCategory || "",
        userPhone: formData?.userPhone || "",
        receiveTime: formData?.receiveTime || [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        orderNo: "",
        activityId: "",
        prizeId: "",
        prizeCategory: "",
        userPhone: "",
        receiveTime: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchTableData();
    },
    handleOpenManualGrant() {
      this.manualDialogVisible = true;
      this.selectedManualPrize = null;
      this.manualForm = { ...EMPTY_MANUAL_FORM };
      this.$nextTick(() => {
        if (this.$refs.manualFormRef) this.$refs.manualFormRef.clearValidate();
      });
    },
    async handleManualPrizeChange(prizeId) {
      this.selectedManualPrize = null;
      this.$nextTick(() => {
        if (this.$refs.manualFormRef)
          this.$refs.manualFormRef.clearValidate(["prizeId"]);
      });
      if (!prizeId) return;
      this.manualPrizeDetailLoading = true;
      try {
        const res = await OperationPrizeDetail({ id: prizeId });
        if (res.success && res.data) {
          this.selectedManualPrize = res.data;
        } else {
          this.$message.error(res.errorMessage || "获取奖品详情失败");
        }
      } catch {
        this.$message.error("获取奖品详情失败");
      } finally {
        this.manualPrizeDetailLoading = false;
      }
    },
    handleManualDialogClose() {
      this.manualForm = { ...EMPTY_MANUAL_FORM };
      this.selectedManualPrize = null;
    },
    submitManualGrant() {
      this.$refs.manualFormRef.validate(async (valid) => {
        if (!valid) return;
        this.manualSubmitLoading = true;
        try {
          const res = await manualGrant({
            prizeId: this.manualForm.prizeId,
            userPhone: this.manualForm.userPhone,
            remark: this.manualForm.remark || "",
          });
          if (res.success) {
            this.$message.success("人工发奖成功");
            this.manualDialogVisible = false;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || "人工发奖失败");
          }
        } catch {
          this.$message.error("人工发奖失败");
        } finally {
          this.manualSubmitLoading = false;
        }
      });
    },
    async handleViewLogs(row) {
      this.currentLogRow = row;
      this.logDialogVisible = true;
      this.logLoading = true;
      this.logList = [];
      try {
        const res = await claimRecordLogList({ receiveId: row.id });
        if (res.success) {
          this.logList = this.normalizeLogList(res.data);
        } else {
          this.$message.error(res.errorMessage || "获取日志失败");
        }
      } catch {
        this.$message.error("获取日志失败");
      } finally {
        this.logLoading = false;
      }
    },
    normalizeLogList(data) {
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.list)
        ? data.list
        : [];
      return list.slice().sort((a, b) => {
        const first = new Date(a.createTime || 0).getTime();
        const second = new Date(b.createTime || 0).getTime();
        return first - second;
      });
    },
    getLogTime(item) {
      return item.createTime || "-";
    },
    getLogTitle(statusNode) {
      return (
        {
          1: "领取",
          2: "使用",
          3: "退还",
          4: "过期",
        }[String(statusNode)] || "未知节点"
      );
    },
    getLogOrderNo(item) {
      return item.orderNo || "";
    },
    showLogOrderInfo(item) {
      return String(item.statusNode || "") === "2" && !!item.orderNo;
    },
    showLogPhoneInfo(item) {
      return (
        String(item.statusNode || "") === "2" &&
        !!(this.currentLogRow && this.currentLogRow.userPhone)
      );
    },
    getLogRemark(item) {
      return item.remark || "";
    },
    getLogNodeType(statusNode) {
      return (
        {
          1: "primary",
          2: "success",
          3: "warning",
          4: "danger",
        }[String(statusNode)] || "primary"
      );
    },
  },
};
</script>

<style scoped lang="scss">
.claim-record-wrapper {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 24px;
}

.action-bar {
  flex-shrink: 0;
  margin-bottom: 20px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

.info-block {
  line-height: 1.6;
}

.info-title {
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}

.info-sub {
  color: #909399;
  font-size: 12px;
  word-break: break-all;
}

.log-dialog-body {
  min-height: 240px;
}

.dialog-header-card {
  padding: 14px 16px;
  margin-bottom: 16px;
  background: #f7f8fa;
  border-radius: 10px;
}

.dialog-header-title {
  color: #303133;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}

.dialog-header-sub {
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}

.log-timeline {
  padding-top: 8px;
}

.timeline-card {
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
}

.timeline-title {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.timeline-sub {
  color: #909399;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-all;
}

.manual-prize-card {
  margin: 0 0 18px 110px;
  padding: 14px 16px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.manual-prize-title {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.manual-prize-info {
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}
</style>
