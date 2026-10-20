<template>
  <div class="list-wrapper">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :label-width="'96px'"
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
          >新增</el-button
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
          <el-table-column
            prop="id"
            label="奖品ID"
            min-width="120"
          ></el-table-column>
          <el-table-column
            prop="prizeName"
            label="奖品名称"
            min-width="140"
            show-overflow-tooltip
          ></el-table-column>
          <el-table-column prop="futureCoinType" label="未来币类型" width="120">
            <template slot-scope="{ row }">
              {{ getFutureCoinTypeText(row.futureCoinType) }}
            </template>
          </el-table-column>
          <el-table-column prop="prizeSource" label="奖品属性" width="120">
            <template slot-scope="{ row }">
              {{ getPrizeSourceText(row.prizeSource) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="activityLinked"
            label="是否关联活动"
            width="120"
          >
            <template slot-scope="{ row }">
              <el-tag
                :type="row.activityLinked === '1' ? 'success' : 'info'"
                size="small"
              >
                {{ row.activityLinked === "1" ? "已关联" : "未关联" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="未来币面值" width="120">
            <template slot-scope="{ row }">
              <template v-if="Number(row.futureCoinType) === 1">
                {{ row.futureCoinFaceValue || "-" }} 币
              </template>
              <template v-else-if="Number(row.futureCoinType) === 2">
                {{ row.futureCoinPercentValue || "-" }}%
              </template>
              <template v-else>-</template>
            </template>
          </el-table-column>
          <el-table-column prop="totalStock" label="上限份数" width="100">
            <template slot-scope="{ row }">
              {{ row.totalStock || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人" width="120">
            <template slot-scope="{ row }">
              {{ row.operatorName || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="operateTime" label="操作时间" width="180">
            <template slot-scope="{ row }">
              {{ row.operateTime || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180">
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
      width="560px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="coinForm"
        :model="form"
        :rules="formRules"
        label-width="120px"
        :validate-on-rule-change="false"
      >
        <el-form-item label="奖品名称" prop="prizeName">
          <el-input
            v-model="form.prizeName"
            placeholder="请输入奖品名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="奖品属性" prop="prizeSource">
          <el-select
            v-model="form.prizeSource"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option label="活动奖品" value="1"></el-option>
            <!-- <el-option label="人工发放奖品" value="2"></el-option> -->
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="futureCoinType">
          <el-radio-group v-model="form.futureCoinType">
            <el-radio :label="1">固定值</el-radio>
            <el-radio :label="2">百分比</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="form.futureCoinType === 1"
          label="未来币面值"
          prop="futureCoinFaceValue"
        >
          <div class="unit-input-wrap">
            <el-input
              v-model="form.futureCoinFaceValue"
              class="unit-input"
              placeholder="请输入未来币面值"
              @input="sanitizePositiveInt('futureCoinFaceValue')"
            />
            <span class="unit-input-suffix">币</span>
          </div>
        </el-form-item>
        <el-form-item
          v-if="form.futureCoinType === 2"
          label="百分比值"
          prop="futureCoinPercentValue"
        >
          <div class="unit-input-wrap">
            <el-input
              v-model="form.futureCoinPercentValue"
              class="unit-input"
              placeholder="请输入百分比"
              @input="sanitizePositiveInt('futureCoinPercentValue')"
            />
            <span class="unit-input-suffix">%</span>
          </div>
        </el-form-item>
        <el-form-item label="数量" prop="totalStock">
          <div class="unit-input-wrap">
            <el-input
              v-model="form.totalStock"
              class="unit-input"
              placeholder="请输入数量"
              @input="sanitizePositiveInt('totalStock')"
            />
            <span class="unit-input-suffix">份</span>
          </div>
        </el-form-item>
        <el-form-item label="上传凭证图片">
          <div class="voucher-upload">
            <div
              v-for="(img, idx) in form.voucherPreviewUrls"
              :key="idx"
              class="voucher-img-wrap"
            >
              <img
                :src="img"
                class="voucher-img"
                @click="previewVoucherImg(idx)"
              />
              <i
                class="el-icon-close voucher-remove"
                @click="removeVoucherImg(idx)"
              ></i>
            </div>
            <div
              v-if="form.voucherPreviewUrls.length < 1"
              class="voucher-add"
              @click="triggerVoucherUpload"
            >
              <i class="el-icon-plus"></i>
            </div>
          </div>
          <div class="form-tip">支持JPG、PNG格式，最多上传1张</div>
          <input
            ref="voucherInput"
            type="file"
            accept="image/jpeg,image/png"
            style="display: none"
            @change="handleVoucherChange"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm"
          >确定</el-button
        >
      </div>
    </el-dialog>

    <!-- 凭证图片预览 -->
    <ImgZoom v-model="voucherPreviewVisible" :img-list="[voucherPreviewUrl]" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import {
  OperationPrizeList,
  OperationPrizeDetail,
  deleteRechargeConfig,
  createPrize,
  updatePrize,
} from "@/api/prize";
import { fileUpload } from "@/api/user";

const EMPTY_FORM = {
  id: null,
  prizeName: "",
  clientName: "",
  prizeSource: "",
  futureCoinType: 1,
  futureCoinFaceValue: "",
  futureCoinPercentValue: "",
  totalStock: "",
  voucherImgs: "",
  voucherPreviewUrls: [],
};

export default {
  name: "FutureCoinTab",
  components: { SearchForm, PaginationSimple, ImgZoom },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "prizeId",
          label: "奖品ID",
          inputType: "integer",
          placeholder: "请输入奖品ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "prizeName",
          label: "奖品名称",
          placeholder: "请输入奖品名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "prizeSource",
          label: "奖品属性",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "活动奖品", value: "1" },
            { label: "人工发放奖品", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "activityLinked",
          label: "是否关联活动",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "已关联", value: "1" },
            { label: "未关联", value: "0" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "futureCoinType",
          label: "未来币类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "固定值", value: 1 },
            { label: "百分比", value: 2 },
          ],
          clearable: true,
        },
      ],
      filterForm: {
        prizeId: "",
        prizeName: "",
        prizeSource: "",
        activityLinked: "",
        futureCoinType: "",
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      dialogVisible: false,
      dialogTitle: "新增奖品",
      isEdit: false,
      submitLoading: false,
      form: { ...EMPTY_FORM },
      uploadingIds: [],
      voucherPreviewVisible: false,
      voucherPreviewUrl: "",
    };
  },

  computed: {
    formRules() {
      return {
        prizeName: [
          { required: true, message: "请输入奖品名称", trigger: "blur" },
          { max: 50, message: "最多50个字", trigger: "blur" },
        ],
        prizeSource: [
          { required: true, message: "请选择奖品属性", trigger: "change" },
        ],
        futureCoinType: [
          { required: true, message: "请选择类型", trigger: "change" },
        ],
        futureCoinFaceValue: [
          { required: true, message: "请输入未来币面值", trigger: "blur" },
          { validator: this.validatePositiveInt, trigger: "blur" },
        ],
        futureCoinPercentValue: [
          { required: true, message: "请输入百分比值", trigger: "blur" },
          { validator: this.validatePositiveInt, trigger: "blur" },
        ],
        totalStock: [
          { required: true, message: "请输入上限份数", trigger: "blur" },
          { validator: this.validatePositiveInt, trigger: "blur" },
        ],
      };
    },
  },

  mounted() {
    this.fetchTableData();
  },

  methods: {
    sanitizePositiveInt(field) {
      const val = this.form[field];
      if (val === "" || val === null || val === undefined) return;
      const cleaned = String(val).replace(/[^\d]/g, "");
      this.$set(this.form, field, cleaned);
    },

    validatePositiveInt(rule, value, callback) {
      if (value === "" || value === null || value === undefined) {
        callback(new Error(rule.message || "请输入正整数"));
        return;
      }
      const num = Number(value);
      if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
        callback(new Error("必须为正整数"));
        return;
      }
      callback();
    },

    getPrizeSourceText(source) {
      const map = { 1: "活动奖品", 2: "人工发放奖品" };
      return map[String(source)] || "-";
    },
    getFutureCoinTypeText(type) {
      const map = { 1: "固定值", 2: "百分比" };
      return map[type] || "-";
    },
    buildQueryParams() {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        prizeCategory: 2,
      };
      if (this.filterForm.prizeId) p.prizeId = this.filterForm.prizeId;
      if (this.filterForm.prizeName) p.prizeName = this.filterForm.prizeName;
      if (this.filterForm.prizeSource)
        p.prizeSource = this.filterForm.prizeSource;
      if (this.filterForm.activityLinked)
        p.activityLinked = this.filterForm.activityLinked;
      if (
        this.filterForm.futureCoinType !== "" &&
        this.filterForm.futureCoinType != null
      ) {
        p.futureCoinType = Number(this.filterForm.futureCoinType);
      }
      console.log("查询参数：", p);
      return p;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await OperationPrizeList(this.buildQueryParams());
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
        this.$message.error("获取未来币列表失败");
      } finally {
        this.loading = false;
      }
    },

    handleSearch(params) {
      this.filterForm = { ...params };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.filterForm = {
        prizeId: "",
        prizeName: "",
        prizeSource: "",
        activityLinked: "",
        futureCoinType: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },

    handleAdd() {
      this.isEdit = false;
      this.dialogTitle = "新增奖品";
      this.form = { ...EMPTY_FORM };
      this.uploadingIds = [];
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.coinForm) this.$refs.coinForm.clearValidate();
      });
    },

    async handleEdit(row) {
      this.isEdit = true;
      this.dialogTitle = "编辑奖品";
      this.submitLoading = true;
      this.dialogVisible = true;
      try {
        const res = await OperationPrizeDetail({ id: row.id });
        if (res.success && res.data) {
          const d = res.data;
          this.form = {
            id: d.id,
            prizeName: d.prizeName || "",
            clientName: d.prizeName || "",
            prizeSource: String(d.prizeSource || "1"),
            futureCoinType: Number(d.futureCoinType) || 1,
            futureCoinFaceValue:
              d.futureCoinFaceValue != null
                ? String(d.futureCoinFaceValue)
                : "",
            futureCoinPercentValue:
              d.futureCoinPercentValue != null
                ? String(d.futureCoinPercentValue)
                : "",
            totalStock: d.totalStock != null ? String(d.totalStock) : "",
            voucherImgs: d.voucherImgs || "",
            voucherPreviewUrls: d.voucherImgUrls
              ? d.voucherImgUrls.split(",").filter(Boolean)
              : [],
          };
          this.uploadingIds = this.form.voucherImgs
            ? this.form.voucherImgs.split(",").filter(Boolean)
            : [];
          this.$nextTick(() => {
            if (this.$refs.coinForm) this.$refs.coinForm.clearValidate();
          });
        } else {
          this.$message.error(res.errorMessage || "获取详情失败");
          this.dialogVisible = false;
        }
      } catch {
        this.$message.error("获取详情失败");
        this.dialogVisible = false;
      } finally {
        this.submitLoading = false;
      }
    },

    handleDialogClose() {
      this.form = { ...EMPTY_FORM, voucherPreviewUrls: [] };
      this.uploadingIds = [];
      this.$nextTick(() => {
        if (this.$refs.coinForm) this.$refs.coinForm.clearValidate();
      });
    },

    triggerVoucherUpload() {
      this.$refs.voucherInput && this.$refs.voucherInput.click();
    },

    async handleVoucherChange(e) {
      const file = e.target.files && e.target.files[0];
      this.$refs.voucherInput.value = "";
      if (!file) return;
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        this.$message.error("仅支持JPG、PNG格式");
        return;
      }
      if (file.size / 1024 / 1024 > 10) {
        this.$message.error("图片不能超过10MB");
        return;
      }
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fileUpload(fd);
        if (res.code === 200 && res.data && res.data.ossId) {
          this.uploadingIds.push(res.data.ossId);
          this.form.voucherPreviewUrls.push(URL.createObjectURL(file));
        } else {
          this.$message.error(res.message || "上传失败");
        }
      } catch {
        this.$message.error("上传失败");
      }
    },

    removeVoucherImg(idx) {
      this.form.voucherPreviewUrls.splice(idx, 1);
      this.uploadingIds.splice(idx, 1);
    },

    previewVoucherImg(idx) {
      if (this.form.voucherPreviewUrls[idx]) {
        this.voucherPreviewUrl = this.form.voucherPreviewUrls[idx];
        this.voucherPreviewVisible = true;
      }
    },

    submitForm() {
      this.$refs.coinForm.validate(async (valid) => {
        if (!valid) return;
        this.submitLoading = true;
        try {
          const data = {
            prizeName: this.form.prizeName,
            clientName: this.form.prizeName,
            prizeSource: this.form.prizeSource,
            futureCoinType: this.form.futureCoinType,
            futureCoinFaceValue:
              this.form.futureCoinType === 1
                ? Number(this.form.futureCoinFaceValue) || 0
                : undefined,
            futureCoinPercentValue:
              this.form.futureCoinType === 2
                ? Number(this.form.futureCoinPercentValue) || 0
                : undefined,
            totalStock: Number(this.form.totalStock) || 0,
            prizeCategory: 2,
            voucherImgs: this.uploadingIds.join(","),
          };
          if (this.isEdit) data.id = this.form.id;

          const res = this.isEdit
            ? await updatePrize(data)
            : await createPrize(data);
          if (res.success) {
            this.$message.success(this.isEdit ? "编辑成功" : "新增成功");
            this.dialogVisible = false;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || "操作失败");
          }
        } finally {
          this.submitLoading = false;
        }
      });
    },

    handleDelete(row) {
      if (row.activityLinked === "1") {
        this.$message.error("奖品已关联活动，无法删除");
        return;
      }
      this.$confirm("确认删除该奖品吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            const res = await deleteRechargeConfig({ ids: [row.id] });
            if (res.success) {
              this.$message.success("删除成功");
              if (this.tableData.length === 1 && this.pagination.pageNum > 1) {
                this.pagination.pageNum -= 1;
              }
              this.fetchTableData();
            } else {
              this.$message.error(res.errorMessage || "删除失败");
            }
          } catch {
            this.$message.error("删除失败");
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
  padding: 0;
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

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0;
}

.action-bar {
  flex-shrink: 0;
  margin-bottom: 20px;
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

.voucher-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.voucher-img-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

.voucher-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.voucher-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
}

.voucher-add {
  width: 80px;
  height: 80px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #999;
  font-size: 24px;
  transition: border-color 0.2s;

  &:hover {
    border-color: #9047f8;
    color: #9047f8;
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}

.unit-input-wrap {
  position: relative;
}

.unit-input-suffix {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  color: #909399;
  font-size: 14px;
  line-height: 1;
  pointer-events: none;
}

::v-deep .unit-input .el-input__inner {
  padding-right: 40px;
}

::v-deep .el-dialog {
  margin-top: 5vh !important;
}

/* Tab切换栏 */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.tab-item {
  font-size: 16px;
  font-weight: 500;
  color: #909399;
  cursor: pointer;
  padding-bottom: 10px;
  position: relative;
  transition: color 0.2s;
  user-select: none;

  &:hover {
    color: #9047f8;
  }

  &.active {
    color: #9047f8;
    font-weight: 600;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #9047f8;
      border-radius: 2px 2px 0 0;
    }
  }
}
</style>
