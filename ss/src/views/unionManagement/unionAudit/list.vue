<template>
  <div class="list-wrapper">
    <!-- 筛选查询区 -->
    <div class="search-module">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :confirm-reset="false"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <!-- 数据列表卡片 -->
    <el-card class="list-card" shadow="never">
      <div class="table-wrapper" ref="tableWrapper">
        <el-table
          :data="tableData"
          :height="tableHeight"
          stripe
          v-loading="loading"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <!-- 序号 -->
          <el-table-column type="index" :index="rowIndex" label="序号" width="70" />

          <!-- 公会名称 -->
          <el-table-column prop="tradeName" label="公会名称" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.tradeName || '-' }}
            </template>
          </el-table-column>

          <!-- 公会ID -->
          <el-table-column label="公会ID" width="90">
            <template slot-scope="{ row }">
              {{ row.tradeIdDisplay || '-' }}
            </template>
          </el-table-column>

          <!-- 公会Logo -->
          <el-table-column label="公会Logo" width="100">
            <template slot-scope="{ row }">
              <div class="avatar-cell" @click="previewLogo(row)">
                <img v-if="row.logoUrl" :src="row.logoUrl" class="avatar-thumb" @error="handleImgError" />
                <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" />
              </div>
            </template>
          </el-table-column>

          <!-- 公会负责人 -->
          <el-table-column prop="tradeNamePerson" label="公会负责人" min-width="110" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.tradeNamePerson || '-' }}
            </template>
          </el-table-column>

          <!-- 联系方式 -->
          <el-table-column label="联系方式" width="150">
            <template slot-scope="{ row }">
              <div class="phone-cell">
                <span>{{ row.showPhone ? (row.phoneFull || row.phone || '-') : (row.phoneFull ? `${row.phoneFull.slice(0, 3)}****${row.phoneFull.slice(7)}` : maskPhone(row.phone)) }}</span>
                <i
                  v-if="row.phoneCanReveal"
                  class="el-icon-view phone-eye"
                  :class="{ 'is-active': row.showPhone }"
                  @click.stop="row.showPhone = !row.showPhone"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 营业执照 -->
          <el-table-column label="营业执照" width="90">
            <template slot-scope="{ row }">
              <img
                v-if="row.businessLicenseUrl"
                :src="row.businessLicenseUrl"
                class="avatar-thumb"
                @click="previewLicense(row)"
                @error="handleImgError"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 营业场所照片 -->
          <el-table-column label="营业场所照片" min-width="180">
            <template slot-scope="{ row }">
              <div v-if="photoList(row.photosUrl).length" class="photo-cell">
                <img
                  v-for="(url, index) in photoList(row.photosUrl)"
                  :key="`${row.applyId}-photo-${index}`"
                  :src="url"
                  class="photo-thumb"
                  @click="previewPhotos(row, index)"
                  @error="handleImgError"
                />
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 提交时间 -->
          <el-table-column prop="createTime" label="提交时间" width="160" />

          <!-- 状态 -->
          <el-table-column label="状态" width="100">
            <template slot-scope="{ row }">
              <el-tag :type="getStatusTag(row.status)" size="small">
                {{ row.statusLabel || getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 审核人 -->
          <el-table-column label="审核人" width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ String(row.status) === '0' ? '-' : (row.auditByName || '-') }}
            </template>
          </el-table-column>

          <!-- 审核时间 -->
          <el-table-column label="审核时间" width="160">
            <template slot-scope="{ row }">
              {{ String(row.status) === '0' ? '-' : (row.auditTime || '-') }}
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="110" fixed="right"
            v-if="checkPermission(['system:unionAudit:approve', 'system:unionAudit:query'])">
            <template slot-scope="{ row }">
              <template v-if="String(row.status) === '0'">
                <el-button
                  type="text"
                  style="color: #9047f8"
                  @click="openAuditDialog(row)"
                  v-permission="'system:unionAudit:approve'"
                >
                  审核
                </el-button>
              </template>
              <template v-else>
                <el-button
                  type="text"
                  style="color: #9047f8"
                  @click="openViewDialog(row)"
                  v-permission="'system:unionAudit:query'"
                >
                  查看
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- ==================== 审核入驻申请弹窗 ==================== -->
    <el-dialog
      title="审核入驻申请"
      :visible.sync="auditDialogVisible"
      width="680px"
      :close-on-click-modal="false"
      class="audit-dialog"
      @closed="resetAuditDialog"
    >
      <div v-loading="detailLoading" class="dialog-body">
        <template v-if="detailData">
          <!-- 只读申请信息 -->
          <div class="info-section">
            <div class="info-row">
              <div class="info-col">
                <div class="info-label">公会名称</div>
                <div class="info-value">{{ detailData.tradeName || '-' }}</div>
              </div>
              <div class="info-col">
                <div class="info-label">公会Logo</div>
                <div class="info-value">
                  <img
                    v-if="detailData.logoUrl"
                    :src="detailData.logoUrl"
                    class="dialog-thumb"
                    @click="previewLogo(detailData)"
                    @error="handleImgError"
                  />
                  <span v-else>-</span>
                </div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-col">
                <div class="info-label">公会负责人</div>
                <div class="info-value">{{ detailData.tradeNamePerson || '-' }}</div>
              </div>
              <div class="info-col">
                <div class="info-label">联系方式</div>
                <div class="info-value">
                  <span class="phone-inline">
                    {{ auditPhoneVisible ? (detailData.phoneFull || detailData.phone || '-') : (detailData.phoneFull ? `${detailData.phoneFull.slice(0, 3)}****${detailData.phoneFull.slice(7)}` : maskPhone(detailData.phone)) }}
                    <i
                      v-if="detailData.phoneCanReveal"
                      class="el-icon-view phone-eye is-active"
                      @click="auditPhoneVisible = !auditPhoneVisible"
                    />
                  </span>
                </div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-col">
                <div class="info-label">营业执照</div>
                <div class="info-value">
                  <img
                    v-if="detailData.businessLicenseUrl"
                    :src="detailData.businessLicenseUrl"
                    class="dialog-thumb"
                    @click="previewLicense(detailData)"
                    @error="handleImgError"
                  />
                  <span v-else>-</span>
                </div>
              </div>
              <div class="info-col">
                <div class="info-label">提交时间</div>
                <div class="info-value">{{ detailData.createTime || '-' }}</div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-col info-col--full">
                <div class="info-label">营业场所照片</div>
                <div class="info-value">
                  <div v-if="detailPhotos.length" class="photo-cell">
                    <img
                      v-for="(url, index) in detailPhotos"
                      :key="`audit-photo-${index}`"
                      :src="url"
                      class="dialog-thumb"
                      @click="previewPhotos(detailData, index)"
                      @error="handleImgError"
                    />
                  </div>
                  <span v-else>-</span>
                </div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-col">
                <div class="info-label">身份证人像面</div>
                <div class="info-value">
                  <img
                    v-if="detailData.idCardFrontUrl"
                    :src="detailData.idCardFrontUrl"
                    class="dialog-thumb"
                    @click="previewIdCardFront"
                    @error="handleImgError"
                  />
                  <span v-else>-</span>
                </div>
              </div>
              <div class="info-col">
                <div class="info-label">身份证国徽面</div>
                <div class="info-value">
                  <img
                    v-if="detailData.idCardBackUrl"
                    :src="detailData.idCardBackUrl"
                    class="dialog-thumb"
                    @click="previewIdCardBack"
                    @error="handleImgError"
                  />
                  <span v-else>-</span>
                </div>
              </div>
            </div>
          </div>

          <el-divider class="form-divider" />

          <!-- 审核结果 -->
          <div class="audit-op">
            <el-form :model="auditForm" label-width="96px">
              <el-form-item label="审核结果" prop="result">
                <el-radio-group v-model="auditForm.result">
                  <el-radio label="approve">通过</el-radio>
                  <el-radio label="reject">拒绝</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>

            <!-- 通过：分润配置 -->
            <div v-if="auditForm.result === 'approve'" class="profit-block">
              <div class="profit-head">
                <span class="profit-title">通用游戏类型-分润设置</span>
                <div class="profit-sum" :class="{ 'is-error': auditProfitSum !== 100 }">
                  合计：{{ auditProfitSum }}%
                </div>
              </div>
              <div class="profit-grid">
                <div class="profit-field">
                  <div class="profit-label">公会分润</div>
                  <div class="percent-field">
                    <el-input
                      v-model="auditForm.unionRate"
                      placeholder="0"
                      @input="handleRateInput('unionRate')"
                    />
                    <span class="percent-field__unit">%</span>
                  </div>
                </div>
                <div class="profit-field">
                  <div class="profit-label">陪陪分润</div>
                  <div class="percent-field">
                    <el-input
                      v-model="auditForm.waiterRate"
                      placeholder="0"
                      @input="handleRateInput('waiterRate')"
                    />
                    <span class="percent-field__unit">%</span>
                  </div>
                </div>
                <div class="profit-field">
                  <div class="profit-label">平台分润</div>
                  <div class="percent-field">
                    <el-input
                      v-model="auditForm.platformRate"
                      placeholder="0"
                      @input="handleRateInput('platformRate')"
                    />
                    <span class="percent-field__unit">%</span>
                  </div>
                </div>
              </div>
              <p v-if="auditProfitSum !== 100" class="profit-hint">
                分润比例合计须为100%
              </p>
              <p v-else class="profit-ok">分润比例合计为100%，可提交</p>
            </div>

            <!-- 拒绝：原因 -->
            <div v-else class="reject-block">
              <el-form
                :model="auditForm"
                :rules="rejectRules"
                ref="rejectForm"
                label-width="96px"
              >
                <el-form-item label="拒绝原因" prop="rejectReason">
                  <el-input
                    v-model="auditForm.rejectReason"
                    type="textarea"
                    :rows="4"
                    :maxlength="50"
                    show-word-limit
                    placeholder="请填写拒绝原因，便于负责人了解情况并重新提交"
                  />
                </el-form-item>
              </el-form>
            </div>
          </div>
        </template>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="auditSubmitting"
          :disabled="!canSubmitAudit"
          @click="submitAudit"
        >
          确认提交
        </el-button>
      </div>
    </el-dialog>

    <!-- ==================== 入驻申请详情弹窗（只读） ==================== -->
    <el-dialog
      title="入驻申请详情"
      :visible.sync="viewDialogVisible"
      width="680px"
      :close-on-click-modal="false"
      class="audit-dialog"
    >
      <div v-loading="detailLoading" class="dialog-body">
        <template v-if="detailData">
          <div
            class="detail-status-card"
            :class="{
              'detail-status-card--pass': String(detailData.status) === '1',
              'detail-status-card--reject': String(detailData.status) === '2'
            }"
          >
            <div class="detail-status-card__main">
              <div class="detail-status-card__label">审核状态</div>
              <div class="detail-status-card__value">
                <el-tag :type="getStatusTag(detailData.status)" size="small">
                  {{ detailData.statusLabel || getStatusText(detailData.status) }}
                </el-tag>
              </div>
            </div>
            <div class="detail-status-card__meta">
              <span class="detail-status-card__meta-item">
                <em>审核人</em>
                {{ detailData.auditByName || '—' }}
              </span>
              <span class="detail-status-card__meta-item">
                <em>审核时间</em>
                {{ detailData.auditTime || '—' }}
              </span>
            </div>
          </div>

          <div v-if="String(detailData.status) === '2'" class="detail-result-block detail-result-block--reject">
            <div class="detail-result-block__title">拒绝原因</div>
            <div class="detail-result-block__content">
              <template v-if="detailData.rejectReasons && detailData.rejectReasons.length">
                <div v-for="(reason, idx) in detailData.rejectReasons" :key="`reject-${idx}`" class="reject-reason-item">
                  {{ reason }}
                </div>
              </template>
              <span v-else>{{ detailData.rejectReason || '-' }}</span>
            </div>
          </div>

          <div
            v-if="String(detailData.status) === '1' && detailData.unionRate !== null && detailData.unionRate !== undefined"
            class="detail-result-block detail-result-block--pass"
          >
            <div class="detail-result-block__title">分润配置</div>
            <div class="detail-result-block__content">
              <div class="profit-view">
                <span class="profit-view__item">公会 {{ parseInt(detailData.unionRate) || 0 }}%</span>
                <span class="profit-view__item">陪陪 {{ parseInt(detailData.waiterRate) || 0 }}%</span>
                <span class="profit-view__item">平台 {{ parseInt(detailData.platformRate) || 0 }}%</span>
              </div>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">公会名称</div>
              <div class="detail-value">{{ detailData.tradeName || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">公会ID</div>
              <div class="detail-value">{{ detailData.tradeIdDisplay || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">公会Logo</div>
              <div class="detail-value">
                <img
                  v-if="detailData.logoUrl"
                  :src="detailData.logoUrl"
                  class="dialog-thumb"
                  @click="previewLogo(detailData)"
                  @error="handleImgError"
                />
                <span v-else>-</span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">公会负责人</div>
              <div class="detail-value">{{ detailData.tradeNamePerson || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">联系方式</div>
              <div class="detail-value">
                <span class="phone-inline">
                  {{ viewPhoneVisible ? (detailData.phoneFull || detailData.phone || '-') : (detailData.phoneFull ? `${detailData.phoneFull.slice(0, 3)}****${detailData.phoneFull.slice(7)}` : maskPhone(detailData.phone)) }}
                  <i
                    v-if="detailData.phoneCanReveal"
                    class="el-icon-view phone-eye is-active"
                    @click="viewPhoneVisible = !viewPhoneVisible"
                  />
                </span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">提交时间</div>
              <div class="detail-value">{{ detailData.createTime || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">营业执照</div>
              <div class="detail-value">
                <img
                  v-if="detailData.businessLicenseUrl"
                  :src="detailData.businessLicenseUrl"
                  class="dialog-thumb"
                  @click="previewLicense(detailData)"
                  @error="handleImgError"
                />
                <span v-else>-</span>
              </div>
            </div>
            <!-- <div class="detail-item">
              <div class="detail-label">审核人</div>
              <div class="detail-value">{{ detailData.auditByName || '-' }}</div>
            </div> -->
            <div class="detail-item detail-item--full">
              <div class="detail-label">营业场所照片</div>
              <div class="detail-value">
                <div v-if="detailPhotos.length" class="photo-cell">
                  <img
                    v-for="(url, index) in detailPhotos"
                    :key="`view-photo-${index}`"
                    :src="url"
                    class="dialog-thumb"
                    @click="previewPhotos(detailData, index)"
                    @error="handleImgError"
                  />
                </div>
                <span v-else>-</span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">身份证人像面</div>
              <div class="detail-value">
                <img
                  v-if="detailData.idCardFrontUrl"
                  :src="detailData.idCardFrontUrl"
                  class="dialog-thumb"
                  @click="previewIdCardFront"
                  @error="handleImgError"
                />
                <span v-else>-</span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">身份证国徽面</div>
              <div class="detail-value">
                <img
                  v-if="detailData.idCardBackUrl"
                  :src="detailData.idCardBackUrl"
                  class="dialog-thumb"
                  @click="previewIdCardBack"
                  @error="handleImgError"
                />
                <span v-else>-</span>
              </div>
            </div>
            <!-- <div class="detail-item">
              <div class="detail-label">审核时间</div>
              <div class="detail-value">{{ detailData.auditTime || '-' }}</div>
            </div> -->
          </div>
        </template>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="viewDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 图片放大 -->
    <ImgZoom v-model="logoZoomVisible" :img-list="[previewLogoUrl]" />
    <ImgZoom v-model="licenseZoomVisible" :img-list="[previewLicenseUrl]" />
    <ImgZoom v-model="photosZoomVisible" :img-list="previewPhotoList" :init-index="previewPhotoIndex" />
    <ImgZoom v-model="idCardFrontZoomVisible" :img-list="[previewIdCardFrontUrl]" />
    <ImgZoom v-model="idCardBackZoomVisible" :img-list="[previewIdCardBackUrl]" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import checkPermission from "@/utils/checkPermission";
import {
  listUnionAudit,
  detailUnionAudit,
  approveUnionAudit,
  rejectUnionAudit
} from "@/api/unionAudit";

export default {
  name: "UnionAuditList",
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom
  },
  data() {
    return {
      searchItems: [
        {
          type: "input",
          prop: "tradeName",
          label: "公会名称",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "input",
          prop: "tradeNamePerson",
          label: "负责人",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "input",
          prop: "phone",
          label: "手机号",
          placeholder: "请输入",
          clearable: true
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "待审核", value: "0" },
            { label: "已通过", value: "1" },
            { label: "未通过", value: "2" }
          ],
          clearable: true
        },
        {
          type: "daterange",
          prop: "submitTimeRange",
          label: "提交时间",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          rangeSeparator: "~"
        }
      ],
      filterForm: {
        tradeName: "",
        tradeNamePerson: "",
        phone: "",
        status: "0",
        submitTimeRange: []
      },

      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      tableHeight: 400,

      // 审核弹窗
      auditDialogVisible: false,
      auditSubmitting: false,
      auditPhoneVisible: false,
      currentRow: null,
      auditForm: {
        result: "approve",
        unionRate: "",
        waiterRate: "",
        platformRate: "",
        rejectReason: ""
      },
      rejectRules: {
        rejectReason: [
          { required: true, message: "请填写拒绝原因", trigger: "blur" }
        ]
      },

      // 查看弹窗
      viewDialogVisible: false,
      viewPhoneVisible: false,

      // 详情数据（审核/查看弹窗共用）
      detailData: null,
      detailLoading: false,

      // 图片放大
      logoZoomVisible: false,
      previewLogoUrl: "",
      licenseZoomVisible: false,
      previewLicenseUrl: "",
      photosZoomVisible: false,
      previewPhotoList: [],
      previewPhotoIndex: 0,
      idCardFrontZoomVisible: false,
      previewIdCardFrontUrl: "",
      idCardBackZoomVisible: false,
      previewIdCardBackUrl: ""
    };
  },

  computed: {
    detailPhotos() {
      return this.photoList(this.detailData && this.detailData.photosUrl);
    },
    auditProfitSum() {
      return this.rateNumber(this.auditForm.unionRate)
        + this.rateNumber(this.auditForm.waiterRate)
        + this.rateNumber(this.auditForm.platformRate);
    },
    canSubmitAudit() {
      if (!this.detailData) return false;
      if (this.auditForm.result === "approve") {
        return this.auditProfitSum === 100;
      }
      return !!(this.auditForm.rejectReason && this.auditForm.rejectReason.trim());
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.setTableHeight();
    });
    window.addEventListener("resize", this.setTableHeight);
    this.fetchTableData();
    this.$store.dispatch("app/fetchMenuBadges");
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.setTableHeight);
  },

  methods: {
    checkPermission,

    setTableHeight() {
      const el = this.$refs.tableWrapper;
      if (el) {
        this.tableHeight = el.clientHeight;
      }
    },

    // ==================== 数据获取 ====================
    async fetchTableData() {
      this.loading = true;
      try {
        const range = this.filterForm.submitTimeRange || [];
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          tradeName: this.filterForm.tradeName || undefined,
          tradeNamePerson: this.filterForm.tradeNamePerson || undefined,
          phone: this.filterForm.phone || undefined,
          status: this.filterForm.status !== "" && this.filterForm.status !== undefined
            ? this.filterForm.status
            : undefined,
          startTime: range[0] || undefined,
          endTime: range[1] || undefined
        };

        Object.keys(params).forEach((key) => {
          if (params[key] === undefined || params[key] === null || params[key] === "") {
            delete params[key];
          }
        });

        const res = await listUnionAudit(params);

        if (res.success) {
          const data = res.data;
          this.tableData = (data.rows || []).map((item) => ({
            ...item,
            showPhone: false
          }));
          this.pagination.total = data.total || 0;
        } else {
          this.$message.error(res.errorMessage || "查询失败");
          this.tableData = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error("获取列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取数据失败，请稍后重试");
      } finally {
        this.loading = false;
      }
    },

    // ==================== 搜索 / 重置 ====================
    handleSearch(e) {
      if (e) {
        this.filterForm = { ...this.filterForm, ...e };
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.filterForm = {
        tradeName: "",
        tradeNamePerson: "",
        phone: "",
        status: "0",
        submitTimeRange: []
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },

    // ==================== 列表展示逻辑 ====================
    rowIndex(index) {
      return (this.pagination.pageNum - 1) * this.pagination.pageSize + index + 1;
    },

    getStatusText(status) {
      const map = { "0": "待审核", "1": "已通过", "2": "未通过" };
      return map[String(status)] || status || "-";
    },

    getStatusTag(status) {
      const map = { "0": "warning", "1": "success", "2": "danger" };
      return map[String(status)] || "info";
    },

    maskPhone(phone) {
      if (phone === null || phone === undefined || phone === "") return "-";
      const str = String(phone).trim();
      if (/^\d{11}$/.test(str)) {
        return `${str.slice(0, 3)}****${str.slice(7)}`;
      }
      return str;
    },

    photoList(value) {
      if (!value) return [];
      const list = Array.isArray(value) ? value : String(value).split(",");
      return list
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter((item) => item);
    },

    handleImgError(e) {
      e.target.src = require("@/assets/defaulIcon.png");
      e.target.onerror = null;
    },

    // ==================== 图片放大 ====================
    previewLogo(row) {
      if (row && row.logoUrl) {
        this.previewLogoUrl = row.logoUrl;
        this.logoZoomVisible = true;
      }
    },

    previewLicense(row) {
      if (row && row.businessLicenseUrl) {
        this.previewLicenseUrl = row.businessLicenseUrl;
        this.licenseZoomVisible = true;
      }
    },

    previewPhotos(row, index = 0) {
      const list = this.photoList(row && row.photosUrl);
      if (!list.length) return;
      this.previewPhotoList = list;
      this.previewPhotoIndex = index || 0;
      this.photosZoomVisible = true;
    },

    previewIdCardFront() {
      if (this.detailData && this.detailData.idCardFrontUrl) {
        this.previewIdCardFrontUrl = this.detailData.idCardFrontUrl;
        this.idCardFrontZoomVisible = true;
      }
    },

    previewIdCardBack() {
      if (this.detailData && this.detailData.idCardBackUrl) {
        this.previewIdCardBackUrl = this.detailData.idCardBackUrl;
        this.idCardBackZoomVisible = true;
      }
    },

    // ==================== 分润配置 ====================
    rateNumber(value) {
      const num = Number(value);
      return Number.isNaN(num) ? 0 : num;
    },

    handleRateInput(field) {
      const cleaned = String(this.auditForm[field] || "").replace(/\D/g, "").slice(0, 3);
      let num = Number(cleaned);
      if (num > 100) num = 100;
      this.auditForm[field] = num === 0 && cleaned === "" ? "" : String(num);
    },

    // ==================== 审核弹窗 ====================
    async openAuditDialog(row) {
      this.currentRow = row;
      this.auditPhoneVisible = false;
      this.auditDialogVisible = true;
      await this.fetchDetail(row);
    },

    openViewDialog(row) {
      this.currentRow = row;
      this.viewPhoneVisible = false;
      this.viewDialogVisible = true;
      this.fetchDetail(row);
    },

    async fetchDetail(row) {
      this.detailLoading = true;
      this.detailData = null;
      try {
        const res = await detailUnionAudit({ applyId: row.applyId });
        if (res.success) {
          this.detailData = res.data || row;
        } else {
          this.detailData = row;
          this.$message.error(res.errorMessage || "获取详情失败");
        }
      } catch (error) {
        console.error("获取详情失败:", error);
        this.detailData = row;
      } finally {
        this.detailLoading = false;
      }
    },

    resetAuditDialog() {
      this.auditForm = {
        result: "approve",
        unionRate: "",
        waiterRate: "",
        platformRate: "",
        rejectReason: ""
      };
      this.auditSubmitting = false;
      this.auditPhoneVisible = false;
      this.currentRow = null;
      this.detailData = null;
      if (this.$refs.rejectForm) {
        this.$refs.rejectForm.clearValidate();
      }
    },

    async submitAudit() {
      if (!this.detailData) return;
      if (!this.canSubmitAudit) {
        this.$message.warning(this.auditForm.result === "approve"
          ? "分润比例合计须为100%"
          : "请填写拒绝原因");
        return;
      }
      this.auditSubmitting = true;
      try {
        let res;
        if (this.auditForm.result === "approve") {
          res = await approveUnionAudit({
            applyId: this.detailData.applyId,
            unionRate: this.rateNumber(this.auditForm.unionRate),
            waiterRate: this.rateNumber(this.auditForm.waiterRate),
            platformRate: this.rateNumber(this.auditForm.platformRate)
          });
        } else {
          res = await rejectUnionAudit({
            applyId: this.detailData.applyId,
            rejectReason: this.auditForm.rejectReason.trim()
          });
        }

        if (res.success) {
          this.$message.success(this.auditForm.result === "approve" ? "审核已通过" : "已驳回");
          this.auditDialogVisible = false;
          this.fetchTableData();
          this.$store.dispatch("app/fetchMenuBadges");
        } else {
          this.$message.error(res.errorMessage || "操作失败");
        }
      } catch (error) {
        console.error("审核失败:", error);
        this.$message.error("操作失败，请稍后重试");
      } finally {
        this.auditSubmitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.list-wrapper {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-module {
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 24px;

  ::v-deep .el-card__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
    padding-bottom: 0;
  }
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pagination-wrapper {
  flex-shrink: 0;
  border-top: 1px solid #ebeeF5;
  display: flex;
  justify-content: flex-end;
}

/* ===== 缩略图 ===== */
.avatar-cell {
  cursor: zoom-in;
  display: inline-block;
}

.avatar-thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  cursor: zoom-in;
  display: inline-block;
  vertical-align: middle;
  background: #f5f5f8;
}

.photo-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.photo-thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  cursor: zoom-in;
  background: #f5f5f8;
}

/* ===== 手机号 ===== */
.phone-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.phone-eye {
  font-size: 14px;
  color: #c0c4cc;
  cursor: pointer;

  &.is-active {
    color: #409eff;
  }
}

.phone-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ===== 弹窗 ===== */
.audit-dialog {
  ::v-deep .el-dialog {
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 50px rgba(38, 45, 64, 0.16);
    background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);

    &__header {
      padding: 16px 20px 14px;
      border-bottom: 1px solid #eef1f7;
      background: linear-gradient(135deg, rgba(106, 53, 255, 0.04), rgba(64, 158, 255, 0.02));
    }

    &__title {
      font-weight: 700;
      color: #1f2430;
      letter-spacing: 0.2px;
      font-size: 18px;
    }

    &__headerbtn {
      top: 14px;
      right: 14px;
    }

    &__body {
      padding: 18px 16px 14px;
      max-height: 60vh;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(248, 249, 255, 0.9), rgba(255, 255, 255, 1));
    }

    &__footer {
      padding: 12px 18px 16px;
      border-top: 1px solid #ebeef5;
      background: rgba(255, 255, 255, 0.9);
    }
  }
}

.dialog-body {
  min-height: 100px;
}

.dialog-thumb {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  cursor: zoom-in;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 6px 18px rgba(17, 24, 39, 0.08);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
}

/* 只读信息区 */
.info-section {
  background: linear-gradient(135deg, #ffffff 0%, #f7f8ff 100%);
  border-radius: 14px;
  border: 1px solid #edf1f7;
  padding: 14px 14px 4px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);

  .info-row {
    display: flex;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .info-col {
      flex: 1;
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid #edf1f7;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.7);

      &:first-child {
        margin-right: 12px;
      }

      &--full {
        flex: 0 0 100%;
        margin-right: 0;
      }
    }
  }

  .info-label {
    font-size: 12px;
    color: #909399;
    margin-bottom: 8px;
  }

  .info-value {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
    min-height: 22px;
    line-height: 22px;
  }

  .photo-cell {
    justify-content: flex-start;
  }
}

.form-divider {
  margin: 20px 0;
  background-color: #e8e4f4;
}

/* 审核操作区 */
.audit-op {
  ::v-deep .el-form-item__label {
    color: #1d2129;
  }

  ::v-deep .el-form-item {
    margin-bottom: 18px;
  }
}

/* 分润配置 */
.profit-block {
  padding: 16px;
  border: 1px solid #ece8f8;
  border-radius: 14px;
  background: linear-gradient(135deg, #fcfbff 0%, #f5f3ff 100%);
  margin-top: 8px;
  box-shadow: 0 10px 24px rgba(106, 53, 255, 0.05);

  .profit-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .profit-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .profit-sum {
      font-size: 14px;
      font-weight: 600;
      color: #1bc286;

      &.is-error {
        color: #ff4d4f;
      }
    }
  }

  .profit-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .profit-label {
    font-size: 13px;
    color: #606266;
    margin-bottom: 8px;
  }

  .percent-field {
    position: relative;

    ::v-deep .el-input__inner {
      padding-right: 32px;
      border-radius: 8px;
    }
  }

  .percent-field__unit {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #909399;
    font-size: 14px;
    pointer-events: none;
  }

  .profit-hint {
    margin: 12px 0 0;
    font-size: 13px;
    color: #ff4d4f;
  }

  .profit-ok {
    margin: 12px 0 0;
    font-size: 13px;
    color: #1bc286;
  }
}

/* 拒绝原因 */
.reject-block {
  margin-top: 8px;
}

.reject-reason-item {
  font-size: 14px;
  color: #303133;
  line-height: 22px;
  padding: 4px 0;
}

/* 查看弹窗详情 */
.detail-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #edf1f7;
  background: linear-gradient(135deg, #f7f8ff 0%, #ffffff 100%);
  margin-bottom: 12px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.03);

  &--pass {
    background: linear-gradient(135deg, rgba(31, 196, 130, 0.08) 0%, rgba(255, 255, 255, 1) 100%);
    border-color: rgba(31, 196, 130, 0.2);
  }

  &--reject {
    background: linear-gradient(135deg, rgba(245, 108, 108, 0.08) 0%, rgba(255, 255, 255, 1) 100%);
    border-color: rgba(245, 108, 108, 0.22);
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  &__label {
    font-size: 12px;
    color: #909399;
  }

  &__value {
    display: flex;
    align-items: center;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px 16px;
    font-size: 12px;
    color: #606266;
  }

  &__meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    em {
      font-style: normal;
      color: #909399;
      font-weight: 400;
    }
  }
}

.detail-result-block {
  margin-bottom: 10px;
  border-radius: 10px;
  border: 1px solid #edf1f7;
  background: #f9fafc;
  padding: 10px 12px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.02);

  &--pass {
    border-color: rgba(31, 196, 130, 0.2);
    background: rgba(31, 196, 130, 0.04);
  }

  &--reject {
    border-color: rgba(245, 108, 108, 0.2);
    background: rgba(245, 108, 108, 0.04);
  }

  &__title {
    font-size: 12px;
    color: #909399;
    margin-bottom: 10px;
  }

  &__content {
    font-size: 14px;
    color: #303133;
    line-height: 1.8;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
}

.detail-item {
  padding: 8px 10px;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fafc 100%);
  min-height: 58px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.02);

  &--full {
    grid-column: 1 / -1;
  }

  .photo-cell {
    justify-content: flex-start;
  }

  .detail-label {
    font-size: 12px;
    color: #909399;
    margin-bottom: 6px;
  }

  .detail-value {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
    min-height: 18px;
    word-break: break-all;
    line-height: 1.5;
  }
}

.profit-view {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .profit-view__item {
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(106, 53, 255, 0.08);
    color: #6a35ff;
    font-size: 12px;
    border: 1px solid rgba(106, 53, 255, 0.12);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 900px) {
  .profit-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .info-section .info-row {
    flex-direction: column;

    .info-col {
      margin-right: 0;
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
