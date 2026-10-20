<template>
  <div class="list-wrapper">
    <!-- Tab切换栏 -->
    <div class="tab-bar">
      <span
        class="tab-item"
        :class="{ active: activeTab === 'coupon' }"
        @click="activeTab = 'coupon'"
        >优惠券</span
      >
      <span
        class="tab-item"
        :class="{ active: activeTab === 'futureCoin' }"
        @click="activeTab = 'futureCoin'"
        >未来币</span
      >
    </div>

    <template v-if="activeTab === 'coupon'">
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
            >新增奖品</el-button
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
              min-width="140"
            ></el-table-column>
            <el-table-column
              prop="prizeName"
              label="奖品名称"
              min-width="140"
              show-overflow-tooltip
            ></el-table-column>
            <el-table-column
              prop="clientName"
              label="C端展示名称"
              min-width="140"
              show-overflow-tooltip
            ></el-table-column>
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
            <el-table-column prop="useChannels" label="适用渠道" width="120">
              <template slot-scope="{ row }">
                {{ getUseChannelsText(row.useChannels) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="faceValue"
              label="优惠内容"
              width="180"
              align="right"
            >
              <template slot-scope="{ row }">
                {{ formatPrizeValue(row) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="totalStock"
              label="上限份数"
              width="100"
            ></el-table-column>
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
            <el-table-column prop="createTime" label="时间" width="180">
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
        width="720px"
        :close-on-click-modal="false"
        @close="handleDialogClose"
      >
        <div v-if="editReadonlyTip" class="edit-readonly-tip">
          {{ editReadonlyTip }}
        </div>
        <el-form
          ref="prizeForm"
          :model="form"
          :rules="formRules"
          label-width="120px"
          :validate-on-rule-change="false"
        >
          <el-form-item label="奖品名称" prop="prizeName">
            <el-input
              v-model="form.prizeName"
              placeholder="请输入奖品名称"
              maxlength="15"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="C端展示名称" prop="clientName">
            <el-input
              v-model="form.clientName"
              placeholder="请输入C端展示名称"
              maxlength="10"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="适用游戏" prop="productScope">
            <el-radio-group
              v-model="form.productScope"
              @change="handleProductScopeChange"
            >
              <el-radio label="1">全部</el-radio>
              <el-radio label="2">部分</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="适用渠道" prop="useChannels">
            <el-checkbox-group v-model="form.useChannels">
              <el-checkbox label="APP">APP</el-checkbox>
              <el-checkbox label="MINI_PROGRAM">小程序</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item
            v-if="form.productScope === '2'"
            label="选择游戏"
            prop="productIds"
          >
            <el-select
              v-model="form.productIds"
              multiple
              filterable
              placeholder="请选择游戏"
              style="width: 100%"
              :loading="productLoading"
            >
              <el-option
                v-for="p in productOptions"
                :key="p.id"
                :label="p.productName"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="奖品属性" prop="prizeSource">
            <el-radio-group v-model="form.prizeSource">
              <el-radio label="1">活动奖品</el-radio>
              <el-radio label="2">人工发放奖品</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="券数量" prop="totalStock">
            <el-input
              v-model="form.totalStock"
              placeholder="请输入券数量"
              @input="sanitizeInt('totalStock')"
            />
          </el-form-item>
          <el-form-item label="券类型" prop="prizeType">
            <el-select
              v-model="form.prizeType"
              placeholder="请选择券类型"
              style="width: 100%"
              @change="handlePrizeTypeChange"
            >
              <el-option label="满减券" value="1" />
              <el-option label="折扣券" value="2" />
              <el-option label="代金券" value="3" />
            </el-select>
          </el-form-item>

          <!-- 满减配置 -->
          <template v-if="form.prizeType === '1'">
            <el-form-item label="使用门槛" prop="thresholdAmount">
              <div class="threshold-row">
                <span class="threshold-label">满</span>
                <el-input
                  v-model="form.thresholdAmount"
                  class="threshold-input"
                  placeholder="金额"
                  @input="sanitizeAmount('thresholdAmount')"
                  @blur="$refs.prizeForm.validateField('thresholdAmount')"
                />
                <span class="threshold-label">元 立减</span>
                <el-input
                  v-model="form.reduceAmount"
                  class="threshold-input"
                  placeholder="金额"
                  @input="sanitizeAmount('reduceAmount')"
                  @blur="$refs.prizeForm.validateField('thresholdAmount')"
                />
                <span class="threshold-label">元</span>
              </div>
            </el-form-item>
          </template>

          <!-- 折扣配置 -->
          <template v-if="form.prizeType === '2'">
            <el-form-item label="折扣值" prop="discountValue">
              <el-input
                v-model="form.discountValue"
                placeholder="如 8 折填 8.0"
                @input="sanitizeDiscount"
              />
            </el-form-item>
            <el-form-item label="使用门槛" prop="minUseAmount">
              <div class="threshold-row">
                <el-input
                  v-model="form.minUseAmount"
                  class="threshold-input"
                  placeholder="最低"
                  @input="sanitizeAmount('minUseAmount')"
                  @blur="$refs.prizeForm.validateField('minUseAmount')"
                />
                <span class="threshold-label">元 --</span>
                <el-input
                  v-model="form.maxUseAmount"
                  class="threshold-input"
                  placeholder="最高"
                  @input="sanitizeAmount('maxUseAmount')"
                  @blur="$refs.prizeForm.validateField('minUseAmount')"
                />
                <span class="threshold-label">元可用</span>
              </div>
              <div class="form-tip">
                请填一个原价范围，只有原价在这区间内的订单，才可以用这张打折券
              </div>
            </el-form-item>
          </template>

          <!-- 代金券 -->
          <template v-if="form.prizeType === '3'">
            <el-form-item label="面值" prop="faceValue">
              <div class="unit-input-wrap">
                <el-input
                  v-model="form.faceValue"
                  class="unit-input"
                  placeholder="请输入面值"
                  @input="sanitizeInt('faceValue')"
                />
                <span class="unit-input-suffix">元</span>
              </div>
            </el-form-item>
          </template>

          <el-form-item label="有效期" prop="validType">
            <el-radio-group
              v-model="form.validType"
              @change="handleValidTypeChange"
            >
              <el-radio label="1">周期性</el-radio>
              <el-radio label="2">领取后生效</el-radio>
              <el-radio label="3">永久生效</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="可下单陪陪" prop="orderableWaiterTypes">
            <el-checkbox-group v-model="form.orderableWaiterTypes">
              <el-checkbox
                v-for="opt in orderableWaiterOptions"
                :key="opt.code"
                :label="opt.code"
                >{{ opt.label }}</el-checkbox
              >
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="使用条件" prop="useCondition">
            <el-radio-group v-model="form.useCondition">
              <el-radio label="1">单笔单份使用</el-radio>
              <el-radio label="2">单笔多份使用</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item
            v-if="form.validType === '1'"
            label="有效时间"
            prop="validStartTime"
          >
            <div class="threshold-row">
              <el-date-picker
                v-model="form.validStartTime"
                type="datetime"
                placeholder="开始日期"
                value-format="yyyy-MM-dd HH:mm:ss"
                default-time="00:00:00"
                class="threshold-input"
                @change="handleStartTimeChange"
              />
              <span class="threshold-label">--</span>
              <el-date-picker
                v-model="form.validEndTime"
                type="datetime"
                placeholder="结束日期"
                value-format="yyyy-MM-dd HH:mm:ss"
                default-time="23:59:59"
                class="threshold-input"
                :picker-options="endTimePickerOptions"
                @change="handleEndTimeChange"
              />
            </div>
          </el-form-item>

          <el-form-item
            v-if="form.validType === '2'"
            label="领取后生效"
            prop="validDays"
          >
            <div class="unit-input-wrap">
              <el-input
                v-model="form.validDays"
                class="unit-input unit-input-long"
                placeholder="请输入天数"
                @input="sanitizeInt('validDays')"
              />
              <span class="unit-input-suffix">天内生效</span>
            </div>
          </el-form-item>

          <el-form-item label="使用说明" prop="useDesc">
            <div class="editor-wrapper">
              <QuillEditor
                v-model="form.useDesc"
                :options="useDescEditorOptions"
                @blur="handleUseDescBlur"
              />
            </div>
            <div class="form-tip">最多输入200个字</div>
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
                v-if="form.voucherPreviewUrls.length < 5"
                class="voucher-add"
                @click="triggerVoucherUpload"
              >
                <i class="el-icon-plus"></i>
              </div>
            </div>
            <div class="form-tip">最多上传5张，支持png、jpg、jpeg格式</div>
            <input
              ref="voucherInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleVoucherChange"
            />
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

      <!-- 凭证图片预览 -->
      <ImgZoom
        v-model="voucherPreviewVisible"
        :img-list="[voucherPreviewUrl]"
      />
    </template>
    <template v-if="activeTab === 'futureCoin'">
      <div class="future-coin-wrap"><FutureCoin /></div>
    </template>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import { quillEditor } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";
import {
  OperationPrizeList,
  OperationPrizeDetail,
  deleteRechargeConfig,
  createPrize,
  updatePrize,
} from "@/api/prize";
import { productList } from "@/api/goodsList";
import { fileUpload } from "@/api/user";

import FutureCoin from "./FutureCoin.vue";

const EMPTY_FORM = {
  id: null,
  prizeName: "",
  clientName: "",
  productScope: "1",
  productIds: [],
  useChannels: [],
  prizeSource: "1",
  prizeType: "1",
  totalStock: "",
  faceValue: "",
  discountValue: "",
  thresholdAmount: "",
  reduceAmount: "",
  minUseAmount: "",
  maxUseAmount: "",
  validType: "1",
  useCondition: "1",
  orderableWaiterTypes: [],
  validStartTime: "",
  validEndTime: "",
  validDays: "",
  useDesc: "",
  voucherImgs: "",
  voucherPreviewUrls: [],
};

export default {
  name: "PrizeList",
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom,
    QuillEditor: quillEditor,
    FutureCoin,
  },
  data() {
    return {
      activeTab: "coupon",
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
          prop: "useChannels",
          label: "适用渠道",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "APP", value: "APP" },
            { label: "小程序", value: "MINI_PROGRAM" },
          ],
          clearable: true,
        },
      ],
      filterForm: {
        prizeId: "",
        prizeName: "",
        prizeSource: "",
        activityLinked: "",
        useChannels: "",
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 弹窗
      dialogVisible: false,
      dialogTitle: "新增奖品",
      isEdit: false,
      editReadonly: false,
      editReadonlyTip: "",
      submitLoading: false,
      form: { ...EMPTY_FORM },
      orderableWaiterOptions: [
        { code: "PLATFORM_PERSONAL", label: "平台个人陪" },
        { code: "PLATFORM_GUILD", label: "平台公会陪" },
        { code: "MERCHANT_GUILD", label: "商户公会陪" },
      ],
      productOptions: [],
      productLoading: false,
      uploadingIds: [],
      voucherPreviewVisible: false,
      voucherPreviewUrl: "",
      useDescEditorOptions: {
        theme: "snow",
        placeholder: "请输入使用说明",
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
    endTimePickerOptions() {
      const start = this.form.validStartTime;
      if (!start) return {};
      const startDate = new Date(start);
      return {
        disabledDate(time) {
          return time.getTime() < startDate.getTime() - 1000;
        },
      };
    },
    formRules() {
      const rules = {
        prizeName: [
          { required: true, message: "请输入奖品名称", trigger: "blur" },
          { max: 15, message: "最多15个字", trigger: "blur" },
        ],
        clientName: [
          { required: true, message: "请输入C端展示名称", trigger: "blur" },
          { max: 10, message: "最多10个字", trigger: "blur" },
        ],
        productScope: [
          { required: true, message: "请选择适用游戏", trigger: "change" },
        ],
        productIds: [],
        prizeSource: [
          { required: true, message: "请选择奖品属性", trigger: "change" },
        ],
        prizeType: [
          { required: true, message: "请选择券类型", trigger: "change" },
        ],
        totalStock: [
          { required: true, message: "请输入券数量", trigger: "blur" },
          { validator: this.validatePositiveInt, trigger: "blur" },
        ],
        validType: [
          { required: true, message: "请选择有效值", trigger: "change" },
        ],
        useCondition: [
          { required: true, message: "请选择使用条件", trigger: "change" },
        ],
        orderableWaiterTypes: [
          {
            required: true,
            type: "array",
            min: 1,
            message: "请至少选择一种可下单陪陪",
            trigger: "change",
          },
        ],
        useDesc: [
          { required: true, validator: this.validateUseDesc, trigger: "blur" },
        ],
      };

      if (this.form.productScope === "2") {
        rules.productIds = [
          {
            required: true,
            type: "array",
            min: 1,
            message: "请至少选择一个游戏",
            trigger: "change",
          },
        ];
      }

      if (this.form.prizeType === "1") {
        rules.thresholdAmount = [
          {
            required: true,
            validator: this.validateThresholdRow,
            trigger: "blur",
          },
        ];
      }
      if (this.form.prizeType === "2") {
        rules.discountValue = [
          { required: true, message: "请输入折扣值", trigger: "blur" },
        ];
        rules.minUseAmount = [
          {
            required: true,
            validator: this.validateDiscountRange,
            trigger: "blur",
          },
        ];
      }
      if (this.form.prizeType === "3") {
        rules.faceValue = [
          { required: true, message: "请输入面值", trigger: "blur" },
          { validator: this.validatePositiveInt, trigger: "blur" },
        ];
      }
      if (this.form.validType === "1") {
        rules.validStartTime = [
          {
            required: true,
            validator: this.validateTimeRange,
            trigger: "blur",
          },
        ];
      }
      if (this.form.validType === "2") {
        rules.validDays = [
          { required: true, message: "请输入有效天数", trigger: "blur" },
          { validator: this.validatePositiveInt, trigger: "blur" },
        ];
      }
      return rules;
    },
  },

  mounted() {
    this.fetchTableData();
    this.fetchProductOptions();
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
    getPrizeSourceText(s) {
      return { 1: "活动奖品", 2: "人工发放奖品" }[String(s)] || "-";
    },
    getUseChannelsText(channels) {
      const arr = Array.isArray(channels)
        ? channels
        : channels
        ? String(channels).split(",")
        : [];
      const map = { APP: "APP", MINI_PROGRAM: "小程序" };
      return arr.map((v) => map[v] || v).join("、") || "-";
    },
    formatPrizeValue(row) {
      const type = String(row.prizeType || "");
      if (type === "1") {
        return `满${row.thresholdAmount || "-"}元 立减${
          row.reduceAmount || "-"
        }元`;
      }
      if (type === "2") {
        return row.discountValue ? `${row.discountValue}折` : "-";
      }
      return row.faceValue != null ? `¥${row.faceValue}` : "-";
    },
    validateUseDesc(rule, value, callback) {
      const text = this.getEditorPlainText(this.normalizeEditorHtml(value));
      if (!text) {
        return callback(new Error("请输入使用说明"));
      }
      if (text.length > 200) {
        return callback(new Error("最多200个字"));
      }
      callback();
    },

    validatePositiveInt(rule, value, callback) {
      const v = String(value || "").trim();
      if (!v) return callback(new Error("不能为空"));
      if (!/^\d+$/.test(v) || Number(v) <= 0)
        return callback(new Error("请输入正整数"));
      callback();
    },
    validatePositiveAmount(rule, value, callback) {
      const v = String(value || "").trim();
      if (!v) return callback(new Error("不能为空"));
      if (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0)
        return callback(new Error("请输入有效金额，最多2位小数"));
      callback();
    },
    validateThresholdRow(rule, value, callback) {
      const threshold = Number(this.form.thresholdAmount);
      const reduce = Number(this.form.reduceAmount);
      if (
        !this.form.thresholdAmount ||
        !String(this.form.thresholdAmount).trim()
      ) {
        return callback(new Error("请输入满减门槛"));
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(this.form.thresholdAmount).trim())) {
        return callback(new Error("门槛金额最多保留2位小数"));
      }
      if (!this.form.reduceAmount || !String(this.form.reduceAmount).trim()) {
        return callback(new Error("请输入立减金额"));
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(this.form.reduceAmount).trim())) {
        return callback(new Error("立减金额最多保留2位小数"));
      }
      if (threshold <= 0) return callback(new Error("满减门槛需大于0"));
      if (reduce <= 0) return callback(new Error("立减金额需大于0"));
      if (reduce >= threshold) {
        return callback(new Error("立减金额需＜满金额"));
      }
      callback();
    },

    validateDiscountRange(rule, value, callback) {
      const min = Number(this.form.minUseAmount);
      const max = Number(this.form.maxUseAmount);
      if (!this.form.minUseAmount || !String(this.form.minUseAmount).trim()) {
        return callback(new Error("请输入最低使用门槛"));
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(this.form.minUseAmount).trim())) {
        return callback(new Error("最低金额最多保留2位小数"));
      }
      if (!this.form.maxUseAmount || !String(this.form.maxUseAmount).trim()) {
        return callback(new Error("请输入最高使用门槛"));
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(this.form.maxUseAmount).trim())) {
        return callback(new Error("最高金额最多保留2位小数"));
      }
      if (min <= 0) return callback(new Error("最低金额需大于0"));
      if (max <= 0) return callback(new Error("最高金额需大于0"));
      if (min >= max) {
        return callback(new Error("最低金额需小于最高金额"));
      }
      callback();
    },

    sanitizeInt(field) {
      this.form[field] = String(this.form[field] || "").replace(/\D/g, "");
    },
    sanitizeAmount(field) {
      let v = String(this.form[field] || "").replace(/[^\d.]/g, "");
      const dotIdx = v.indexOf(".");
      if (dotIdx !== -1) {
        v =
          v.slice(0, dotIdx + 1) +
          v
            .slice(dotIdx + 1)
            .replace(/\./g, "")
            .slice(0, 2);
      }
      this.form[field] = v;
    },
    sanitizeDiscount() {
      let v = String(this.form.discountValue || "").replace(/[^\d.]/g, "");
      const dotIdx = v.indexOf(".");
      if (dotIdx !== -1)
        v =
          v.slice(0, dotIdx + 1) +
          v
            .slice(dotIdx + 1)
            .replace(/\./g, "")
            .slice(0, 1);
      this.form.discountValue = v;
    },

    validateTimeRange(rule, value, callback) {
      if (!this.form.validStartTime)
        return callback(new Error("请选择开始日期"));
      if (!this.form.validEndTime) return callback(new Error("请选择结束日期"));
      if (
        new Date(this.form.validEndTime).getTime() <
        new Date(this.form.validStartTime).getTime()
      ) {
        return callback(new Error("结束时间不能小于开始时间"));
      }
      callback();
    },

    handleStartTimeChange() {
      if (this.form.validStartTime && this.form.validEndTime) {
        if (
          new Date(this.form.validEndTime).getTime() <
          new Date(this.form.validStartTime).getTime()
        ) {
          this.form.validEndTime = "";
        }
      }
    },
    handleEndTimeChange() {
      this.$nextTick(() => {
        if (this.$refs.prizeForm)
          this.$refs.prizeForm.validateField("validStartTime");
      });
    },
    handleUseDescBlur() {
      this.form.useDesc = this.normalizeEditorHtml(this.form.useDesc);
      this.$nextTick(() => {
        if (this.$refs.prizeForm) this.$refs.prizeForm.validateField("useDesc");
      });
    },

    handlePrizeTypeChange() {
      [
        "faceValue",
        "discountValue",
        "thresholdAmount",
        "reduceAmount",
        "minUseAmount",
        "maxUseAmount",
      ].forEach((k) => {
        this.form[k] = "";
      });
      this.$nextTick(() => {
        if (this.$refs.prizeForm) this.$refs.prizeForm.clearValidate();
      });
    },
    handleProductScopeChange() {
      if (this.form.productScope === "1") this.form.productIds = [];
      this.$nextTick(() => {
        if (this.$refs.prizeForm) this.$refs.prizeForm.clearValidate();
      });
    },
    handleValidTypeChange() {
      this.form.validStartTime = "";
      this.form.validEndTime = "";
      this.form.validDays = "";
      this.$nextTick(() => {
        if (this.$refs.prizeForm) this.$refs.prizeForm.clearValidate();
      });
    },

    async fetchProductOptions() {
      this.productLoading = true;
      try {
        const res = await productList({ pageNum: 1, pageSize: 999 });
        if (res.success && res.data?.rows) this.productOptions = res.data.rows;
      } catch {
        /* ignore */
      } finally {
        this.productLoading = false;
      }
    },

    buildQueryParams() {
      const p = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        prizeCategory: 1,
      };
      if (this.filterForm.prizeId) p.prizeId = this.filterForm.prizeId;
      if (this.filterForm.prizeName) p.prizeName = this.filterForm.prizeName;
      if (this.filterForm.prizeSource)
        p.prizeSource = this.filterForm.prizeSource;
      if (this.filterForm.activityLinked)
        p.activityLinked = this.filterForm.activityLinked;
      if (this.filterForm.useChannels)
        p.useChannels = this.filterForm.useChannels;
      return p;
    },

    async fetchTableData() {
      this.loading = true;
      try {
        const res = await OperationPrizeList(this.buildQueryParams());
        if (res.success) {
          console.log(res);
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
        this.$message.error("获取奖品列表失败");
      } finally {
        this.loading = false;
      }
    },

    handleSearch(fd) {
      this.filterForm = {
        prizeId: fd?.prizeId || "",
        prizeName: fd?.prizeName || "",
        prizeSource: fd?.prizeSource || "",
        activityLinked: fd?.activityLinked || "",
        useChannels: fd?.useChannels || "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        prizeId: "",
        prizeName: "",
        prizeSource: "",
        activityLinked: "",
        useChannels: "",
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(n) {
      this.pagination.pageNum = n;
      this.fetchTableData();
    },

    handleAdd() {
      this.isEdit = false;
      this.editReadonly = false;
      this.editReadonlyTip = "";
      this.dialogTitle = "新增奖品";
      this.form = {
        ...EMPTY_FORM,
        voucherPreviewUrls: [],
        voucherImgs: "",
        useChannels: [],
        orderableWaiterTypes: [],
      };
      this.uploadingIds = [];
      this.dialogVisible = true;
      this.$nextTick(
        () => this.$refs.prizeForm && this.$refs.prizeForm.clearValidate()
      );
    },

    async handleEdit(row) {
      this.isEdit = true;
      this.dialogTitle = "编辑奖品";

      const prizeSource = String(row.prizeSource || "");
      if (prizeSource === "1" && row.activityLinked === "1") {
        this.editReadonly = true;
        this.editReadonlyTip = "注：当前奖品已关联活动，不支持修改奖品信息";
      } else if (prizeSource === "2") {
        this.editReadonly = true;
        this.editReadonlyTip = "注：人工发放奖品不支持修改";
      } else {
        this.editReadonly = false;
        this.editReadonlyTip = "";
      }

      this.submitLoading = true;
      this.dialogVisible = true;
      try {
        const res = await OperationPrizeDetail({ id: row.id });
        if (res.success && res.data) {
          const d = res.data;
          this.form = {
            id: d.id,
            prizeName: d.prizeName || "",
            clientName: d.clientName || "",
            productScope: String(d.productScope || "1"),
            productIds: Array.isArray(d.productIds) ? d.productIds : [],
            useChannels: Array.isArray(d.useChannels)
              ? d.useChannels
              : d.useChannels
              ? String(d.useChannels).split(",")
              : [],
            orderableWaiterTypes: Array.isArray(d.orderableWaiterTypes)
              ? [...d.orderableWaiterTypes]
              : d.orderableWaiterTypes
              ? String(d.orderableWaiterTypes).split(",")
              : [],
            prizeSource: String(d.prizeSource || "1"),
            prizeType: String(d.prizeType || "1"),
            totalStock: d.totalStock != null ? String(d.totalStock) : "",
            faceValue: d.faceValue != null ? String(d.faceValue) : "",
            discountValue:
              d.discountValue != null ? String(d.discountValue) : "",
            thresholdAmount:
              d.thresholdAmount != null ? String(d.thresholdAmount) : "",
            reduceAmount: d.reduceAmount != null ? String(d.reduceAmount) : "",
            minUseAmount: d.minUseAmount != null ? String(d.minUseAmount) : "",
            maxUseAmount: d.maxUseAmount != null ? String(d.maxUseAmount) : "",
            validType: String(d.validType || "1"),
            useCondition: String(d.useCondition || "1"),
            validStartTime: d.validStartTime || "",
            validEndTime: d.validEndTime || "",
            validDays: d.validDays != null ? String(d.validDays) : "",
            useDesc: d.useDesc || "",
            voucherImgs: d.voucherImgs || "",
            voucherPreviewUrls: d.voucherImgUrls
              ? d.voucherImgUrls.split(",").filter(Boolean)
              : [],
          };
          this.uploadingIds = this.form.voucherImgs
            ? this.form.voucherImgs.split(",").filter(Boolean)
            : [];
          this.$nextTick(() => {
            if (this.$refs.prizeForm) this.$refs.prizeForm.clearValidate();
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
      this.form = {
        ...EMPTY_FORM,
        voucherPreviewUrls: [],
        voucherImgs: "",
        useChannels: [],
        orderableWaiterTypes: [],
      };
      this.uploadingIds = [];
      this.editReadonly = false;
      this.editReadonlyTip = "";
      this.$nextTick(() => {
        if (this.$refs.prizeForm) this.$refs.prizeForm.clearValidate();
      });
    },

    triggerVoucherUpload() {
      this.$refs.voucherInput && this.$refs.voucherInput.click();
    },

    async handleVoucherChange(e) {
      const file = e.target.files && e.target.files[0];
      this.$refs.voucherInput.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        this.$message.error("仅支持图片格式");
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
        if (res.code === 200 && res.data?.ossId) {
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
      this.$refs.prizeForm.validate(async (valid) => {
        if (!valid) return;
        this.submitLoading = true;
        try {
          const data = {
            prizeCategory: 1,
            prizeName: this.form.prizeName,
            clientName: this.form.clientName,
            productScope: this.form.productScope,
            useChannels: Array.isArray(this.form.useChannels)
              ? this.form.useChannels.join(",")
              : this.form.useChannels || "",
            prizeSource: this.form.prizeSource,
            prizeType: this.form.prizeType,
            totalStock: Number(this.form.totalStock) || 0,
            validType: this.form.validType,
            useCondition: this.form.useCondition,
            orderableWaiterTypes: Array.isArray(this.form.orderableWaiterTypes)
              ? [...this.form.orderableWaiterTypes]
              : [],
            useDesc: this.normalizeEditorHtml(this.form.useDesc) || "",
            voucherImgs: this.uploadingIds.join(","),
          };
          if (this.form.productScope === "2")
            data.productIds = this.form.productIds;

          if (this.form.prizeType === "1") {
            data.thresholdAmount = Number(this.form.thresholdAmount) || 0;
            data.reduceAmount = Number(this.form.reduceAmount) || 0;
          }
          if (this.form.prizeType === "2") {
            data.discountValue = Number(this.form.discountValue) || 0;
            data.minUseAmount = Number(this.form.minUseAmount) || 0;
            data.maxUseAmount = Number(this.form.maxUseAmount) || 0;
          }
          if (this.form.prizeType === "3") {
            data.faceValue = Number(this.form.faceValue) || 0;
          }
          if (this.form.validType === "1") {
            data.validStartTime = this.form.validStartTime || "";
            data.validEndTime = this.form.validEndTime || "";
          }
          if (this.form.validType === "2") {
            data.validDays = Number(this.form.validDays) || 0;
          }
          if (this.isEdit) data.id = this.form.id;
          console.log("提交数据：", JSON.stringify(data));
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
      this.$confirm(`确定要删除奖品「${row.prizeName}」吗？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            const res = await deleteRechargeConfig({ ids: [row.id] });
            if (res.success) {
              this.$message.success("删除成功");
              if (this.tableData.length === 1 && this.pagination.pageNum > 1)
                this.pagination.pageNum -= 1;
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
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.future-coin-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: -20px -20px 0;
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
    border-color: #4d23d9;
    color: #4d23d9;
  }
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

::v-deep .unit-input-long .el-input__inner {
  padding-right: 72px;
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

.edit-readonly-tip {
  padding: 16px 20px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #e6a23c;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 8px;
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

::v-deep .el-dialog {
  margin-top: 5vh !important;
}

/* Tab切换栏 */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px 16px;
  flex-shrink: 0;
}

.tab-item {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  cursor: pointer;
  padding-bottom: 10px;
  position: relative;
  transition: color 0.2s;
  user-select: none;

  &:hover {
    color: #6a35ff;
  }

  &.active {
    color: #6a35ff;
    font-weight: 600;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #6a35ff;
      border-radius: 2px 2px 0 0;
    }
  }
}
</style>
