<template>
  <div class="container-body">
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" labelWidth="100px" :initial-values="filterForm" :gutter="20"
        :confirm-reset="true" confirm-reset-message="确定要重置所有筛选条件吗？" @search="handleSearch" @reset="handleReset" />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="reportId" v-loading="loading" :border="false" height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="content" label="反馈问题" min-width="200" show-overflow-tooltip />
          <el-table-column label="问题图片" min-width="180">
            <template slot-scope="scope">
              <template v-if="scope.row.reportImgList && scope.row.reportImgList.length > 0">
                <div class="img-cell" v-for="(img, index) in scope.row.reportImgList" :key="index"
                  @click="previewImages(scope.row.reportImgList, index)">
                  <img :src="img" class="img-thumb" />
                </div>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="被举报人账号信息" min-width="140">
            <template slot-scope="scope">
              <div class="account-info">
                <div>{{ scope.row.reportedName || '-' }}</div>
                <div class="sub-text">{{ scope.row.reportedId || '-' }}</div>
                <div class="sub-text"><PhoneDisplay :value="scope.row.reportedPhonenumber" /></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="发起人账号信息" min-width="140">
            <template slot-scope="scope">
              <div class="account-info">
                <div>{{ scope.row.whistleblowerName || '-' }}</div>
                <div class="sub-text">{{ scope.row.whistleblowerId || '-' }}</div>
                <div class="sub-text"><PhoneDisplay :value="scope.row.whistleblowerPhonenumber" /></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="举报时间" width="160" />
          <el-table-column label="处理操作" min-width="160">
            <template slot-scope="scope">
              <div v-if="getHandleTexts(scope.row).length" class="handle-ops">
                <div v-for="(text, index) in getHandleTexts(scope.row)" :key="index" class="handle-ops__item">
                  {{ text }}
                </div>
              </div>
              <span v-else class="handle-ops__empty"></span>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="220">
            <template slot-scope="scope">
              <div class="action-buttons" v-if="scope.row.status === '1'">
                <el-button
                  v-if="scope.row.isDisabled != 1 && scope.row.isDisabled != '1'"
                  type="text" size="mini" style="color: #f56c6c" @click="handleBanAccount(scope.row)">
                  禁用账号
                </el-button>
                <el-button
                  v-if="scope.row.isDelSkill != 1 && scope.row.isDelSkill != '1'"
                  type="text" size="mini" style="color: #f56c6c" @click="handleFreezeSkill(scope.row)">
                  冻结陪玩技能
                </el-button>
                <el-button
                  v-if="scope.row.isDisabled != 1 && scope.row.isDisabled != '1' && scope.row.isDelSkill != 1 && scope.row.isDelSkill != '1'"
                  type="text" size="mini" style="color: #9047f8" @click="handleNoAction(scope.row)">
                  不处理
                </el-button>
              </div>
              <span v-else-if="scope.row.status === '3'" class="status-no-action"></span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <div class="total-text">总计：{{ pagination.total }}条</div>
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          :selected-rows="[]" @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <ImgZoom v-model="imgZoomVisible" :img-list="previewImgList" :initIndex="previewImgIndex" />

    <!-- 视频/音频预览弹窗 -->
    <el-dialog :visible.sync="mediaDialogVisible" width="640px" :close-on-click-modal="true"
      @close="handleMediaDialogClose" custom-class="media-dialog">
      <video v-if="mediaType === 'video'" :src="mediaUrl" controls autoplay class="media-player" />
      <audio v-else-if="mediaType === 'audio'" :src="mediaUrl" controls autoplay class="media-player audio-player" />
    </el-dialog>

    <!-- 禁用账号弹窗 -->
    <BanUserDialog ref="banUserDialog" :visible.sync="banDialogVisible" @success="fetchTableData" />

    <!-- 冻结陪玩技能弹窗 -->
    <el-dialog
      :visible.sync="freezeDialogVisible"
      width="560px"
      custom-class="freeze-skill-dialog"
      append-to-body
      :close-on-click-modal="false"
      :show-close="false"
      @close="resetFreezeForm"
    >
      <div class="freeze-dialog__panel" v-loading="freezeLoading">
        <div class="freeze-dialog__header">
          <div>
            <div class="freeze-dialog__title">冻结陪玩技能</div>
            <div class="freeze-dialog__subtitle">请勾选需要冻结的技能</div>
          </div>
          <div class="freeze-dialog__user">用户ID {{ (currentRow && currentRow.reportedId) || '--' }}</div>
        </div>

        <el-form
          ref="freezeFormRef"
          :model="freezeForm"
          :rules="freezeRules"
          label-width="90px"
          class="freeze-dialog__form"
        >
          <div class="freeze-dialog__skill-card">
            <template v-if="skillList.length">
              <div class="freeze-skill-toolbar">
                <div class="freeze-skill-toolbar__left">
                  <button
                    type="button"
                    class="freeze-skill-select-all"
                    :class="{ 'is-active': skillCheckAll, 'is-partial': skillIndeterminate }"
                    @click="handleSkillCheckAll(!skillCheckAll)"
                  >
                    <i :class="skillCheckAll ? 'el-icon-success' : skillIndeterminate ? 'el-icon-remove-outline' : 'el-icon-circle-check'" />
                    <span>{{ skillCheckAll ? '取消全选' : '全选技能' }}</span>
                  </button>
                </div>
                <div class="freeze-skill-count" :class="{ 'is-ready': freezeForm.priceIds.length > 0 }">
                  <span class="freeze-skill-count__num">{{ freezeForm.priceIds.length }}</span>
                  <span class="freeze-skill-count__sep">/</span>
                  <span>{{ skillList.length }}</span>
                  <span class="freeze-skill-count__label">已选</span>
                </div>
              </div>
              <el-form-item prop="priceIds" label-width="0" class="freeze-skill-form-item">
                <div class="freeze-skill-grid">
                  <button
                    v-for="item in skillList"
                    :key="item.priceId"
                    type="button"
                    class="freeze-skill-chip"
                    :class="{ 'is-active': isSkillSelected(item.priceId) }"
                    @click="toggleSkill(item.priceId)"
                  >
                    <span class="freeze-skill-chip__check">
                      <i class="el-icon-check" />
                    </span>
                    <span class="freeze-skill-chip__body">
                      <span class="freeze-skill-chip__name" :title="item.productName || '未命名技能'">
                        {{ item.productName || '未命名技能' }}
                      </span>
                      <span
                        v-if="item.isTechnicalWaiter === 1 || item.isTechnicalWaiter === '1'"
                        class="freeze-skill-chip__tag"
                      >技术陪</span>
                      <span v-else class="freeze-skill-chip__tag is-normal">娱乐陪</span>
                    </span>
                  </button>
                </div>
              </el-form-item>
            </template>
            <div v-else class="freeze-empty">
              <div class="freeze-empty__icon"><i class="el-icon-folder-opened" /></div>
              <div class="freeze-empty__title">当前账号下无有效技能</div>
              <div class="freeze-empty__desc">该用户暂无可冻结的陪玩游戏</div>
            </div>
          </div>

          <template v-if="skillList.length">
            <div class="freeze-dialog__form-card">
              <el-form-item label="冻结原因" prop="reason">
                <el-input
                  v-model="freezeForm.reason"
                  type="textarea"
                  :rows="3"
                  maxlength="50"
                  show-word-limit
                  placeholder="请输入冻结原因"
                />
              </el-form-item>
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="freezeForm.remark"
                  type="textarea"
                  :rows="2"
                  maxlength="50"
                  show-word-limit
                  placeholder="请输入备注（选填）"
                />
              </el-form-item>
            </div>

            <div class="freeze-dialog__upload-card">
              <div class="freeze-dialog__upload-header">
                <div class="freeze-dialog__upload-title">上传附件（上限5组文件）</div>
                <div class="freeze-dialog__upload-desc">支持图片、录音、视频 · 单文件不超过 100MB</div>
              </div>
              <div class="attachment-list freeze-attachment-list">
                <div
                  class="attachment-item uploaded"
                  v-for="(item, index) in freezeAttachments"
                  :key="'freeze-' + index"
                >
                  <img
                    v-if="item.type === 'image'"
                    :src="item.url"
                    class="attachment-thumb"
                    @click="handlePreviewFreezeImage(index)"
                    style="cursor: pointer"
                  />
                  <template v-else-if="item.type === 'video'">
                    <video
                      :src="item.url"
                      class="attachment-thumb"
                      @click="handlePreviewMedia(item.url, 'video')"
                      style="cursor: pointer"
                      preload="metadata"
                    />
                    <div class="media-icon-overlay"><i class="el-icon-video-play" /></div>
                  </template>
                  <template v-else>
                    <div class="attachment-thumb attachment-audio" @click="handlePreviewMedia(item.url, 'audio')">
                      <i class="el-icon-headset" />
                    </div>
                    <div class="media-icon-overlay"><i class="el-icon-headset" /></div>
                  </template>
                  <el-button
                    type="danger"
                    icon="el-icon-delete"
                    circle
                    size="mini"
                    class="attachment-delete"
                    @click.stop="handleRemoveFreezeAttachment(index)"
                  />
                </div>
                <div class="attachment-item freeze-upload-item" v-if="freezeAttachments.length < 5">
                  <ImageUpload
                    v-model="freezeCurrentAttachment.url"
                    :oss-id="freezeCurrentAttachment.ossId"
                    :size-limit="100"
                    :accept="['png', 'jpg', 'gif', 'jpeg', 'mp3', 'wav', 'mp4', 'm4a', 'avi']"
                    @change="handleFreezeAttachmentChange"
                  />
                </div>
              </div>
            </div>
          </template>
        </el-form>

        <div class="freeze-dialog__footer">
          <el-button class="freeze-dialog__btn freeze-dialog__btn--ghost" @click="freezeDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            class="freeze-dialog__btn freeze-dialog__btn--primary"
            :loading="freezeSubmitting"
            :disabled="!skillList.length || freezeLoading"
            @click="submitFreezeSkill"
          >提交</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImageUpload from "@/components/ImageUpload/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import BanUserDialog from "@/components/BanUserDialog/index.vue";
import {
  getReportComplaintList,
  getReportComplaintDetail,
  getSupportedGames,
  freezeWaiterSkill,
  notProcess
} from "@/api/reportComplaint";

export default {
  name: "ReportComplaintList",
  components: { SearchForm, PaginationSimple, ImageUpload, PhoneDisplay, BanUserDialog },
  data() {
    return {
      searchItems: [
        { type: "input", prop: "whistleblowerId", label: "发起人ID", placeholder: "请输入" },
        { type: "input", prop: "whistleblowerName", label: "发起人名称", placeholder: "请输入" },
        { type: "input", prop: "reportedId", label: "被举报人ID", placeholder: "请输入" },
        { type: "input", prop: "reportedName", label: "被举报人名称", placeholder: "请输入" },
        { type: "daterange", prop: "reportTime", label: "举报时间" }
      ],
      filterForm: {
        whistleblowerId: "",
        whistleblowerName: "",
        reportedId: "",
        reportedName: "",
        reportTime: []
      },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      imgZoomVisible: false,
      previewImgList: [],
      previewImgIndex: 0,
      mediaDialogVisible: false,
      mediaUrl: "",
      mediaType: "",

      banDialogVisible: false,

      // 冻结陪玩技能
      freezeDialogVisible: false,
      freezeLoading: false,
      freezeSubmitting: false,
      skillList: [],
      freezeForm: { priceIds: [], reason: "", remark: "" },
      freezeRules: {
        priceIds: [{ type: "array", required: true, message: "请至少选择一项技能", trigger: "change" }],
        reason: [{ required: true, message: "请输入冻结原因", trigger: "blur" }]
      },
      freezeAttachments: [],
      freezeCurrentAttachment: { url: "", ossId: "" },

      // 当前操作行
      currentRow: null,
    };
  },
  computed: {
    skillCheckAll() {
      return this.skillList.length > 0 &&
        this.skillList.every((item) => this.freezeForm.priceIds.includes(this.normalizeId(item.priceId)));
    },
    skillIndeterminate() {
      const checked = this.skillList.filter((item) =>
        this.freezeForm.priceIds.includes(this.normalizeId(item.priceId))
      );
      return checked.length > 0 && checked.length < this.skillList.length;
    }
  },
  created() {
    this.fetchTableData();
  },
  methods: {
    normalizeId(value) {
      if (value === null || value === undefined || value === "") return "";
      return String(value);
    },

    normalizeSkillList(res) {
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      if (Array.isArray(res?.rows)) return res.rows;
      return [];
    },

    /** 处理操作列文案：不处理 / 禁用账号 / 冻结技能，可多行并存 */
    getHandleTexts(row) {
      if (!row) return [];
      if (String(row.status) === "3") return ["不处理"];

      const backendText = row.handleResult || row.result || row.processResult;
      if (backendText) {
        return String(backendText)
          .split(/[\n,/|]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => item.replace("已冻结陪玩身份", "已冻结陪玩技能"));
      }

      const texts = [];
      const disabled = row.isDisabled === 1 || row.isDisabled === "1";
      const frozen = row.isDelSkill === 1 || row.isDelSkill === "1";
      if (disabled) {
        const banType = row.banType;
        if (banType === 1 || banType === "1") texts.push("已永久禁用账号");
        else if (banType === 0 || banType === "0") texts.push("已临时禁用账号");
        else texts.push("已禁用账号");
      }
      if (frozen) texts.push("已冻结陪玩技能");
      return texts;
    },

    maskPhone(phone) {
      if (!phone || phone.length < 7) return phone || '-';
      return phone.substring(0, 3) + "****" + phone.substring(phone.length - 4);
    },

    previewImages(imgList, index) {
      this.previewImgIndex = index;
      this.previewImgList = imgList;
      this.imgZoomVisible = true;
    },

    handlePreviewMedia(url, type) {
      this.mediaUrl = url;
      this.mediaType = type;
      this.mediaDialogVisible = true;
    },

    handleMediaDialogClose() {
      this.mediaUrl = "";
      this.mediaType = "";
    },

    handleSearch(e) {
      if (e) this.filterForm = { ...this.filterForm, ...e };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.filterForm = { whistleblowerId: "", whistleblowerName: "", reportedId: "", reportedName: "", reportTime: [] };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },

    fetchTableData() {
      this.loading = true;
      const params = {
        ...this.filterForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      if (params.reportTime && params.reportTime.length === 2) {
        params.startTime = params.reportTime[0];
        params.endTime = params.reportTime[1];
      }
      delete params.reportTime;
      Object.keys(params).forEach(key => {
        if (params[key] === "" || params[key] === null || params[key] === undefined ||
          (Array.isArray(params[key]) && params[key].length === 0)) {
          delete params[key];
        }
      });
      getReportComplaintList(params)
        .then(res => {
          if (res.success && res.data && res.data.rows) {
            this.tableData = res.data.rows;
            this.pagination.total = res.data.total || 0;
          } else {
            this.tableData = [];
            this.pagination.total = 0;
          }
          this.loading = false;
        })
        .catch(() => {
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false;
        });
    },

    // 禁用账号
    handleBanAccount(row) {
      this.currentRow = row;
      const openDialog = (detail = {}) => {
        if (!this.$refs.banUserDialog) {
          return;
        }
        this.$refs.banUserDialog.open({
          userId: row.reportedId,
          reportedId: row.reportedId,
          nickName: row.reportedName || detail.reportedName,
          isMember: detail.isMember,
          tradeName: detail.tradeName,
          tradeNo: detail.tradeNo,
          userBanStr: detail.userBanStr
        }, {
          businessType: "REPORT",
          businessNo: row.reportId,
          reportId: row.reportId,
          forceGuild: !!(detail.tradeName || detail.tradeNo)
        });
      };

      getReportComplaintDetail({ reportId: row.reportId })
        .then(res => {
          openDialog((res && res.data) || res || {});
        })
        .catch(() => {
          openDialog({});
        });
    },

    handleFreezeAttachmentChange({ url, ossId, file }) {
      if (!ossId) return;
      let type = "audio";
      if (file && file.type) {
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("video/")) type = "video";
      }
      this.freezeAttachments.push({ url, ossId, type });
      this.freezeCurrentAttachment = { url: "", ossId: "" };
    },

    handleRemoveFreezeAttachment(index) {
      this.freezeAttachments.splice(index, 1);
    },

    handlePreviewFreezeImage(index) {
      this.previewImgList = this.freezeAttachments.filter(a => a.type === "image").map(a => a.url);
      const imgIndex = this.previewImgList.indexOf(this.freezeAttachments[index].url);
      this.previewImgIndex = imgIndex >= 0 ? imgIndex : 0;
      this.imgZoomVisible = true;
    },

    // 冻结陪玩技能
    handleFreezeSkill(row) {
      this.currentRow = row;
      this.freezeForm = { priceIds: [], reason: "", remark: "" };
      this.freezeAttachments = [];
      this.freezeCurrentAttachment = { url: "", ossId: "" };
      this.skillList = [];
      this.freezeDialogVisible = true;
      this.freezeLoading = true;
      getSupportedGames(row.reportedId)
        .then((res) => {
          this.skillList = this.normalizeSkillList(res).map((item) => ({
            ...item,
            priceId: this.normalizeId(item.priceId)
          }));
        })
        .catch(() => {
          this.skillList = [];
        })
        .finally(() => {
          this.freezeLoading = false;
        });
    },

    handleSkillCheckAll(val) {
      if (val) {
        this.freezeForm.priceIds = this.skillList.map((item) => this.normalizeId(item.priceId));
      } else {
        this.freezeForm.priceIds = [];
      }
      this.$nextTick(() => {
        if (this.$refs.freezeFormRef) {
          this.$refs.freezeFormRef.validateField("priceIds");
        }
      });
    },

    isSkillSelected(priceId) {
      return this.freezeForm.priceIds.includes(this.normalizeId(priceId));
    },

    toggleSkill(priceId) {
      const id = this.normalizeId(priceId);
      const index = this.freezeForm.priceIds.indexOf(id);
      if (index > -1) {
        this.freezeForm.priceIds.splice(index, 1);
      } else {
        this.freezeForm.priceIds.push(id);
      }
      this.$nextTick(() => {
        if (this.$refs.freezeFormRef) {
          this.$refs.freezeFormRef.validateField("priceIds");
        }
      });
    },

    resetFreezeForm() {
      this.freezeForm = { priceIds: [], reason: "", remark: "" };
      this.freezeAttachments = [];
      this.freezeCurrentAttachment = { url: "", ossId: "" };
      this.skillList = [];
      this.freezeSubmitting = false;
      this.freezeLoading = false;
      if (this.$refs.freezeFormRef) this.$refs.freezeFormRef.clearValidate();
    },

    submitFreezeSkill() {
      if (!this.skillList.length) {
        this.$message.warning("当前账号下无有效技能");
        return;
      }
      this.$refs.freezeFormRef.validate((valid) => {
        if (!valid) return;
        if (!this.freezeForm.priceIds.length) {
          this.$message.warning("请至少选择一项技能");
          return;
        }
        this.freezeSubmitting = true;
        const data = {
          userId: this.normalizeId(this.currentRow.reportedId),
          priceIds: this.freezeForm.priceIds.map((id) => this.normalizeId(id)),
          reason: this.freezeForm.reason.trim(),
          reportId: this.normalizeId(this.currentRow.reportId)
        };
        const remark = (this.freezeForm.remark || "").trim();
        if (remark) data.remark = remark;
        const ossIds = this.freezeAttachments.map((a) => a.ossId).filter(Boolean);
        if (ossIds.length) data.ossIds = ossIds;

        freezeWaiterSkill(data)
          .then(() => {
            this.$message.success("冻结成功");
            this.freezeDialogVisible = false;
            this.fetchTableData();
          })
          .catch(() => {})
          .finally(() => {
            this.freezeSubmitting = false;
          });
      });
    },

    // 不处理
    handleNoAction(row) {
      this.$confirm("确定对该举报不作处理吗？", "确认不处理", { type: "warning" })
        .then(() => {
          notProcess({ reportId: row.reportId })
            .then(() => {
              this.$message.success("已标记为不处理");
              this.fetchTableData();
            })
            .catch(() => { });
        })
        .catch(() => { });
    }
  }
};
</script>

<style scoped lang="scss">
.container-body {
  height: 100%;
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
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-text {
  font-size: 14px;
  color: #606266;
}

.account-info {
  text-align: center;
  line-height: 1.6;
}

.sub-text {
  font-size: 12px;
  color: #909399;
}

.img-cell {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  margin-right: 4px;
  justify-content: flex-start;
}

.img-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.img-count {
  position: absolute;
  right: -6px;
  top: -6px;
  background: #9047f8;
  color: #fff;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 8px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.status-no-action {
  color: #909399;
}

.handle-ops {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  line-height: 1.5;
  color: #606266;
  font-size: 13px;
}

.handle-ops__item {
  white-space: nowrap;
}

.handle-ops__empty {
  display: inline-block;
  min-height: 1em;
}

.club-info {
  margin-bottom: 16px;
  color: #606266;
}

.attachment-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.attachment-audio {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: #f5f7fa;
  cursor: pointer;
}

.attachment-audio i {
  font-size: 32px;
  color: #909399;
}

.attachment-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 2;
}

::v-deep .el-upload__tip {
  font-size: 12px;
  color: #909399;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-item {
  width: 88px;
  height: 88px;
  position: relative;
  border: 1px dashed #d9d9d9;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
}

.attachment-item.uploaded {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: solid;
  border-color: #e8eaf0;
}

.attachment-item.uploaded:hover .attachment-delete {
  opacity: 1;
}

.attachment-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-icon-overlay {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.media-icon-overlay i {
  color: #fff;
  font-size: 14px;
}

.attachment-item ::v-deep .el-upload__tip {
  display: none;
}

::v-deep .media-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.media-player {
  width: 100%;
  max-height: 500px;
  display: block;
}

.audio-player {
  height: 54px;
  margin-top: 40px;
}

::v-deep .el-checkbox__label {
  font-size: 13px;
}

::v-deep .freeze-skill-dialog {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(31, 37, 51, 0.14);
}

::v-deep .freeze-skill-dialog .el-dialog__header {
  display: none;
}

::v-deep .freeze-skill-dialog .el-dialog__body {
  padding: 0;
}

.freeze-dialog__panel {
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 26%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.08), transparent 24%),
    linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
}

.freeze-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.freeze-dialog__title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2533;
  line-height: 1.3;
}

.freeze-dialog__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #8a93a6;
  line-height: 1.5;
}

.freeze-dialog__user {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(144, 71, 248, 0.08);
  color: #9047f8;
  font-size: 12px;
  font-weight: 600;
}

.freeze-dialog__skill-card,
.freeze-dialog__form-card,
.freeze-dialog__upload-card {
  background: #fff;
  border: 1px solid #eef0f5;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
}

.freeze-skill-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.freeze-skill-select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #ebe7ff;
  border-radius: 999px;
  background: #f7f4ff;
  color: #7a4dff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.freeze-skill-select-all:hover {
  background: #efe9ff;
  border-color: #d9ccff;
}

.freeze-skill-select-all.is-active,
.freeze-skill-select-all.is-partial {
  background: linear-gradient(135deg, #8f03ff 0%, #5b6cff 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 6px 16px rgba(143, 3, 255, 0.22);
}

.freeze-skill-count {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f4f6fb;
  color: #909399;
  font-size: 12px;
  transition: all 0.2s ease;
}

.freeze-skill-count.is-ready {
  background: rgba(143, 3, 255, 0.08);
  color: #7a4dff;
}

.freeze-skill-count__num {
  font-size: 16px;
  font-weight: 700;
  color: inherit;
}

.freeze-skill-count__sep {
  margin: 0 1px;
  opacity: 0.6;
}

.freeze-skill-count__label {
  margin-left: 4px;
  opacity: 0.8;
}

.freeze-skill-form-item {
  margin-bottom: 0 !important;
}

.freeze-skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.freeze-skill-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid #e8ebf2;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfe 100%);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.freeze-skill-chip:hover {
  transform: translateY(-1px);
  border-color: #d2c4ff;
  box-shadow: 0 8px 18px rgba(91, 108, 255, 0.08);
}

.freeze-skill-chip.is-active {
  border-color: transparent;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(135deg, #8f03ff, #5b6cff) border-box;
  border: 1.5px solid transparent;
  box-shadow: 0 10px 22px rgba(143, 3, 255, 0.12);
}

.freeze-skill-chip__check {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid #d5dae5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  background: #fff;
  transition: all 0.18s ease;
}

.freeze-skill-chip.is-active .freeze-skill-chip__check {
  border-color: transparent;
  background: linear-gradient(135deg, #8f03ff 0%, #5b6cff 100%);
  color: #fff;
  box-shadow: 0 4px 10px rgba(143, 3, 255, 0.28);
}

.freeze-skill-chip__check i {
  font-size: 12px;
  font-weight: 700;
}

.freeze-skill-chip__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.freeze-skill-chip__name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2533;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.freeze-skill-chip__tag {
  align-self: flex-start;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 16px;
  color: #8f03ff;
  background: rgba(143, 3, 255, 0.08);
}

.freeze-skill-chip__tag.is-normal {
  color: #5b6cff;
  background: rgba(91, 108, 255, 0.08);
}

.freeze-empty {
  text-align: center;
  color: #909399;
  padding: 28px 12px 20px;
}

.freeze-empty__icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 10px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f6fb;
  color: #a0a7b8;
  font-size: 22px;
}

.freeze-empty__title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.freeze-empty__desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.freeze-dialog__form ::v-deep .el-form-item {
  margin-bottom: 14px;
}

.freeze-dialog__form ::v-deep .el-form-item:last-child {
  margin-bottom: 0;
}

.freeze-dialog__form ::v-deep .el-form-item__label {
  color: #606266;
  font-weight: 500;
}

.freeze-dialog__form ::v-deep .el-textarea__inner {
  border-radius: 10px;
  border-color: #e6e8ef;
}

.freeze-dialog__form ::v-deep .el-textarea__inner:focus {
  border-color: #9047f8;
}

.freeze-dialog__upload-header {
  margin-bottom: 12px;
}

.freeze-dialog__upload-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2533;
}

.freeze-dialog__upload-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.freeze-attachment-list {
  gap: 10px;
}

.freeze-attachment-list .attachment-item.uploaded {
  border-radius: 12px;
  border-color: #ebe7ff;
  box-shadow: 0 6px 14px rgba(106, 53, 255, 0.06);
}

.freeze-upload-item {
  width: 96px !important;
  height: 96px !important;
  border: none !important;
  background: transparent !important;
  overflow: visible !important;
}

.freeze-upload-item ::v-deep .avatar-uploader,
.freeze-upload-item ::v-deep .el-upload {
  width: 100%;
  height: 100%;
  display: block;
}

.freeze-upload-item ::v-deep .upload-container {
  width: 96px;
  height: 96px;
  border: 1.5px dashed #d5c8ff;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(247, 244, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: inset 0 0 0 1px rgba(143, 3, 255, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.freeze-upload-item ::v-deep .upload-container:hover {
  border-color: #9047f8;
  box-shadow:
    0 10px 22px rgba(144, 71, 248, 0.12),
    inset 0 0 0 1px rgba(144, 71, 248, 0.06);
  transform: translateY(-1px);
}

.freeze-upload-item ::v-deep .upload-placeholder {
  gap: 8px;
  color: #7a4dff;
}

.freeze-upload-item ::v-deep .upload-placeholder .el-icon-plus {
  width: 28px;
  height: 28px;
  margin: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8f03ff 0%, #6a4ce0 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 6px 14px rgba(143, 3, 255, 0.28);
}

.freeze-upload-item ::v-deep .upload-text {
  font-size: 12px;
  font-weight: 600;
  color: #7a4dff;
  line-height: 1;
}

.freeze-upload-item ::v-deep .uploading-content {
  color: #9047f8;
}

.freeze-upload-item ::v-deep .el-upload__tip {
  display: none !important;
}

.freeze-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.freeze-dialog__btn {
  min-width: 88px;
  border-radius: 10px;
  font-weight: 600;
}

.freeze-dialog__btn--ghost {
  color: #606266;
  background: #f3f4f8;
  border-color: #f3f4f8;
}

.freeze-dialog__btn--ghost:hover,
.freeze-dialog__btn--ghost:focus {
  color: #303133;
  background: #e9ebf2;
  border-color: #e9ebf2;
}

.freeze-dialog__btn--primary {
  background: #2f3542;
  border-color: #2f3542;
}

.freeze-dialog__btn--primary:hover,
.freeze-dialog__btn--primary:focus {
  background: #1f2533;
  border-color: #1f2533;
}

.ban-note {
  color: #f39c12;
  background: #fff7e6;
  border-left: 4px solid #f39c12;
  padding: 12px;
  margin-bottom: 12px;
  white-space: pre-line;
}
</style>
