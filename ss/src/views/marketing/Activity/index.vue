<template>
  <div class="list-wrapper">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        label-width="100px"
        @search="handleSearch"
        @reset="handleReset"
      >
      </SearchForm>
    </div>

    <!-- 数据列表展示 -->
    <el-card class="list-card" shadow="never">
      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd"
          >新增活动</el-button
        >
      </div>
      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          v-loading="loading"
          :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="id" label="活动ID"></el-table-column>
          <el-table-column
            prop="activityName"
            label="活动名称"
            show-overflow-tooltip
          ></el-table-column>
          <el-table-column label="渠道">
            <template slot-scope="{ row }">
              {{ formatChannel(row.channel) }}
            </template>
          </el-table-column>
          <el-table-column label="活动周期" show-overflow-tooltip width="300">
            <template slot-scope="{ row }">
              <span v-if="row.activityStartTime && row.activityEndTime">
                {{ row.activityStartTime }} 至 {{ row.activityEndTime }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人">
            <template slot-scope="{ row }">
              {{ row.operatorName || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="活动开关" width="100">
            <template slot-scope="{ row }">
              <el-switch
                v-model="row.status"
                :active-value="'1'"
                :inactive-value="'0'"
                active-color="#8F03FF"
                :disabled="row.statusSwitchLoading"
                @change="handleActivityStatusChange(row)"
              >
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column prop="operateTime" label="操作时间">
            <template slot-scope="{ row }">
              {{ row.operateTime || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间">
            <template slot-scope="{ row }">
              {{ row.createTime || "-" }}
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
                type="text"
                style="color: #409eff"
                @click="handleEdit(row)"
                >编辑</el-button
              >
              <el-button
                type="text"
                style="color: #f56c6c"
                @click="handleDelete(row)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>
      <!-- 分页组件 -->
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="800px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="130px"
        v-loading="dialogLoading"
        :validate-on-rule-change="false"
      >
        <el-form-item label="活动名称" prop="activityName">
          <el-input
            v-model="form.activityName"
            placeholder="请输入活动名称"
            maxlength="15"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="渠道" prop="channel">
          <el-checkbox-group v-model="form.channelList">
            <el-checkbox label="APP">APP</el-checkbox>
            <el-checkbox label="MINI_PROGRAM">未来洞小程序</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="活动周期" prop="activityStartTime">
          <div class="threshold-row">
            <el-date-picker
              v-model="form.activityStartTime"
              type="datetime"
              placeholder="开始时间"
              value-format="yyyy-MM-dd HH:mm:ss"
              default-time="00:00:00"
              class="threshold-input"
              @change="handleFormStartChange"
            />
            <span class="threshold-label">--</span>
            <el-date-picker
              v-model="form.activityEndTime"
              type="datetime"
              placeholder="结束时间"
              value-format="yyyy-MM-dd HH:mm:ss"
              default-time="23:59:59"
              class="threshold-input"
              :picker-options="formEndPickerOptions"
            />
          </div>
        </el-form-item>

        <el-form-item label="适用人群" prop="userScope">
          <el-radio-group
            v-model="form.userScope"
            @change="handleUserScopeChange"
          >
            <el-radio label="1">全部用户</el-radio>
            <el-radio label="2">指定标签用户</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="form.userScope === '2'"
          label="选择标签"
          prop="userLabelIds"
        >
          <el-select
            v-model="form.userLabelIds"
            multiple
            filterable
            placeholder="请选择用户标签"
            style="width: 100%"
            :loading="labelLoading"
          >
            <el-option
              v-for="lb in labelOptions"
              :key="lb.id"
              :label="lb.labelName"
              :value="lb.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="抢券专区展示" prop="couponAreaShow">
          <el-radio-group
            v-model="form.couponAreaShow"
            @change="handleCouponAreaChange"
          >
            <el-radio label="1">展示</el-radio>
            <el-radio label="0">不展示</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="form.couponAreaShow === '1'"
          label="抢券专区排序值"
          prop="couponAreaSort"
        >
          <el-input
            v-model="form.couponAreaSort"
            placeholder="请填写自然数"
            @input="sanitizeInt('couponAreaSort')"
          />
        </el-form-item>

        <el-form-item label="关联奖品" prop="prizes">
          <div class="prize-rows">
            <div
              v-for="(item, idx) in form.prizes"
              :key="idx"
              class="prize-row"
            >
              <el-select
                v-model="item.prizeId"
                filterable
                clearable
                placeholder="搜索并选择奖品"
                style="flex: 1"
                :loading="prizeLoading"
              >
                <el-option
                  v-for="p in getAvailablePrizes(idx)"
                  :key="p.id"
                  :label="`${p.prizeName} ${p.id}`"
                  :value="p.id"
                />
              </el-select>
              <span>单日陪陪接单上限:</span>
              <el-input
                v-model="item.dailyCompanionOrderLimit"
                placeholder="单日陪陪接单上限"
                style="width: 150px"
                @input="
                  item.dailyCompanionOrderLimit = item.dailyCompanionOrderLimit
                    ? Number(
                        String(item.dailyCompanionOrderLimit).replace(/\D/g, '')
                      )
                    : null
                "
              />
              <i
                class="el-icon-circle-plus-outline prize-add-btn"
                @click="addPrizeRow"
              ></i>
              <i
                class="el-icon-remove-outline prize-remove-btn"
                v-if="form.prizes.length > 1"
                @click="removePrize(idx)"
              ></i>
            </div>
          </div>
        </el-form-item>

        <el-form-item
          v-if="form.prizes.length >= 2"
          label="领取是否互斥"
          prop="receiveMutex"
        >
          <el-radio-group v-model="form.receiveMutex">
            <el-radio label="1">互斥</el-radio>
            <el-radio label="0">不互斥</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="活动详细说明" prop="detailDesc">
          <div class="editor-wrapper">
            <QuillEditor
              v-model="form.detailDesc"
              :options="detailDescEditorOptions"
              @blur="handleDetailDescBlur"
            />
          </div>
          <div class="form-tip">最多输入1000个字</div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-if="!editReadonly"
          type="primary"
          :loading="submitLoading"
          @click="submitForm"
          >确定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import {
  activityPage,
  activityDetail,
  activityCreate,
  activityUpdate,
  activityDelete,
  activityChangeStatus,
} from "@/api/activity";
import { OperationPrizeList } from "@/api/prize";
import { queryUserLabel } from "@/api/label";

const CHANNEL_MAP = {
  APP: "APP",
  MINI_PROGRAM: "未来洞小程序",
  "APP,MINI_PROGRAM": "APP、未来洞小程序",
  "MINI_PROGRAM,APP": "APP、未来洞小程序",
};

const EMPTY_PRIZE_ROW = { prizeId: null, dailyCompanionOrderLimit: null };

const EMPTY_FORM = {
  id: null,
  activityName: "",
  channelList: ["APP", "MINI_PROGRAM"],
  activityStartTime: "",
  activityEndTime: "",
  userScope: "1",
  userLabelIds: [],
  couponAreaShow: "0",
  couponAreaSort: "",
  receiveMutex: "0",
  detailDesc: "",
  prizes: [{ ...EMPTY_PRIZE_ROW }],
};

export default {
  name: "ActivityList",
  components: { SearchForm, PaginationSimple, QuillEditor: quillEditor },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "activityId",
          label: "活动ID",
          inputType: "integer",
          placeholder: "请输入活动ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "activityName",
          label: "活动名称",
          placeholder: "请输入活动名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "channel",
          label: "渠道",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "APP", value: "APP" },
            { label: "未来洞小程序", value: "MINI_PROGRAM" },
          ],
          clearable: true,
        },
        {
          type: "input",
          prop: "prizeId",
          label: "关联奖品ID",
          placeholder: "请输入奖品ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "prizeName",
          label: "关联奖品名称",
          placeholder: "请输入奖品名称",
          clearable: true,
        },
        {
          type: "daterange",
          prop: "activityPeriod",
          label: "活动周期",
          placeholder: ["开始日期", "结束日期"],
          clearable: true,
          allowFutureDate: true,
        },
      ],
      filterForm: {
        activityId: "",
        activityName: "",
        channel: "",
        prizeId: "",
        prizeName: "",
        activityPeriod: [],
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      dialogVisible: false,
      dialogTitle: "新增活动",
      isEdit: false,
      editReadonly: false,
      dialogLoading: false,
      submitLoading: false,
      form: { ...EMPTY_FORM },
      allPrizeOptions: [],
      prizeLoading: false,
      labelOptions: [],
      labelLoading: false,
      detailDescEditorOptions: {
        theme: "snow",
        placeholder: "请输入活动详细说明",
        modules: {
          toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ["clean"],
          ],
        },
      },
    };
  },

  computed: {
    formRules() {
      const r = {
        activityName: [
          { required: true, message: "请输入活动名称", trigger: "blur" },
          { max: 15, message: "最多15个字", trigger: "blur" },
        ],
        channel: [
          {
            required: true,
            validator: this.validateChannel,
            trigger: "change",
          },
        ],
        activityStartTime: [
          {
            required: true,
            validator: this.validateActivityTime,
            trigger: "change",
          },
        ],
        userScope: [
          { required: true, message: "请选择适用人群", trigger: "change" },
        ],
        couponAreaShow: [
          { required: true, message: "请选择抢券专区", trigger: "change" },
        ],
        prizes: [
          { required: true, validator: this.validatePrizes, trigger: "change" },
        ],
        detailDesc: [
          {
            required: true,
            validator: this.validateDetailDesc,
            trigger: "blur",
          },
        ],
      };
      if (this.form.userScope === "2") {
        r.userLabelIds = [
          {
            required: true,
            type: "array",
            min: 1,
            message: "请至少选择一个标签",
            trigger: "change",
          },
        ];
      }
      if (this.form.couponAreaShow === "1") {
        r.couponAreaSort = [
          { required: true, message: "请输入排序值", trigger: "blur" },
        ];
      }
      if (this.form.prizes.length >= 2) {
        r.receiveMutex = [
          { required: true, message: "请选择是否互斥", trigger: "change" },
        ];
      }
      return r;
    },
    formEndPickerOptions() {
      const start = this.form.activityStartTime;
      if (!start) return {};
      const startDate = new Date(start);
      return {
        disabledDate(time) {
          return time.getTime() < startDate.getTime() - 1000;
        },
      };
    },
  },

  mounted() {
    this.fetchTableData();
    this.fetchPrizeOptions();
    this.fetchLabelOptions();
  },

  methods: {
    normalizeEditorHtml(html) {
      const content = String(html || "").trim();
      return content === "<p><br></p>" ? "" : content;
    },
    getEditorPlainText(html) {
      return String(html || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    },
    formatChannel(channel) {
      if (!channel) return "APP、未来洞小程序";
      if (CHANNEL_MAP[channel]) return CHANNEL_MAP[channel];
      return channel;
    },
    validatePrizes(rule, value, callback) {
      if (!Array.isArray(this.form.prizes) || this.form.prizes.length === 0) {
        return callback(new Error("请至少选择一个奖品"));
      }
      const hasSelected = this.form.prizes.some((p) => p.prizeId);
      if (!hasSelected) {
        return callback(new Error("请至少选择一个奖品"));
      }
      callback();
    },
    validateDetailDesc(rule, value, callback) {
      const text = this.getEditorPlainText(this.normalizeEditorHtml(value));
      if (!text) {
        return callback(new Error("请输入活动详细说明"));
      }
      if (text.length > 1000) {
        return callback(new Error("最多1000个字"));
      }
      callback();
    },

    sanitizeInt(field) {
      this.form[field] = String(this.form[field] || "").replace(/\D/g, "");
    },

    validateChannel(rule, value, callback) {
      if (!this.form.channelList || this.form.channelList.length === 0) {
        callback(new Error("请至少选择一个渠道"));
      } else {
        callback();
      }
    },
    validateActivityTime(rule, value, callback) {
      if (!this.form.activityStartTime)
        return callback(new Error("请选择开始时间"));
      if (!this.form.activityEndTime)
        return callback(new Error("请选择结束时间"));
      if (
        new Date(this.form.activityEndTime).getTime() <
        new Date(this.form.activityStartTime).getTime()
      ) {
        return callback(new Error("结束时间不能小于开始时间"));
      }
      callback();
    },

    handleFormStartChange() {
      if (this.form.activityStartTime && this.form.activityEndTime) {
        if (
          new Date(this.form.activityEndTime).getTime() <
          new Date(this.form.activityStartTime).getTime()
        ) {
          this.form.activityEndTime = "";
        }
      }
    },
    handleUserScopeChange() {
      if (this.form.userScope === "1") this.form.userLabelIds = [];
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    handleCouponAreaChange() {
      if (this.form.couponAreaShow === "0") this.form.couponAreaSort = "";
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },
    handleDetailDescBlur() {
      this.form.detailDesc = this.normalizeEditorHtml(this.form.detailDesc);
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.validateField("detailDesc");
      });
    },

    getAvailablePrizes(currentIdx) {
      const selectedIds = this.form.prizes
        .filter((_, i) => i !== currentIdx)
        .map((p) => p.prizeId)
        .filter(Boolean);
      return this.allPrizeOptions.filter((p) => !selectedIds.includes(p.id));
    },

    addPrizeRow() {
      this.form.prizes.push({ ...EMPTY_PRIZE_ROW });
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },

    removePrize(idx) {
      this.form.prizes.splice(idx, 1);
      if (this.form.prizes.length < 2) this.form.receiveMutex = "0";
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },

    async fetchPrizeOptions() {
      this.prizeLoading = true;
      try {
        const res = await OperationPrizeList({
          pageNum: 1,
          pageSize: 999,
          prizeSource: "1",
          activityLinked: "0",
        });
        if (res.success) {
          this.allPrizeOptions = res.data.rows || [];
        }
      } catch {
        /* ignore */
      } finally {
        this.prizeLoading = false;
      }
    },

    async fetchLabelOptions() {
      this.labelLoading = true;
      try {
        const res = await queryUserLabel({});
        if (res.success)
          this.labelOptions = Array.isArray(res.data) ? res.data : [];
      } catch {
        /* ignore */
      } finally {
        this.labelLoading = false;
      }
    },

    async handleActivityStatusChange(row) {
      const targetStatus = String(row.status);
      const previousStatus = targetStatus === "1" ? "0" : "1";
      this.$set(row, "statusSwitchLoading", true);
      try {
        const res = await activityChangeStatus({
          activityId: row.id,
          status: targetStatus,
        });
        if (res.success) {
          this.$message.success(targetStatus === "1" ? "活动开启" : "活动关闭");
        } else {
          row.status = previousStatus;
          this.$message.error(res.errorMessage || "操作失败");
        }
      } catch {
        row.status = previousStatus;
        this.$message.error("操作失败");
      } finally {
        this.$set(row, "statusSwitchLoading", false);
      }
    },

    buildQueryParams() {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      if (this.filterForm.activityId) p.activityId = this.filterForm.activityId;
      if (this.filterForm.activityName)
        p.activityName = this.filterForm.activityName;
      if (this.filterForm.channel) p.channel = this.filterForm.channel;
      if (this.filterForm.prizeId) p.prizeId = this.filterForm.prizeId;
      if (this.filterForm.prizeName) p.prizeName = this.filterForm.prizeName;
      if (
        this.filterForm.activityPeriod &&
        this.filterForm.activityPeriod.length === 2
      ) {
        p.startTime = this.filterForm.activityPeriod[0];
        p.endTime = this.filterForm.activityPeriod[1];
      }
      return p;
    },

    async fetchTableData() {
      this.loading = true;
      try {
        const res = await activityPage(this.buildQueryParams());
        if (res.success) {
          this.tableData = res.data?.rows || [];
          this.pagination.total = res.data?.total || 0;
        } else {
          this.$message.error(res.errorMessage || "查询失败");
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch {
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取活动列表失败");
      } finally {
        this.loading = false;
      }
    },

    handleSearch(fd) {
      this.filterForm = {
        activityId: fd?.activityId || "",
        activityName: fd?.activityName || "",
        channel: fd?.channel || "",
        prizeId: fd?.prizeId || "",
        prizeName: fd?.prizeName || "",
        activityPeriod: fd?.activityPeriod || [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        activityId: "",
        activityName: "",
        channel: "",
        prizeId: "",
        prizeName: "",
        activityPeriod: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(n) {
      this.pagination.pageNum = n;
      this.fetchTableData();
    },

    async handleAdd() {
      this.isEdit = false;
      this.editReadonly = false;
      this.dialogTitle = "新增活动";
      this.form = JSON.parse(JSON.stringify(EMPTY_FORM));
      await this.fetchPrizeOptions();
      this.dialogVisible = true;
      this.$nextTick(
        () => this.$refs.formRef && this.$refs.formRef.clearValidate()
      );
    },

    async handleEdit(row) {
      this.isEdit = true;
      this.editReadonly = false;
      this.dialogTitle = "编辑活动";
      this.dialogVisible = true;
      this.dialogLoading = true;
      try {
        const res = await activityDetail({ activityId: row.id });
        if (res.success && res.data) {
          const d = res.data;
          this.form = {
            id: d.id || row.id,
            activityName: d.activityName || "",
            channelList: d.channel
              ? d.channel.split(",").filter(Boolean)
              : ["APP", "MINI_PROGRAM"],
            activityStartTime: d.activityStartTime || "",
            activityEndTime: d.activityEndTime || "",
            userScope: String(d.userScope ?? "1"),
            userLabelIds: Array.isArray(d.userLabelIds) ? d.userLabelIds : [],
            couponAreaShow: String(d.couponAreaShow ?? "0"),
            couponAreaSort:
              d.couponAreaSort != null ? String(d.couponAreaSort) : "",
            receiveMutex: String(d.receiveMutex ?? "0"),
            detailDesc: d.detailDesc || "",
            prizes:
              Array.isArray(d.prizes) && d.prizes.length > 0
                ? d.prizes.map((p) => ({
                    prizeId: p.prizeId,
                    dailyCompanionOrderLimit:
                      p.dailyCompanionOrderLimit ?? null,
                  }))
                : [{ ...EMPTY_PRIZE_ROW }],
          };
          this.$nextTick(() => {
            if (this.$refs.formRef) this.$refs.formRef.clearValidate();
          });
        } else {
          this.$message.error(res.errorMessage || "获取详情失败");
          this.dialogVisible = false;
        }
      } catch {
        this.$message.error("获取详情失败");
        this.dialogVisible = false;
      } finally {
        this.dialogLoading = false;
      }
    },

    handleDialogClose() {
      this.form = JSON.parse(JSON.stringify(EMPTY_FORM));
      this.$nextTick(() => {
        if (this.$refs.formRef) this.$refs.formRef.clearValidate();
      });
    },

    submitForm() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return;
        this.submitLoading = true;
        try {
          const data = {
            activityName: this.form.activityName,
            channel: this.form.channelList.join(","),
            activityStartTime: this.form.activityStartTime,
            activityEndTime: this.form.activityEndTime,
            userScope: this.form.userScope,
            couponAreaShow: this.form.couponAreaShow,
            detailDesc: this.normalizeEditorHtml(this.form.detailDesc) || "",
            receiveMutex:
              this.form.prizes.length >= 2 ? this.form.receiveMutex : "0",
            prizes: this.form.prizes
              .filter((p) => p.prizeId)
              .map((p) => {
                const item = { prizeId: p.prizeId };
                if (
                  p.dailyCompanionOrderLimit != null &&
                  p.dailyCompanionOrderLimit !== ""
                ) {
                  item.dailyCompanionOrderLimit = Number(
                    p.dailyCompanionOrderLimit
                  );
                }
                if (!this.isEdit) item.receiveLimit = 1;
                return item;
              }),
          };
          if (this.form.userScope === "2")
            data.userLabelIds = this.form.userLabelIds;
          if (this.form.couponAreaShow === "1")
            data.couponAreaSort = Number(this.form.couponAreaSort) || 0;
          if (this.isEdit) data.activityId = this.form.id;

          const api = this.isEdit ? activityUpdate : activityCreate;
          const res = await api(data);
          if (res.success) {
            this.$message.success(this.isEdit ? "编辑成功" : "新增成功");
            this.dialogVisible = false;
            this.fetchTableData();
          }
        } finally {
          this.submitLoading = false;
        }
      });
    },

    handleDelete(row) {
      this.$confirm(`确定要删除活动「${row.activityName}」吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          const res = await activityDelete({ ids: [row.id] });
          if (res.success) {
            this.$message.success("删除成功");
            if (this.tableData.length === 1 && this.pagination.pageNum > 1)
              this.pagination.pageNum -= 1;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || "删除失败");
          }
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped lang="scss">
.list-wrapper {
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

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}

.editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

::v-deep .editor-wrapper .ql-toolbar.ql-snow {
  border: none;
  border-bottom: 1px solid #ebeef5;
}

::v-deep .editor-wrapper .ql-container.ql-snow {
  border: none;
  min-height: 180px;
}

::v-deep .editor-wrapper .ql-editor {
  min-height: 180px;
  font-size: 14px;
  line-height: 1.6;
}

.threshold-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.threshold-label {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  flex-shrink: 0;
}

.threshold-input {
  width: 200px;
}

/* 关联奖品多行配置 */
.prize-rows {
  width: 100%;
}

.prize-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.prize-add-btn {
  font-size: 22px;
  color: #409eff;
  cursor: pointer;
  flex-shrink: 0;
  &:hover {
    color: #66b1ff;
  }
}

.prize-remove-btn {
  font-size: 22px;
  color: #f56c6c;
  cursor: pointer;
  flex-shrink: 0;
  &:hover {
    color: #ff4d4f;
  }
}
</style>
