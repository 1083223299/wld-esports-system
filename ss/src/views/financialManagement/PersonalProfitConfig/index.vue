<template>
  <div class="container">
    <div class="hero-tabs" role="tablist">
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': activeTab === '1' }"
        role="tab"
        :aria-selected="activeTab === '1'"
        @click="handleTabChange('1')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-s-grid" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            通用游戏类型
            <em v-if="activeTab === '1'">当前</em>
          </div>
          <div class="hero-tab__desc">统一配置默认陪陪 / 平台分润比例</div>
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>

      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': activeTab === '2' }"
        role="tab"
        :aria-selected="activeTab === '2'"
        @click="handleTabChange('2')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-s-opportunity" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            特殊游戏类型
            <em v-if="activeTab === '2'">当前</em>
          </div>
          <div class="hero-tab__desc">按游戏 + 模式单独覆盖分润规则</div>
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
    </div>

    <!-- 通用 -->
    <el-card v-if="activeTab === '1'" class="list-card" shadow="never" v-loading="loading">
      <div class="action-bar-fixed">
        <el-button type="primary" class="add-btn" icon="el-icon-edit" @click="openGeneralDialog">
          {{ generalConfig ? "编辑" : "新增" }}
        </el-button>
      </div>

      <div v-if="generalConfig" class="general-panel">
        <div class="general-rate-card">
          <div class="rate-item">
            <div class="rate-label">陪陪分润比例</div>
            <div class="rate-value">{{ displayWaiter }}<span>%</span></div>
          </div>
          <div class="rate-split" />
          <div class="rate-item">
            <div class="rate-label">平台分润比例</div>
            <div class="rate-value is-platform">{{ displayPlatform }}<span>%</span></div>
          </div>
        </div>
        <div class="general-progress">
          <div class="general-progress__waiter" :style="{ width: displayWaiter + '%' }" />
          <div class="general-progress__platform" :style="{ width: displayPlatform + '%' }" />
        </div>
        <div class="general-tip">平台抽佣占比 = 100% − 陪陪分润比例，无需手工填写</div>
      </div>

      <div v-else class="empty-block">
        <i class="el-icon-document" />
        <p>暂无通用分润配置，请点击左上角新增</p>
      </div>
    </el-card>

    <!-- 特殊 -->
    <template v-else>
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        @search="handleSearch"
        @reset="handleReset"
      />
      <el-card class="list-card" shadow="never">
        <div class="action-bar-fixed">
          <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="openSpecialDialog()">
            新增
          </el-button>
        </div>
        <div class="table-scroll-container">
          <el-table
            :data="tableData"
            stripe
            row-key="profitId"
            v-loading="loading"
            :border="false"
            :header-row-style="{ backgroundColor: '#F6F6FB' }"
            :cell-style="{ textAlign: 'center' }"
            :header-cell-style="{ textAlign: 'center' }"
            height="100%"
          >
            <el-table-column prop="productName" label="游戏名称" min-width="140" show-overflow-tooltip />
            <el-table-column label="分润明细" min-width="460" align="left">
              <template slot-scope="{ row }">
                <div v-if="getModeList(row).length" class="profit-detail">
                  <div class="profit-detail__head">
                    <span>模式</span>
                    <span>陪陪</span>
                    <span>平台</span>
                  </div>
                  <div
                    v-for="(item, idx) in getModeList(row)"
                    :key="row.profitId + '-' + idx"
                    class="profit-detail__row"
                  >
                    <span class="profit-detail__mode" :title="item.name">{{ item.name }}</span>
                    <span class="profit-detail__waiter">{{ item.waiter }}%</span>
                    <span class="profit-detail__platform">{{ item.platform }}%</span>
                  </div>
                </div>
                <span v-else class="profit-detail__empty">--</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="140">
              <template slot-scope="{ row }">
                <el-button type="text" class="link-edit" @click="openSpecialDialog(row)">编辑</el-button>
                <el-button type="text" class="link-delete" @click="handleDelete(row)">删除</el-button>
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
    </template>

    <!-- 通用弹窗 -->
    <el-dialog
      :title="generalForm.profitId ? '编辑' : '新增'"
      :visible.sync="generalDialogVisible"
      width="480px"
      append-to-body
      :close-on-click-modal="false"
      @close="resetGeneralForm"
    >
      <el-form ref="generalFormRef" :model="generalForm" :rules="generalRules" label-width="120px">
        <el-form-item label="陪陪分润比例" prop="waiterRateProportion">
          <div class="percent-field" :class="{ 'is-focus': generalRateFocus }">
            <el-input
              v-model="generalForm.waiterRateProportion"
              placeholder="请输入分润比例"
              @input="onGeneralRateInput"
              @focus="generalRateFocus = true"
              @blur="generalRateFocus = false"
            />
            <span class="percent-field__unit">%</span>
          </div>
        </el-form-item>
      </el-form>
      <div v-if="previewWaiter > 0 && previewWaiter <= 100" class="preview-line">
        平台分润比例将自动为 <b>{{ previewPlatform }}%</b>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="generalDialogVisible = false">取消</el-button>
        <el-button type="primary" class="submit-btn" :loading="submitting" @click="submitGeneral">提交</el-button>
      </div>
    </el-dialog>

    <SpecialProfitDialog
      :visible.sync="specialDialogVisible"
      v-model="specialForm"
      :loading="productLoading || modeLoading"
      :submitting="submitting"
      :product-loading="productLoading"
      :mode-loading="modeLoading"
      :product-options="productOptions"
      :occupied-product-ids="occupiedProductIds"
      :mode-options="modeOptions"
      @product-change="handleProductChange"
      @close="resetSpecialForm"
      @submit="submitSpecial"
    />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import SpecialProfitDialog from "@/components/SpecialProfitDialog/index.vue";
import { productSelect } from "@/api/goodsList";
import { productFieldRelationList } from "@/api/goodsAreaRelation";
import {
  getProfitSharingRateList,
  getProfitSharingRateDetail,
  addProfitSharingRate,
  updateProfitSharingRate,
  deleteProfitSharingRate,
} from "@/api/profitSharingRate";

let rowSeed = 1;
const createModeRow = (payload = {}) => ({
  _key: `mode-${Date.now()}-${rowSeed++}`,
  specialId: payload.specialId ? String(payload.specialId) : "",
  relationId: payload.relationId ? String(payload.relationId) : "",
  relationName: payload.relationName || "",
  waiterRateProportion:
    payload.waiterRateProportion !== undefined && payload.waiterRateProportion !== null
      ? String(payload.waiterRateProportion)
      : "",
});

/**
 * 比例展示换算
 * - 通用分润：接口直接返回百分数（如 0.5、99.5），原样展示
 * - 特殊分润：可能是小数（0.30+0.70≈1）或百分数（30+70≈100），按配对和自动识别
 */
const toDisplayPercent = (value, options = {}) => {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  const mode = options.mode || "auto";
  let asDecimal = mode === "decimal";

  if (mode === "auto") {
    const pairSum = Number(options.pairSum);
    // 两项之和接近 1 → 小数比例（如 0.3 / 0.7）
    if (Number.isFinite(pairSum) && pairSum > 0 && Math.abs(pairSum - 1) < 0.011) {
      asDecimal = true;
    } else if (options.preferDecimal && n >= 0 && n <= 1) {
      asDecimal = true;
    }
    // 否则按百分数原样（含 0.5% 这种小于 1 的百分数）
  }

  const percent = asDecimal ? n * 100 : n;
  return String(Number(percent.toFixed(2)));
};

/** 计算一组比例的配对和，供 toDisplayPercent 识别小数/百分数 */
const calcPairSum = (waiter, platform) => {
  const w = Number(waiter);
  const p = Number(platform);
  const hasW = Number.isFinite(w);
  const hasP =
    platform !== null &&
    platform !== undefined &&
    platform !== "" &&
    Number.isFinite(p);
  if (!hasW && !hasP) return null;
  return (hasW ? w : 0) + (hasP ? p : 0);
};

const rateValidator = (rule, value, callback) => {
  if (value === "" || value === null || value === undefined) {
    callback(new Error("请输入陪陪分润比例"));
    return;
  }
  if (!/^\d+(\.\d+)?$/.test(String(value))) {
    callback(new Error("仅支持正数"));
    return;
  }
  const num = Number(value);
  if (!(num > 0 && num <= 100)) {
    callback(new Error("取值范围为 0 < 比例 ≤ 100"));
    return;
  }
  callback();
};

export default {
  name: "PersonalProfitConfig",
  components: { SearchForm, PaginationSimple, SpecialProfitDialog },
  data() {
    return {
      activeTab: "1",
      loading: false,
      submitting: false,
      generalConfig: null,
      tableData: [],
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      filterForm: { productName: "" },
      searchItems: [
        {
          type: "input",
          prop: "productName",
          label: "游戏名称",
          placeholder: "请输入游戏名称",
          clearable: true,
        },
      ],
      generalDialogVisible: false,
      generalForm: { profitId: "", waiterRateProportion: "" },
      generalRateFocus: false,
      generalRules: {
        waiterRateProportion: [{ required: true, validator: rateValidator, trigger: "blur" }],
      },
      specialDialogVisible: false,
      specialForm: {
        profitId: "",
        productId: "",
        modeRows: [createModeRow()],
      },
      productOptions: [],
      productLoading: false,
      modeOptions: [],
      modeLoading: false,
    };
  },
  computed: {
    displayWaiter() {
      // 通用：接口已是百分数，如 0.5 → 0.5%
      const n = Number(
        toDisplayPercent(this.generalConfig && this.generalConfig.waiterRateProportion, {
          mode: "percent",
        })
      );
      return Number.isFinite(n) ? n : 0;
    },
    displayPlatform() {
      if (!this.generalConfig) return 0;
      if (
        this.generalConfig.platformRateProportion !== null &&
        this.generalConfig.platformRateProportion !== undefined &&
        this.generalConfig.platformRateProportion !== ""
      ) {
        const n = Number(
          toDisplayPercent(this.generalConfig.platformRateProportion, { mode: "percent" })
        );
        return Number.isFinite(n) ? n : 0;
      }
      return Number((100 - this.displayWaiter).toFixed(2));
    },
    previewWaiter() {
      const n = Number(this.generalForm.waiterRateProportion);
      return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
    },
    previewPlatform() {
      if (!(this.previewWaiter > 0 && this.previewWaiter <= 100)) return 0;
      return Number((100 - this.previewWaiter).toFixed(2));
    },
    occupiedProductIds() {
      return (this.tableData || [])
        .filter((row) => {
          if (!this.specialForm.profitId) return true;
          return String(row.profitId) !== String(this.specialForm.profitId);
        })
        .map((row) => String(row.productId))
        .filter(Boolean);
    },
  },
  created() {
    this.fetchList();
  },
  methods: {
    handleTabChange(tab) {
      if (this.activeTab === tab) return;
      this.activeTab = tab;
      this.pagination.pageNum = 1;
      this.filterForm = { productName: "" };
      this.fetchList();
    },
    getModeList(row) {
      const list = Array.isArray(row && row.specialProfitSharingVoList)
        ? row.specialProfitSharingVoList
        : [];
      return list.map((item, index) => {
        const pairSum = calcPairSum(item.waiterRateProportion, item.platformRateProportion);
        const hasPlatform =
          item.platformRateProportion !== null &&
          item.platformRateProportion !== undefined &&
          item.platformRateProportion !== "";
        const waiter = Number(
          toDisplayPercent(item.waiterRateProportion, {
            pairSum,
            preferDecimal: !hasPlatform,
          })
        );
        const platform = hasPlatform
          ? Number(
              toDisplayPercent(item.platformRateProportion, {
                pairSum,
              })
            )
          : Number((100 - (Number.isFinite(waiter) ? waiter : 0)).toFixed(2));
        return {
          name: item.relationName || `模式${index + 1}`,
          waiter: Number.isFinite(waiter) ? waiter : "--",
          platform: Number.isFinite(platform) ? platform : "--",
        };
      });
    },
    /** 统一解析列表响应：拦截器后结构为 { success, data: { rows, total, code }, code } */
    parseListResponse(res) {
      if (!res) {
        return { ok: false, rows: [], total: 0 };
      }
      const page = res.data && typeof res.data === "object" ? res.data : res;
      const rows = Array.isArray(page.rows)
        ? page.rows
        : Array.isArray(page.list)
          ? page.list
          : Array.isArray(page)
            ? page
            : [];
      const total = Number(
        page.total !== undefined && page.total !== null
          ? page.total
          : res.total !== undefined
            ? res.total
            : rows.length
      );
      const ok =
        res.success === true ||
        res.code == 200 ||
        page.code == 200 ||
        rows.length > 0;
      return { ok, rows, total: Number.isFinite(total) ? total : rows.length };
    },
    sanitizeRate(value) {
      return String(value || "")
        .replace(/[^\d.]/g, "")
        .replace(/^\./, "")
        .replace(/(\..*)\./g, "$1");
    },
    onGeneralRateInput() {
      this.generalForm.waiterRateProportion = this.sanitizeRate(this.generalForm.waiterRateProportion);
    },
    async fetchList() {
      this.loading = true;
      try {
        const params = {
          type: this.activeTab,
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
        };
        if (this.activeTab === "2" && this.filterForm.productName) {
          params.productName = this.filterForm.productName;
        }
        const res = await getProfitSharingRateList(params);
        const { ok, rows, total } = this.parseListResponse(res);
        if (!ok && !(res && (res.success || res.code == 200))) {
          this.generalConfig = null;
          this.tableData = [];
          this.pagination.total = 0;
          this.$message.error((res && (res.errorMessage || res.msg)) || "获取数据失败");
          return;
        }
        this.pagination.total = total;
        if (this.activeTab === "1") {
          // 通用：取第一条 type=1 配置
          this.generalConfig =
            rows.find((item) => String(item.type) === "1") || rows[0] || null;
          this.tableData = [];
        } else {
          this.tableData = rows.filter((item) => String(item.type) === "2" || item.type == null);
          if (!this.tableData.length && rows.length) {
            this.tableData = rows;
          }
        }
      } catch (error) {
        console.error("获取分润配置失败:", error);
        this.generalConfig = null;
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取数据失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },
    handleSearch(e) {
      this.filterForm = { productName: (e && e.productName) || "" };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleReset() {
      this.filterForm = { productName: "" };
      this.pagination.pageNum = 1;
      this.fetchList();
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchList();
    },
    /** 详情接口解包：拦截器后为 { success, data: {...}, code } */
    parseDetailResponse(res) {
      if (!res) return null;
      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        if (
          res.data.profitId ||
          res.data.productId ||
          Array.isArray(res.data.specialProfitSharingVoList)
        ) {
          return res.data;
        }
      }
      if (res.profitId || res.productId || Array.isArray(res.specialProfitSharingVoList)) {
        return res;
      }
      return null;
    },
    /** 用详情里的 relationName 补全/覆盖模式选项，保证下拉能回显 */
    mergeModeOptionsFromDetail(list) {
      const map = new Map(
        (this.modeOptions || []).map((opt) => [String(opt.id), { ...opt }])
      );
      (list || []).forEach((item) => {
        if (!item || item.relationId == null || item.relationId === "") return;
        const id = String(item.relationId);
        const name = item.relationName || (map.get(id) && map.get(id).fieldName) || id;
        map.set(id, { id, fieldName: name });
      });
      this.modeOptions = Array.from(map.values());
    },
    async openGeneralDialog() {
      if (!this.generalConfig || !this.generalConfig.profitId) {
        this.generalForm = { profitId: "", waiterRateProportion: "" };
        this.generalDialogVisible = true;
        this.$nextTick(() => {
          if (this.$refs.generalFormRef) this.$refs.generalFormRef.clearValidate();
        });
        return;
      }
      this.loading = true;
      try {
        const res = await getProfitSharingRateDetail(this.generalConfig.profitId);
        const detail = this.parseDetailResponse(res);
        if (!detail) {
          this.$message.error((res && (res.errorMessage || res.msg)) || "获取详情失败");
          return;
        }
        this.generalForm = {
          profitId: detail.profitId || this.generalConfig.profitId,
          // 通用详情已是百分数
          waiterRateProportion: toDisplayPercent(detail.waiterRateProportion, { mode: "percent" }),
        };
        this.generalDialogVisible = true;
        this.$nextTick(() => {
          if (this.$refs.generalFormRef) this.$refs.generalFormRef.clearValidate();
        });
      } catch (error) {
        console.error("获取通用分润详情失败:", error);
        this.$message.error("获取详情失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },
    resetGeneralForm() {
      this.generalForm = { profitId: "", waiterRateProportion: "" };
      if (this.$refs.generalFormRef) this.$refs.generalFormRef.clearValidate();
    },
    submitGeneral() {
      this.$refs.generalFormRef.validate(async (valid) => {
        if (!valid) return;
        this.submitting = true;
        try {
          let res;
          if (this.generalForm.profitId) {
            res = await updateProfitSharingRate({
              profitId: this.generalForm.profitId,
              waiterRateProportion: String(this.generalForm.waiterRateProportion),
            });
          } else {
            res = await addProfitSharingRate({
              type: "1",
              waiterRateProportion: String(this.generalForm.waiterRateProportion),
            });
          }
          if (res.code == 200) {
            this.$message.success(this.generalForm.profitId ? "编辑成功" : "新增成功");
            this.generalDialogVisible = false;
            this.fetchList();
          } else {
            this.$message.error(res.msg || res.errorMessage || "操作失败");
          }
        } catch (error) {
          console.error("提交通用分润失败:", error);
        } finally {
          this.submitting = false;
        }
      });
    },
    async fetchProductOptions() {
      this.productLoading = true;
      try {
        const res = await productSelect({ pageNum: 1, pageSize: 999, status: "1" });
        if (res.code == 200) {
          this.productOptions = Array.isArray(res.data) ? res.data : (res.data && res.data.rows) || [];
        }
      } catch (error) {
        console.error("获取游戏列表失败:", error);
      } finally {
        this.productLoading = false;
      }
    },
    async fetchModeOptions(productId) {
      if (!productId) {
        this.modeOptions = [];
        return;
      }
      this.modeLoading = true;
      try {
        const res = await productFieldRelationList({
          productId,
          businessType: "1",
          moduleType: "6",
        });
        const list = (res.success && res.data) || res.data || [];
        const rows = Array.isArray(list) ? list : [];
        this.modeOptions = rows
          .filter((item) => item.parentId === 0 || item.parentId === "0" || item.parentId == null)
          .map((item) => ({
            id: String(item.id),
            fieldName: item.fieldName,
          }));
      } catch (error) {
        console.error("获取游戏模式失败:", error);
        this.modeOptions = [];
        this.$message.error("获取游戏模式失败");
      } finally {
        this.modeLoading = false;
      }
    },
    async openSpecialDialog(row) {
      await this.fetchProductOptions();
      if (!row || !row.profitId) {
        this.specialForm = {
          profitId: "",
          productId: "",
          modeRows: [createModeRow()],
        };
        this.modeOptions = [];
        this.specialDialogVisible = true;
        return;
      }
      this.loading = true;
      try {
        const res = await getProfitSharingRateDetail(row.profitId);
        const detail = this.parseDetailResponse(res);
        if (!detail) {
          this.$message.error((res && (res.errorMessage || res.msg)) || "获取详情失败");
          return;
        }
        const list = Array.isArray(detail.specialProfitSharingVoList)
          ? detail.specialProfitSharingVoList
          : [];
        this.specialForm = {
          profitId: detail.profitId || row.profitId,
          productId: detail.productId ? String(detail.productId) : "",
          modeRows: list.length
            ? list.map((item) => {
                const pairSum = calcPairSum(
                  item.waiterRateProportion,
                  item.platformRateProportion
                );
                return createModeRow({
                  specialId: item.specialId,
                  relationId: item.relationId,
                  relationName: item.relationName,
                  // 小数(0.30) → 30；百分数(30 / 0.5) 原样
                  waiterRateProportion: toDisplayPercent(item.waiterRateProportion, {
                    pairSum,
                    preferDecimal: true,
                  }),
                });
              })
            : [createModeRow()],
        };
        await this.fetchModeOptions(this.specialForm.productId);
        this.mergeModeOptionsFromDetail(list);
        this.specialDialogVisible = true;
      } catch (error) {
        console.error("获取特殊分润详情失败:", error);
        this.$message.error("获取详情失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },
    resetSpecialForm() {
      this.specialForm = {
        profitId: "",
        productId: "",
        modeRows: [createModeRow()],
      };
      this.modeOptions = [];
    },
    async handleProductChange(productId) {
      this.specialForm = {
        ...this.specialForm,
        productId: productId ? String(productId) : "",
        modeRows: [createModeRow()],
      };
      await this.fetchModeOptions(productId);
    },
    /** 同一游戏只能有一条特殊分润配置 */
    isProductDuplicated(productId, excludeProfitId) {
      return this.tableData.some((row) => {
        if (excludeProfitId && String(row.profitId) === String(excludeProfitId)) return false;
        return String(row.productId) === String(productId);
      });
    },
    isModeDuplicatedInList(productId, relationIds, excludeProfitId) {
      const idSet = new Set(relationIds.map(String));
      return this.tableData.some((row) => {
        if (excludeProfitId && String(row.profitId) === String(excludeProfitId)) return false;
        if (String(row.productId) !== String(productId)) return false;
        const existing = (row.specialProfitSharingVoList || []).map((item) => String(item.relationId));
        return existing.some((id) => idSet.has(id));
      });
    },
    async submitSpecial(payload) {
      const { profitId, productId, modeRows } = payload || this.specialForm;
      if (this.isProductDuplicated(productId, profitId)) {
        this.$message.warning("该游戏已配置特殊分润，不可重复");
        return;
      }
      const relationIds = modeRows.map((row) => String(row.relationId));
      if (new Set(relationIds).size !== relationIds.length) {
        this.$message.warning("游戏模式不可重复");
        return;
      }
      if (this.isModeDuplicatedInList(productId, relationIds, profitId)) {
        this.$message.warning("该游戏下已存在相同模式配置");
        return;
      }
      // 提交百分数（如 30），接口入库会存成小数（如 0.30）；编辑带上 specialId
      const specialProfitSharingBos = modeRows.map((row) => {
        const item = {
          relationId: String(row.relationId),
          waiterRateProportion: String(row.waiterRateProportion),
        };
        if (row.specialId) item.specialId = String(row.specialId);
        return item;
      });
      this.submitting = true;
      try {
        let res;
        if (profitId) {
          res = await updateProfitSharingRate({
            profitId,
            productId,
            specialProfitSharingBos,
          });
        } else {
          res = await addProfitSharingRate({
            type: "2",
            productId,
            specialProfitSharingBos,
          });
        }
        if (res.code == 200) {
          this.$message.success(profitId ? "编辑成功" : "新增成功");
          this.specialDialogVisible = false;
          this.fetchList();
        } else {
          this.$message.error(res.msg || res.errorMessage || "操作失败");
        }
      } catch (error) {
        console.error("提交特殊分润失败:", error);
      } finally {
        this.submitting = false;
      }
    },
    handleDelete(row) {
      this.$confirm(`确认删除「${row.productName || "该配置"}」的特殊分润吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            const res = await deleteProfitSharingRate(row.profitId);
            if (res.code == 200) {
              this.$message.success("删除成功");
              if (this.tableData.length === 1 && this.pagination.pageNum > 1) {
                this.pagination.pageNum -= 1;
              }
              this.fetchList();
            } else {
              this.$message.error(res.msg || res.errorMessage || "删除失败");
            }
          } catch (error) {
            console.error("删除分润配置失败:", error);
          }
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped>
.container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.hero-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 16px;
  flex-shrink: 0;
}

.hero-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 12px 16px;
  border: 1px solid #ece8f8;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 244, 255, 0.96)),
    #fff;
  box-shadow: 0 8px 20px rgba(74, 45, 140, 0.05);
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  outline: none;
}

.hero-tab::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: transparent;
  transition: background 0.25s ease;
}

.hero-tab:hover {
  transform: translateY(-1px);
  border-color: rgba(106, 53, 255, 0.28);
  box-shadow: 0 10px 24px rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, #6a35ff 0%, #9047f8 55%, #7b3dff 100%);
  box-shadow:
    0 12px 26px rgba(106, 53, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.hero-tab.is-active::before {
  background: rgba(255, 255, 255, 0.55);
}

.hero-tab.is-active::after {
  content: "";
  position: absolute;
  right: -36px;
  top: -36px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 68%);
  pointer-events: none;
}

.hero-tab__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 18px;
  color: #6a35ff;
  background: rgba(106, 53, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(106, 53, 255, 0.08);
  transition: all 0.25s ease;
}

.hero-tab.is-active .hero-tab__icon {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.hero-tab__body {
  flex: 1;
  min-width: 0;
}

.hero-tab__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.hero-tab__title em {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.hero-tab.is-active .hero-tab__title {
  color: #fff;
}

.hero-tab__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.hero-tab.is-active .hero-tab__desc {
  color: rgba(255, 255, 255, 0.82);
}

.hero-tab__arrow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #c0c4cc;
  background: #f5f5f8;
  transition: all 0.25s ease;
  flex-shrink: 0;
  font-size: 12px;
}

.hero-tab:hover .hero-tab__arrow {
  color: #6a35ff;
  background: rgba(106, 53, 255, 0.1);
}

.hero-tab.is-active .hero-tab__arrow {
  color: #6a35ff;
  background: #fff;
  transform: translateX(2px);
}

@media (max-width: 900px) {
  .hero-tabs {
    grid-template-columns: 1fr;
  }
}

.list-card {
  border-radius: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

::v-deep .el-card__body {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
}

.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

.add-btn {
  background: #6a35ff;
  border-color: #6a35ff;
  border-radius: 8px;
  min-width: 96px;
}

.add-btn:hover,
.add-btn:focus {
  background: #7b4dff;
  border-color: #7b4dff;
}

.submit-btn {
  background: #6a35ff;
  border-color: #6a35ff;
}

.submit-btn:hover,
.submit-btn:focus {
  background: #7b4dff;
  border-color: #7b4dff;
}

.general-panel {
  flex: 1;
  min-height: 0;
}

.general-rate-card {
  display: flex;
  align-items: stretch;
  max-width: 560px;
  border: 1px solid #ececf5;
  border-radius: 16px;
  background: #faf9ff;
  overflow: hidden;
}

.rate-item {
  flex: 1;
  padding: 28px 24px;
}

.rate-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 12px;
}

.rate-value {
  font-size: 36px;
  font-weight: 700;
  color: #6a35ff;
  line-height: 1;
}

.rate-value span {
  font-size: 16px;
  margin-left: 2px;
}

.rate-value.is-platform {
  color: #303133;
}

.rate-split {
  width: 1px;
  background: #ececf5;
  margin: 16px 0;
}

.general-progress {
  display: flex;
  max-width: 560px;
  height: 8px;
  margin-top: 16px;
  border-radius: 999px;
  overflow: hidden;
  background: #f0f0f5;
}

.general-progress__waiter {
  background: #6a35ff;
  transition: width 0.35s ease;
}

.general-progress__platform {
  background: #d9d5f0;
  transition: width 0.35s ease;
}

.general-tip {
  margin-top: 14px;
  font-size: 13px;
  color: #909399;
}

.empty-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 8px;
}

.empty-block i {
  font-size: 28px;
}

.table-scroll-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.pagination-fixed {
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.profit-detail {
  display: inline-block;
  min-width: 360px;
  max-width: 100%;
  text-align: left;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.profit-detail__head,
.profit-detail__row {
  display: grid;
  grid-template-columns: minmax(100px, 1.4fr) 88px 88px;
  align-items: center;
  column-gap: 8px;
  padding: 0 12px;
}

.profit-detail__head {
  height: 32px;
  background: #f6f6fb;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
}

.profit-detail__row {
  min-height: 34px;
  font-size: 13px;
  color: #303133;
  border-top: 1px solid #f0f2f5;
}

.profit-detail__row:nth-child(odd) {
  background: #fafafa;
}

.profit-detail__mode {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.profit-detail__waiter,
.profit-detail__platform {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.profit-detail__waiter {
  color: #6a35ff;
}

.profit-detail__platform {
  color: #606266;
}

.profit-detail__empty {
  color: #909399;
}

.link-edit {
  color: #9047f8 !important;
}

.link-delete {
  color: #d63d28 !important;
}

.preview-line {
  margin: -4px 0 0 120px;
  font-size: 13px;
  color: #909399;
}

.preview-line b {
  color: #6a35ff;
}

::v-deep .el-form-item__content {
  line-height: normal;
}

::v-deep .el-form-item__content > .percent-field {
  max-width: 100%;
}

/* 自定义 % 字段：一体边框，% 为内部文字 */
.percent-field {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
  height: 40px;
  border: 1px solid #e2e8f2;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.percent-field.is-focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.percent-field ::v-deep .el-input {
  flex: 1 1 0;
  width: auto !important;
  min-width: 0 !important;
}

.percent-field ::v-deep .el-input__inner {
  width: 100% !important;
  height: 38px !important;
  line-height: 38px !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding-right: 4px !important;
}

.percent-field__unit {
  flex: 0 0 auto;
  padding: 0 12px 0 4px;
  color: #909399;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.dialog-footer {
  text-align: right;
}
</style>
