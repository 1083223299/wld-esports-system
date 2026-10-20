<template>
  <div class="list-wrapper">
    <!-- 申请类型：与个人陪分润配置同款 hero-tabs -->
    <div class="hero-tabs" role="tablist" aria-label="申请类型">
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': applyType === '1' }"
        role="tab"
        :aria-selected="applyType === '1'"
        @click="handleApplyTypeChange('1')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-video-play" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            娱乐陪
            <em v-if="applyType === '1'">当前</em>
          </div>
          <div class="hero-tab__desc">娱乐类申请审核</div>
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
      <button
        type="button"
        class="hero-tab"
        :class="{ 'is-active': applyType === '2' }"
        role="tab"
        :aria-selected="applyType === '2'"
        @click="handleApplyTypeChange('2')"
      >
        <div class="hero-tab__icon">
          <i class="el-icon-s-opportunity" />
        </div>
        <div class="hero-tab__body">
          <div class="hero-tab__title">
            技术陪
            <em v-if="applyType === '2'">当前</em>
          </div>
          <div class="hero-tab__desc">技术类申请审核</div>
        </div>
        <div class="hero-tab__arrow"><i class="el-icon-arrow-right" /></div>
      </button>
    </div>

    <!-- 筛选查询区 -->
    <div ref="responsiveModule" class="search-module">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20" @search="handleSearch"
        @reset="handleReset">
      </SearchForm>
    </div>

    <!-- 数据列表展示 -->
    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table :data="tableData" stripe v-loading="loading" :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }">

          <!-- 陪玩ID -->
          <el-table-column prop="userId" label="陪玩ID" width="100"></el-table-column>

          <!-- 陪玩名称 -->
          <el-table-column prop="nickName" label="陪玩名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.nickName || '-' }}
            </template>
          </el-table-column>

          <!-- 手机号（带眼睛切换） -->
          <el-table-column label="手机号" width="150">
            <template slot-scope="{ row }">
              <PhoneDisplay :value="row.phone" />
            </template>
          </el-table-column>

          <!-- 头像 -->
          <el-table-column label="头像" width="80">
            <template slot-scope="{ row }">
              <div class="avatar-cell" @click="previewAvatar(row)">
                <img v-if="row.avatar" :src="row.avatar" class="avatar-thumb" @error="handleImgError" />
                <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" />
              </div>
            </template>
          </el-table-column>

          <!-- 游戏名称 -->
          <el-table-column prop="productName" label="游戏名称" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.productName || '-' }}
            </template>
          </el-table-column>

          <!-- 认证信息 -->
          <el-table-column label="认证信息" width="100">
            <template slot-scope="{ row }">
              <el-button type="text" style="color: #8F03FF" @click="showAuthDrawer(row)"
                v-permission="'system:userSkillAudit:detail'">
                查看认证
              </el-button>
            </template>
          </el-table-column>

          <!-- 提交时间 -->
          <el-table-column prop="createTime" label="提交时间" width="160"></el-table-column>

          <!-- 技能冻结说明 -->
          <el-table-column label="技能冻结说明" width="120">
            <template slot-scope="{ row }">
              <el-button
                v-if="hasFreezeReason(row)"
                type="text"
                style="color: #8F03FF"
                @click="openFreezeInfo(row)"
              >查看</el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 状态 -->
          <el-table-column label="状态" width="100">
            <template slot-scope="{ row }">
              <el-tag :type="getStatusTag(row.applyStatus)" size="small">
                {{ getStatusText(row.applyStatus) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 驳回原因 -->
          <el-table-column label="驳回原因" min-width="150" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <span v-if="isRejectedRow(row)" class="reject-reason">
                {{ getRejectReason(row) || '-' }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 陪陪类型 -->
          <el-table-column label="陪陪类型" width="130">
            <template slot-scope="{ row }">
              <span :class="['companion-type-tag', getCompanionTypeClass(row)]">
                {{ getCompanionTypeText(row) }}
              </span>
            </template>
          </el-table-column>

          <!-- 备注 -->
          <el-table-column label="备注" min-width="180" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ getRemarkText(row) }}
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="150" fixed="right"
            v-if="checkPermission(['system:userSkillAudit:approve', 'system:userSkillAudit:reject'])">
            <template slot-scope="{ row }">
              <template v-if="canOperateRow(row)">
                <el-button type="text" style="color: #1BC286" @click="handleApprove(row)"
                  v-permission="'system:userSkillAudit:approve'">
                  通过
                </el-button>
                <el-button type="text" style="color: #FF4D4F" @click="handleReject(row)"
                  v-permission="'system:userSkillAudit:reject'">
                  驳回
                </el-button>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange">
        </PaginationSimple>
      </div>
    </el-card>

    <!-- 实战考核通过弹窗 -->
    <el-dialog title="实战考核通过" :visible.sync="practicalApproveDialogVisible" width="450px" class="reject-dialog"
      :close-on-click-modal="false">
      <el-form :model="practicalApproveForm" ref="practicalApproveForm" :rules="practicalApproveRules" label-width="100px">
        <el-form-item label="评分定级" prop="assessmentLevel">
          <el-radio-group v-model="practicalApproveForm.assessmentLevel" class="assessment-level-group">
            <el-radio label="mass" border size="medium">大众群演<span class="assessment-level-check"></span></el-radio>
            <el-radio label="third" border size="medium">三线明星<span class="assessment-level-check"></span></el-radio>
            <el-radio label="first" border size="medium">一线明星<span class="assessment-level-check"></span></el-radio>
            <el-radio label="top" border size="medium">顶流明星<span class="assessment-level-check"></span></el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="practicalApproveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPracticalApprove" :loading="practicalApproveLoading">提交</el-button>
      </div>
    </el-dialog>

    <!-- 认证信息抽屉 -->
    <el-drawer title="认证信息" :visible.sync="authDrawerVisible" direction="rtl" size="500px" class="auth-drawer">
      <div class="drawer-content" v-loading="authLoading">
        <template v-if="authData">
          <div class="auth-summary">
            <div class="summary-main">
              <div class="summary-title">技能认证详情</div>
              <div class="summary-subtitle">{{ authData.productName || '-' }} · 技能ID {{ authData.skillId || '-' }}</div>
              <div v-if="authData.remark || authData.rejectReason" class="summary-note">
                {{ authData.remark || authData.rejectReason }}
              </div>
            </div>
            <el-tag :type="getStatusTag(String(authData.applyStatus))" effect="dark" size="small" class="summary-tag"
              :class="`summary-tag-${String(authData.applyStatus)}`">
              <span class="summary-tag-dot"></span>
              {{ getStatusText(String(authData.applyStatus)) }}
            </el-tag>
          </div>

          <div class="auth-section">
            <div class="section-title">基础信息</div>
            <div class="info-grid">
              <div class="info-card">
                <div class="info-label">陪玩ID</div>
                <div class="info-value">{{ authData.userId || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">技能ID</div>
                <div class="info-value">{{ authData.skillId || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">商品名称</div>
                <div class="info-value">{{ authData.productName || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">商品ID</div>
                <div class="info-value">{{ authData.productId || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">语音时长</div>
                <div class="info-value">{{ formatVoiceLength(authData.skillVoiceLength) }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">审核备注</div>
                <div class="info-value">{{ authData.remark || authData.rejectReason || '-' }}</div>
              </div>
            </div>
          </div>

          <div v-if="showTechnicalCompanionProfile" class="auth-section">
            <div class="section-title">技术搭档档案</div>
            <div class="info-grid">
              <div class="info-card">
                <div class="info-label">真实姓名</div>
                <div class="info-value">{{ authData.realName || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">微信号</div>
                <div class="info-value">{{ authData.wechatNo || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">期望考核时间</div>
                <div class="info-value">{{ authData.expectedAssessmentTime || '-' }}</div>
              </div>
              <div class="info-card">
                <div class="info-label">高光视频/图片</div>
                <div v-if="highlightMediaList.length" class="skill-images">
                  <template v-for="(item, index) in highlightMediaList">
                    <el-image v-if="item.type === 'image'" :key="`highlight-image-${index}`" :src="item.url"
                      :preview-src-list="highlightImagePreviewList" fit="cover" class="skill-media">
                    </el-image>
                    <button v-else :key="`highlight-video-${index}`" type="button" class="skill-media skill-video-thumb"
                      @click="openVideoPreview(item.url)">
                      <video :src="item.url" muted playsinline preload="metadata" class="skill-video-thumb__video"></video>
                      <span class="skill-video-thumb__mask"></span>
                      <span class="skill-video-thumb__play"></span>
                    </button>
                  </template>
                </div>
                <div v-else class="empty-value">暂无高光视频/图片</div>
                <div class="meta-list">
                  <div class="meta-title">高光 OSS ID</div>
                  <div v-if="highlightVideoOssIds.length" class="meta-chip-list meta-chip-list--compact">
                    <div v-for="(ossId, index) in highlightVideoOssIds" :key="`highlight-oss-${ossId}-${index}`"
                      class="meta-chip meta-chip--plain">
                      {{ ossId }}
                    </div>
                  </div>
                  <div v-else class="meta-empty">-</div>
                </div>
              </div>
            </div>
          </div>

          <div class="auth-section">
            <div class="section-title">认证材料</div>
            <div class="material-block">
              <div class="material-title">图片认证</div>
              <div class="material-subtitle">示例素材</div>
              <div class="skill-images" v-if="authDemoMediaList.length">
                <template v-for="(item, index) in authDemoMediaList">
                  <el-image v-if="item.type === 'image'" :key="`demo-image-${index}`" :src="item.url"
                    :preview-src-list="authDemoImagePreviewList" fit="cover" class="skill-media">
                  </el-image>
                  <button v-else :key="`demo-video-${index}`" type="button" class="skill-media skill-video-thumb"
                    @click="openVideoPreview(item.url)">
                    <video :src="item.url" muted playsinline preload="metadata" class="skill-video-thumb__video"></video>
                    <span class="skill-video-thumb__mask"></span>
                    <span class="skill-video-thumb__play"></span>
                  </button>
                </template>
              </div>
              <div v-else class="empty-value">暂无示例素材</div>
              <div class="material-subtitle material-subtitle--spaced">技能信息</div>
              <div class="skill-images" v-if="authMediaList.length">
                <template v-for="(item, index) in authMediaList">
                  <el-image v-if="item.type === 'image'" :key="`auth-image-${index}`" :src="item.url"
                    :preview-src-list="authImagePreviewList" fit="cover" class="skill-media">
                  </el-image>
                  <button v-else :key="`auth-video-${index}`" type="button" class="skill-media skill-video-thumb"
                    @click="openVideoPreview(item.url)">
                    <video :src="item.url" muted playsinline preload="metadata" class="skill-video-thumb__video"></video>
                    <span class="skill-video-thumb__mask"></span>
                    <span class="skill-video-thumb__play"></span>
                  </button>
                </template>
              </div>
              <div v-else class="empty-value">暂无技能信息</div>
              <div class="meta-list">
                <div class="meta-title">图片OSS ID</div>
                <div v-if="authPicOssIds.length" class="meta-chip-list meta-chip-list--compact">
                  <div v-for="(ossId, index) in authPicOssIds" :key="`${ossId}-${index}`"
                    class="meta-chip meta-chip--plain">
                    {{ ossId }}
                  </div>
                </div>
                <div v-else class="meta-empty">-</div>
              </div>
            </div>
            <div class="material-block">
              <div class="material-title">语音认证</div>
              <audio v-if="authData.skillVoice" :src="authData.skillVoice" controls class="voice-player"></audio>
              <div v-else class="empty-value">暂无语音条</div>
              <div class="meta-chip-list">
                <div class="meta-chip">时长 {{ formatVoiceLength(authData.skillVoiceLength) }}</div>
                <div class="meta-chip">语音OSS ID {{ authData.voiceOssId || '-' }}</div>
              </div>
            </div>
            <div class="material-block">
              <div class="material-title">{{ authData.textFieldName || '技能介绍' }}</div>
              <!-- <div v-if="authData.textFieldRule" class="helper-text">{{ authData.textFieldRule }}</div> -->
              <!-- <div v-if="authData.textFieldPlaceholder" class="helper-text">输入提示：{{ authData.textFieldPlaceholder }}</div> -->
              <div class="text-block">{{ authData.introduce || '-' }}</div>
            </div>
          </div>

          <div class="auth-section">
            <div class="section-title">认证字段</div>
            <div v-if="formattedFieldValues.length" class="field-values">
              <div v-for="item in formattedFieldValues" :key="item.key"
                :class="['field-item', { 'field-item--missing': !item.hasValue }]">
                <div class="field-header">
                  <div class="field-name">{{ item.fieldName || '-' }}</div>
                  <div class="field-meta">
                    <div :class="['field-badge', item.isRequired ? 'field-badge--required' : 'field-badge--optional']">
                      {{ item.isRequired ? '必填' : '选填' }}
                    </div>
                    <div class="field-type">{{ fieldTypeText(item.fieldType) }}</div>
                  </div>
                </div>
                <div class="field-content">
                  <div v-if="item.imageList.length" class="field-images">
                    <el-image v-for="(img, index) in item.imageList" :key="`${item.key}-${index}`" :src="img"
                      :preview-src-list="item.imageList" fit="cover" class="field-image">
                    </el-image>
                  </div>
                  <div v-else class="field-text">{{ item.displayText }}</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-panel">暂无认证字段信息</div>
          </div>
        </template>
        <el-empty v-else-if="!authLoading" description="暂无认证信息"></el-empty>
      </div>
    </el-drawer>

    <!-- 驳回弹窗 -->
    <el-dialog :title="currentRejectDialogTitle" :visible.sync="rejectDialogVisible" width="450px" class="reject-dialog"
      :close-on-click-modal="false">
      <el-form :model="rejectForm" ref="rejectForm" :rules="rejectRules" label-width="120px">
        <el-form-item label="驳回原因" prop="rejectReason">
          <el-input v-model="rejectForm.rejectReason" type="textarea" :rows="4" :maxlength="currentRejectMaxLength" show-word-limit
            :placeholder="currentRejectPlaceholder">
          </el-input>
        </el-form-item>
        <template v-if="isPracticalRejectMode">
          <div v-if="practicalRejectEntertainmentStatus === 'loading'" class="reject-dialog__hint">
            正在查询同用户同商品是否已有生效娱乐陪...
          </div>
          <!-- 已有生效娱乐陪则无需再转，隐藏该选项 -->
          <el-form-item
            v-else-if="practicalRejectEntertainmentStatus === 'none'"
            label="是否转娱乐陪"
            prop="convertToEntertainment"
          >
            <el-radio-group v-model="rejectForm.convertToEntertainment">
              <el-radio :label="true">成为娱乐陪</el-radio>
              <el-radio :label="false">不成为娱乐陪</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReject" :loading="rejectLoading">{{ currentRejectSubmitText }}</el-button>
      </div>
    </el-dialog>

    <el-dialog title="视频预览" :visible.sync="videoPreviewVisible" width="760px" class="video-preview-dialog"
      :close-on-click-modal="true" @closed="handleVideoPreviewClosed">
      <div class="video-preview-body">
        <video v-if="videoPreviewUrl" :key="videoPreviewUrl" :src="videoPreviewUrl" controls autoplay
          class="video-preview-player"></video>
      </div>
    </el-dialog>

    <!-- 技能冻结说明 -->
    <el-dialog
      :visible.sync="freezeInfoVisible"
      width="480px"
      custom-class="freeze-info-dialog"
      append-to-body
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div v-loading="freezeInfoLoading" class="freeze-info-panel">
        <div class="freeze-info-panel__header">
          <div>
            <div class="freeze-info-panel__title">技能冻结说明</div>
            <div class="freeze-info-panel__subtitle">查看该技能冻结时填写的原因与附件</div>
          </div>
          <button type="button" class="freeze-info-panel__close" @click="freezeInfoVisible = false">
            <i class="el-icon-close" />
          </button>
        </div>

        <div class="freeze-info-panel__content">
          <div class="freeze-info-card">
            <div class="freeze-info-card__label">
              <span class="freeze-info-card__dot" />
              冻结原因
            </div>
            <div class="freeze-info-card__value">{{ freezeInfo.reason || '-' }}</div>
          </div>

          <div v-if="freezeInfo.remark" class="freeze-info-card">
            <div class="freeze-info-card__label">
              <span class="freeze-info-card__dot freeze-info-card__dot--muted" />
              备注
            </div>
            <div class="freeze-info-card__value">{{ freezeInfo.remark }}</div>
          </div>

          <div v-if="freezeInfo.ossUrls.length" class="freeze-info-card">
            <div class="freeze-info-card__label">
              <span class="freeze-info-card__dot freeze-info-card__dot--attach" />
              附件
              <em>{{ freezeInfo.ossUrls.length }}</em>
            </div>
            <div class="freeze-info-images">
              <div
                v-for="(img, index) in freezeInfo.ossUrls"
                :key="`${img}-${index}`"
                class="freeze-info-image"
                @click="previewFreezeImage(index)"
              >
                <img :src="img" alt="" />
              </div>
            </div>
          </div>
        </div>

        <div class="freeze-info-panel__footer">
          <el-button class="freeze-info-btn" @click="freezeInfoVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 头像预览 -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
    <ImgZoom v-model="freezePreviewVisible" :img-list="freezeInfo.ossUrls" :init-index="freezePreviewIndex" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import checkPermission from "@/utils/checkPermission";
import {
  listUserSkillAudit,
  approveUserSkillAudit,
  rejectUserSkillAudit,
  detailUserSkillAudit,
  firstApproveUserSkillAudit,
  firstRejectUserSkillAudit,
  practicalApproveUserSkillAudit,
  practicalRejectUserSkillAudit,
  entertainmentCompanionCheck,
  getFreezeResubmitInfo
} from "@/api/userSkillAudit";
import { productSelect } from "@/api/goodsList";

const COMPANION_TYPE_MAP = {
  1: { label: "个人陪陪", className: "is-personal" },
  2: { label: "公会陪陪", className: "is-guild" },
  3: { label: "商户公会陪陪", className: "is-merchant-guild" },
};

export default {
  name: 'UserSkillAuditList',
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom,
    PhoneDisplay,
  },
  data() {
    const validateRejectReason = (rule, value, callback) => {
      const text = (value || '').trim();
      const maxLength = this.currentRejectMaxLength;
      if (!text) {
        callback(new Error('请输入驳回原因'));
        return;
      }
      if (text.length > maxLength) {
        callback(new Error(`驳回原因不能超过${maxLength}个字符`));
        return;
      }
      callback();
    };
    const validateConvertToEntertainment = (rule, value, callback) => {
      if (this.isPracticalRejectMode && this.practicalRejectEntertainmentStatus === 'none' && typeof value !== 'boolean') {
        callback(new Error('请选择是否可转为娱乐陪'));
        return;
      }
      callback();
    };
    return {
      // 申请类型 tab
      applyType: '1',

      // 筛选表单
      queryForm: {
        userId: '',
        nickName: '',
        phone: '',
        applyStatus: '',
        productId: '',
        type: '',
      },

      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "userId",
          label: "陪玩ID",
          placeholder: "请输入陪玩ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "nickName",
          label: "陪玩名称",
          placeholder: "请输入陪玩名称",
          clearable: true,
        },
        {
          type: "select",
          prop: "applyStatus",
          label: "状态",
          placeholder: "全部",
          options: [{ label: "全部", value: "" }],
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
          prop: "productId",
          label: "游戏名称",
          placeholder: "请选择游戏名称",
          filterable: true,
          options: [{ label: "全部", value: "" }],
          clearable: true,
        },
        {
          type: "select",
          prop: "type",
          label: "陪陪类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "个人陪陪", value: "1" },
            { label: "公会陪陪", value: "2" },
            { label: "商户公会陪陪", value: "3" },
          ],
          clearable: true,
        },
      ],

      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      productOptions: [],

      // 实战考核通过弹窗
      practicalApproveDialogVisible: false,
      practicalApproveLoading: false,
      practicalApproveForm: {
        assessmentLevel: ''
      },
      practicalApproveRules: {
        assessmentLevel: [
          { required: true, message: '请选择评分定级', trigger: 'change' }
        ]
      },

      // 认证抽屉
      authDrawerVisible: false,
      authLoading: false,
      authData: null,
      videoPreviewVisible: false,
      videoPreviewUrl: '',

      // 驳回弹窗
      rejectDialogVisible: false,
      rejectLoading: false,
      rejectMode: 'normal',
      practicalRejectEntertainmentStatus: 'unknown',
      currentRow: null,
      rejectForm: {
        rejectReason: '',
        convertToEntertainment: false
      },
      rejectRules: {
        rejectReason: [
          { validator: validateRejectReason, trigger: 'blur' }
        ],
        convertToEntertainment: [
          { validator: validateConvertToEntertainment, trigger: 'change' }
        ]
      },

      // 头像预览
      avatarDialogVisible: false,
      previewAvatarUrl: '',

      // 技能冻结说明
      freezeInfoVisible: false,
      freezeInfoLoading: false,
      freezeInfo: {
        reason: '',
        remark: '',
        ossUrls: []
      },
      freezePreviewVisible: false,
      freezePreviewIndex: 0,
    }
  },

  computed: {
    isTechnicalApplyType() {
      return this.applyType === '2';
    },
    isTechnicalFirstRejectMode() {
      return this.rejectMode === 'first';
    },
    isPracticalRejectMode() {
      return this.rejectMode === 'practical';
    },
    currentRejectDialogTitle() {
      if (this.isPracticalRejectMode) return '实战考核驳回';
      return this.isTechnicalFirstRejectMode ? '初审驳回' : '审核驳回';
    },
    currentRejectMaxLength() {
      return 50;
    },
    currentRejectPlaceholder() {
      if (this.isPracticalRejectMode) return '请输入实战考核驳回原因，50字以内';
      return this.isTechnicalFirstRejectMode
        ? '请输入初审驳回原因，50字以内'
        : '请输入驳回原因，50字以内';
    },
    currentRejectSubmitText() {
      return this.isTechnicalFirstRejectMode || this.isPracticalRejectMode ? '提交' : '确定';
    },
    showTechnicalCompanionProfile() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const applyTypeValue = (currentSkill && currentSkill.applyType) || (this.authData && this.authData.applyType) || this.applyType;
      return String(applyTypeValue) === '2';
    },
    highlightVideoList() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value = (currentSkill && currentSkill.highlightVideo) || (this.authData && this.authData.highlightVideo);
      return this.uniqueList(this.parseJsonArray(value));
    },
    highlightVideoOssIds() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value = (currentSkill && currentSkill.highlightVideoOssId) || (this.authData && this.authData.highlightVideoOssId);
      return this.uniqueList(this.parseJsonArray(value));
    },
    highlightMediaList() {
      return this.buildMediaList(this.highlightVideoList);
    },
    highlightImagePreviewList() {
      return this.highlightMediaList.filter(item => item.type === 'image').map(item => item.url);
    },
    authImages() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value = (currentSkill && currentSkill.skillInfoImage) || (this.authData && this.authData.skillImageList);
      return this.uniqueList(this.parseJsonArray(value));
    },
    authMediaList() {
      return this.buildMediaList(this.authImages);
    },
    authImagePreviewList() {
      return this.authMediaList.filter(item => item.type === 'image').map(item => item.url);
    },
    authDemoImages() {
      return this.uniqueList(this.authData && this.authData.demoImageList);
    },
    authDemoMediaList() {
      return this.buildMediaList(this.authDemoImages);
    },
    authDemoImagePreviewList() {
      return this.authDemoMediaList.filter(item => item.type === 'image').map(item => item.url);
    },
    authPicOssIds() {
      const currentSkill = this.authData && this.authData.currentSkill;
      const value = (currentSkill && currentSkill.skillInfoImageOssId) || (this.authData && this.authData.picOssId);
      return this.uniqueList(this.parseJsonArray(value));
    },
    formattedFieldValues() {
      const fieldValues = this.authData && Array.isArray(this.authData.fieldValues)
        ? this.authData.fieldValues
        : [];
      return fieldValues.map((item, index) => {
        return {
          ...item,
          key: item.key || item.relationId || item.productFieldId || item.ownerId || index,
          imageList: this.uniqueList(item.imageList || this.parseJsonArray(item.displayUrls)),
          optionLabels: this.uniqueList(item.optionLabels),
          displayText: item.displayText || this.getFieldDisplayText(item) || '-',
          hasValue: item.hasValue !== undefined
            ? item.hasValue
            : !!((item.imageList && item.imageList.length) || (item.displayText && item.displayText !== '-')),
          orderNum: Number(item.orderNum || 0)
        };
      }).sort((a, b) => a.orderNum - b.orderNum);
    }
  },

  mounted() {
    this.applyRouteQuery();
    this.fetchProductOptions();
    this.syncApplyStatusOptions();
    this.fetchTableData();
  },

  watch: {
    "$route.query.applyType"(val) {
      if (val === "1" || val === "2") {
        this.handleApplyTypeChange(String(val));
      }
    },
  },

  methods: {
    checkPermission,
    /** 消息中心跳转：?applyType=1 娱乐陪 / 2 技术陪 */
    applyRouteQuery() {
      const applyType = this.$route && this.$route.query && this.$route.query.applyType;
      if (applyType === "1" || applyType === "2") {
        this.applyType = String(applyType);
      }
    },
    hasFreezeReason(row) {
      if (!row) return false;
      const val = row.freezeReason;
      return val !== null && val !== undefined && val !== '' && val !== false && val !== 0 && val !== '0';
    },
    async openFreezeInfo(row) {
      if (!row || !row.priceId) {
        this.$message.warning('缺少技能ID');
        return;
      }
      this.freezeInfo = { reason: '', remark: '', ossUrls: [] };
      this.freezeInfoVisible = true;
      this.freezeInfoLoading = true;
      try {
        const res = await getFreezeResubmitInfo({ priceId: row.priceId });
        const payload = res && res.data != null ? res.data : res;
        const info = payload && typeof payload === 'object' ? payload : {};
        this.freezeInfo = {
          reason: info.reason || '',
          remark: info.remark || '',
          ossUrls: Array.isArray(info.ossUrls) ? info.ossUrls.filter(Boolean) : []
        };
      } catch (e) {
        // 错误由拦截器提示
      } finally {
        this.freezeInfoLoading = false;
      }
    },
    previewFreezeImage(index = 0) {
      if (!this.freezeInfo.ossUrls.length) return;
      this.freezePreviewIndex = index || 0;
      this.freezePreviewVisible = true;
    },
    // ==================== 数据获取 ====================
    async fetchProductOptions() {
      try {
        const res = await productSelect({ pageNum: 1, pageSize: 999 });
        console.log(res);

        if (res.code == 200) {
          this.productOptions = res.data;
          const options = [{ label: "全部", value: "" }].concat(
            this.productOptions.map(item => ({
              label: item.productName,
              value: item.id
            }))
          );
          const productItem = this.searchItems.find(item => item.prop === "productId");
          if (productItem) {
            productItem.options = options;
          }
        }
      } catch (error) {
        console.error("获取商品列表失败:", error);
      }
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const params = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          userId: this.queryForm.userId || undefined,
          nickName: this.queryForm.nickName || undefined,
          phone: this.queryForm.phone || undefined,
          applyStatus: this.queryForm.applyStatus || undefined,
          productId: this.queryForm.productId || undefined,
          type: this.queryForm.type || undefined,
          applyType: this.applyType || undefined,
        };

        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === '') {
            delete params[key];
          }
        });

        const res = await listUserSkillAudit(params);

        if (res.success) {
          const data = res.data;
          // 为每条数据添加手机号显示状态
          this.tableData = (data.rows || []).map(item => ({
            ...item,
            showPhone: false  // 默认隐藏手机号
          }));
          this.pagination.total = data.total || 0;
        } else {
          this.$message.error(res.errorMessage || '查询失败');
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

    // ==================== 搜索/重置 ====================
    handleSearch(e) {
      if (e) {
        this.queryForm = { ...this.queryForm, ...e };
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.queryForm = {
        userId: '',
        nickName: '',
        phone: '',
        applyStatus: '',
        productId: '',
        type: '',
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },

    handleApplyTypeChange(type) {
      if (this.applyType === type) return;
      this.applyType = type;
      this.syncApplyStatusOptions();
      // 切换 tab 时按新申请类型重置筛选条件，并立即重新查询列表
      const resetQueryForm = {
        userId: '',
        nickName: '',
        phone: '',
        applyStatus: '',
        productId: '',
        type: '',
      };
      this.queryForm = { ...resetQueryForm };
      this.pagination.pageNum = 1;
      this.$nextTick(() => {
        if (this.$refs.searchForm) {
          this.$refs.searchForm.setFormData(resetQueryForm);
        }
        this.handleSearch(resetQueryForm);
      });
    },

    syncApplyStatusOptions() {
      const statusItem = this.searchItems.find(item => item.prop === 'applyStatus');
      if (!statusItem) return;
      statusItem.options = [{ label: "全部", value: "" }, ...this.getApplyStatusOptionsByApplyType()];
    },

    getApplyStatusOptionsByApplyType() {
      if (this.applyType === '2') {
        return [
          { label: "待审核", value: "0" },
          { label: "实战考核", value: "1" },
          { label: "驳回", value: "2" },
        ];
      }
      return [
        { label: "待审核", value: "0" },
        { label: "驳回", value: "2" },
      ];
    },

    // ==================== 手机号处理 ====================
    togglePhoneShow(row) {
      row.showPhone = !row.showPhone;
    },

    formatPhone(phone, show) {
      if (!phone) return '-';
      if (show) return phone;
      // 中间四位用*代替
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    },

    // ==================== 头像处理 ====================
    previewAvatar(row) {
      if (row.avatar) {
        this.previewAvatarUrl = row.avatar;
        this.avatarDialogVisible = true;
      } else {
        this.$message.warning('头像不存在');
      }
    },

    handleImgError(e) {
      e.target.src = require('@/assets/defaulIcon.png');
      e.target.onerror = null;
    },

    // ==================== 状态处理 ====================
    getStatusText(status) {
      const value = String(status);
      const map = { '0': '待审核', '1': '实战考核', '2': '驳回', '3': '已通过' };
      return map[value] || status;
    },

    getStatusTag(status) {
      const value = String(status);
      const map = { '0': 'primary', '1': 'warning', '2': 'danger', '3': 'success' };
      return map[value] || 'info';
    },

    getCompanionType(row) {
      const value = row.type;
      return value === undefined || value === null || value === '' ? '' : String(value);
    },
    getCompanionTypeText(row) {
      const type = this.getCompanionType(row);
      return (type && COMPANION_TYPE_MAP[type]?.label) || '-';
    },
    getCompanionTypeClass(row) {
      const type = this.getCompanionType(row);
      return (type && COMPANION_TYPE_MAP[type]?.className) || '';
    },
    getRemarkText(row) {
      // const type = this.getCompanionType(row);
      // if (!type || type === '1') {
      //   return '-';
      // }
      // const tradeName = row.tradeName || row.unionName || row.tradeUnionName || '';
      // const merchantName = row.merchantName || '';
      // if (type === '3') {
      //   if (merchantName && tradeName) {
      //     return `${merchantName}-${tradeName}`;
      //   }
      //   return row.remark || merchantName || tradeName || '-';
      // }
      // if (type === '2') {
      //   return tradeName || row.remark || '-';
      // }
      return row.ownershipRemark || '-';
    },
    isRejectedRow(row) {
      return String(row.applyStatus) === '2';
    },
    getRejectReason(row) {
      if (!this.isRejectedRow(row)) {
        return '';
      }
      return row.rejectReason || row.merchantRemark || '';
    },

    // ==================== 认证抽屉 ====================
    async showAuthDrawer(row) {
      this.authDrawerVisible = true;
      this.authLoading = true;
      this.authData = null;
      try {
        const res = await detailUserSkillAudit({
          priceId: row.priceId
        });
        const authPayload = this.extractAuthPayload(res);
        if (authPayload) {
          this.authData = this.normalizeAuthData(authPayload, row);
        } else {
          this.$message.error((res && (res.errorMessage || res.msg)) || '获取认证详情失败');
        }
      } catch (error) {
        console.error("获取认证详情失败:", error);
        this.$message.error("获取认证详情失败");
      } finally {
        this.authLoading = false;
      }
    },

    openVideoPreview(url) {
      const normalizedUrl = this.cleanWrappedString(url);
      if (!normalizedUrl) return;
      this.videoPreviewUrl = normalizedUrl;
      this.videoPreviewVisible = true;
    },

    handleVideoPreviewClosed() {
      this.videoPreviewUrl = '';
    },

    parseJsonArray(value) {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string') {
        const normalizedValue = this.cleanWrappedString(value);
        try {
          const parsedValue = JSON.parse(normalizedValue);
          return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : value ? [value] : [];
        } catch (error) {
          return normalizedValue
            ? normalizedValue.split(",").map(item => this.cleanWrappedString(item)).filter(Boolean)
            : [];
        }
      }
      return [];
    },

    cleanWrappedString(value) {
      if (value === null || value === undefined) return '';
      return String(value).trim().replace(/^["'`\s]+|["'`\s]+$/g, '');
    },

    uniqueList(value) {
      if (!value) return [];
      const list = Array.isArray(value) ? value : [value];
      return Array.from(new Set(list.map(item => this.cleanWrappedString(item)).filter(Boolean)));
    },

    buildMediaList(value) {
      return this.uniqueList(value).map(url => ({
        url,
        type: this.getMediaType(url)
      }));
    },

    getMediaType(url) {
      const normalizedUrl = this.cleanWrappedString(url).split('?')[0].toLowerCase();
      if (/\.(mp4|mov|m4v|webm|ogg|ogv|avi|wmv|flv|mkv|m3u8)$/.test(normalizedUrl)) {
        return 'video';
      }
      return 'image';
    },

    normalizeId(value) {
      if (value === null || value === undefined || value === '') return '';
      return String(value);
    },

    formatBusinessType(value) {
      const map = {
        '1': '搭档',
        '2': '代练'
      };
      return map[this.normalizeId(value)] || this.cleanWrappedString(value) || '-';
    },

    formatModuleType(value) {
      const map = {
        '1': '认证模块',
        '2': '商品规格',
        '3': '游戏专区',
        '5': '订单字段',
        '6': '价格配置',
        '7': '一键安排'
      };
      return map[this.normalizeId(value)] || this.cleanWrappedString(value) || '-';
    },

    formatSkillStatus(value) {
      const map = {
        '0': '已开启',
        '1': '已关闭'
      };
      return map[this.normalizeId(value)] || this.cleanWrappedString(value) || '-';
    },

    buildTextFieldRule(field) {
      if (!field || typeof field !== 'object') {
        return '';
      }
      const fragments = [];
      const charMin = field.charMin;
      const charMax = field.charMax;
      if (charMin || charMax) {
        const minText = charMin || 0;
        const maxText = charMax || '不限';
        fragments.push(`字数要求：${minText}-${maxText}字`);
      }
      if (Number(field.isRequired) === 1) {
        fragments.push('该项必填');
      }
      return fragments.join('；');
    },

    extractAuthPayload(res) {
      if (!res) return null;
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
      if (res.success && res.data && res.data.data) {
        return res.data.data;
      }
      if (res.success && res.data) {
        return res.data;
      }
      if (res.data && res.data.data && (res.data.code === 200 || res.data.errorCode === '0')) {
        return res.data.data;
      }
      if (res.data) {
        return res.data;
      }
      return null;
    },

    normalizeAuthData(detailData, row) {
      const currentSkill = detailData.currentSkill || {};
      const picInfo = detailData.userSkillPicItemVo || {};
      const voiceInfo = detailData.userSkillVoiceItemVo || {};
      const textInfo = detailData.userSkillTextItemVo || {};
      const textField = textInfo.skillTextField || {};
      const applyStatus = currentSkill.applyStatus ?? row.applyStatus ?? detailData.applyStatus;
      const remark = this.cleanWrappedString(currentSkill.remark ?? detailData.remark ?? row.rejectReason ?? detailData.rejectReason);
      return {
        ...detailData,
        currentSkill,
        userId: currentSkill.userId ?? row.userId ?? detailData.userId ?? '',
        skillId: currentSkill.skillId || detailData.skillId || '',
        productName: this.cleanWrappedString(detailData.productName || row.productName || '-') || '-',
        productId: detailData.productId || currentSkill.productId || row.productId || '',
        applyType: this.cleanWrappedString(currentSkill.applyType ?? detailData.applyType ?? row.applyType ?? ''),
        realName: this.cleanWrappedString(currentSkill.realName ?? detailData.realName ?? ''),
        wechatNo: this.cleanWrappedString(currentSkill.wechatNo ?? detailData.wechatNo ?? ''),
        expectedAssessmentTime: this.cleanWrappedString(currentSkill.expectedAssessmentTime ?? detailData.expectedAssessmentTime ?? ''),
        highlightVideo: this.cleanWrappedString(currentSkill.highlightVideo || ''),
        highlightVideoOssId: this.cleanWrappedString(currentSkill.highlightVideoOssId || ''),
        businessType: detailData.businessType || currentSkill.businessType || '',
        businessTypeText: this.formatBusinessType(detailData.businessType || currentSkill.businessType),
        moduleType: detailData.moduleType || currentSkill.moduleType || '',
        moduleTypeText: this.formatModuleType(detailData.moduleType || currentSkill.moduleType),
        isTechnicalWaiter: detailData.isTechnicalWaiter ?? currentSkill.isTechnicalWaiter ?? 0,
        skillStatus: currentSkill.status ?? detailData.status ?? '',
        skillStatusText: this.formatSkillStatus(currentSkill.status ?? detailData.status),
        demoImageList: this.parseJsonArray(picInfo.demoPicUrl),
        picOssId: this.cleanWrappedString(currentSkill.skillInfoImageOssId || ''),
        skillImageList: this.parseJsonArray(currentSkill.skillInfoImage),
        voiceOssId: this.cleanWrappedString(voiceInfo.voiceOssId || ''),
        skillVoice: this.cleanWrappedString(voiceInfo.voiceUrl || currentSkill.skillVoice || ''),
        skillVoiceLength: voiceInfo.skillVoiceLength ?? currentSkill.skillVoiceLength ?? detailData.skillVoiceLength ?? '',
        introduce: this.cleanWrappedString(textInfo.userText || currentSkill.introduce || ''),
        textFieldName: this.cleanWrappedString(textField.fieldName || '技能介绍'),
        textFieldRule: this.buildTextFieldRule(textField),
        textFieldPlaceholder: this.cleanWrappedString(textField.placeholder || ''),
        applyStatus,
        rejectReason: this.cleanWrappedString(row.rejectReason ?? detailData.rejectReason ?? ''),
        remark,
        fieldValues: this.buildAuthFieldValues(detailData)
      };
    },

    buildAuthFieldValues(detailData) {
      const fields = this.sortFieldsByOrder(Array.isArray(detailData.fields) ? detailData.fields : []);
      const currentFieldValues = Array.isArray(detailData.currentSkill && detailData.currentSkill.fieldValues)
        ? detailData.currentSkill.fieldValues
        : Array.isArray(detailData.fieldValues)
          ? detailData.fieldValues
          : [];
      const result = [];
      const usedKeys = new Set();

      fields.forEach((field, index) => {
        const matchedValues = currentFieldValues.filter(item => this.isFieldMatched(item, field));
        matchedValues.forEach(item => usedKeys.add(this.getFieldValueKey(item)));
        const imageList = this.uniqueList(matchedValues.flatMap(item => this.parseJsonArray(item.displayUrls)));
        const displayValues = this.uniqueList(matchedValues
          .map(item => this.getFieldDisplayText(item))
          .filter(Boolean));
        result.push({
          key: field.id || field.productFieldId || index,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          orderNum: this.resolveFieldOrder(field, index),
          isRequired: Number(field.isRequired) === 1,
          optionLabels: this.buildFieldOptionLabels(field),
          imageList,
          displayText: displayValues.join("、") || '-',
          hasValue: imageList.length > 0 || displayValues.length > 0
        });
      });

      currentFieldValues.forEach((item, index) => {
        const fieldValueKey = this.getFieldValueKey(item);
        if (usedKeys.has(fieldValueKey)) {
          return;
        }
        result.push({
          ...item,
          key: fieldValueKey || index,
          fieldName: item.fieldName || '未匹配字段',
          fieldType: item.fieldType,
          orderNum: fields.length + index + 1,
          isRequired: false,
          optionLabels: [],
          imageList: this.uniqueList(this.parseJsonArray(item.displayUrls)),
          displayText: this.getFieldDisplayText(item) || '-',
          hasValue: !!(this.parseJsonArray(item.displayUrls).length || this.getFieldDisplayText(item))
        });
      });

      return result;
    },

    sortFieldsByOrder(fields) {
      return (fields || []).slice().sort((a, b) => {
        const orderA = Number(a && a.orderNum);
        const orderB = Number(b && b.orderNum);
        return (Number.isNaN(orderA) ? 0 : orderA) - (Number.isNaN(orderB) ? 0 : orderB);
      });
    },

    resolveFieldOrder(field, fallbackIndex) {
      const orderNum = Number(field && field.orderNum);
      return Number.isNaN(orderNum) ? fallbackIndex : orderNum;
    },

    buildFieldOptionLabels(field) {
      const children = this.sortFieldsByOrder(Array.isArray(field && field.children) ? field.children : []);
      return this.uniqueList(children.map(item => item.fieldName));
    },

    getFieldValueKey(item) {
      return this.normalizeId(item && (item.relationId || item.productFieldId || item.fieldName || item.ownerId));
    },

    isFieldMatched(valueItem, field) {
      if (!valueItem || !field) return false;
      const relationId = this.normalizeId(valueItem.relationId);
      const productFieldId = this.normalizeId(valueItem.productFieldId);
      const fieldId = this.normalizeId(field.id);
      const fieldProductFieldId = this.normalizeId(field.productFieldId);
      if (relationId && (relationId === fieldId || relationId === fieldProductFieldId)) {
        return true;
      }
      if (productFieldId && productFieldId === fieldProductFieldId) {
        return true;
      }
      const children = Array.isArray(field.children) ? field.children : [];
      return children.some(child => {
        const childId = this.normalizeId(child.id);
        const childProductFieldId = this.normalizeId(child.productFieldId);
        return (relationId && (relationId === childId || relationId === childProductFieldId))
          || (productFieldId && productFieldId === childProductFieldId)
          || (!!valueItem.fieldName && valueItem.fieldName === child.fieldName);
      });
    },

    getFieldDisplayText(item) {
      const displayLabels = this.parseJsonArray(item && item.displayLabels);
      return displayLabels.join("、")
        || (item && this.cleanWrappedString(item.fieldDisplayValue))
        || (item && this.cleanWrappedString(item.fieldValue))
        || (item && this.cleanWrappedString(item.fieldName))
        || '';
    },

    formatVoiceLength(value) {
      if (value === null || value === undefined || value === '') {
        return '-';
      }
      return `${value}秒`;
    },

    fieldTypeText(fieldType) {
      const map = {
        1: '单选项',
        2: '输入项(仅数字)',
        3: '输入项(无限制)',
        4: '筛选项',
        5: '展示项',
        6: '多选项',
        7: '图片项',
        8: '自定义商品',
        9: '选项值(价格)'
      };
      return map[fieldType] || '-';
    },

    // ==================== 审核操作 ====================
    canOperateRow(row) {
      const status = String(row.applyStatus);
      if (status === '0') return true;
      return this.isTechnicalApplyType && status === '1';
    },

    handleApprove(row) {
      if (this.isTechnicalApplyType && String(row.applyStatus) === '0') {
        this.handleTechnicalFirstApprove(row);
        return;
      }
      if (this.isTechnicalApplyType && String(row.applyStatus) === '1') {
        this.openPracticalApproveDialog(row);
        return;
      }
      this.$confirm(`确定要通过陪玩 "${row.nickName}" 的技能认证吗？`, '审核通过', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }).then(async () => {
        try {
          const params = { priceId: row.priceId };
          const res = await approveUserSkillAudit(params);
          if (res.success) {
            this.$message.success('审核通过');
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '操作失败');
          }
        } catch (error) {
          console.error("审核通过失败:", error);
          this.$message.error("操作失败，请稍后重试");
        }
      }).catch(() => { });
    },

    openPracticalApproveDialog(row) {
      this.currentRow = row;
      this.practicalApproveForm.assessmentLevel = '';
      this.practicalApproveDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.practicalApproveForm) {
          this.$refs.practicalApproveForm.clearValidate();
        }
      });
    },

    submitPracticalApprove() {
      this.$refs.practicalApproveForm.validate(async (valid) => {
        if (!valid) return;
        this.practicalApproveLoading = true;
        try {
          const params = {
            priceId: this.currentRow.priceId,
            assessmentLevel: this.practicalApproveForm.assessmentLevel
          };
          const res = await practicalApproveUserSkillAudit(params);
          if (res.success) {
            this.$message.success('实战考核已通过');
            this.practicalApproveDialogVisible = false;
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '操作失败');
          }
        } catch (error) {
          console.error("实战考核通过失败:", error);
          this.$message.error("操作失败，请稍后重试");
        } finally {
          this.practicalApproveLoading = false;
        }
      });
    },

    handleTechnicalFirstApprove(row) {
      this.$confirm(
        '技术初审通过，即将转为实战审核阶段，请添加陪陪联系方式，沟通安排考核时间',
        '提示',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        try {
          const params = { priceId: row.priceId };
          const res = await firstApproveUserSkillAudit(params);
          if (res.success) {
            this.$message.success('初审通过');
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '操作失败');
          }
        } catch (error) {
          console.error("初审通过失败:", error);
          this.$message.error("操作失败，请稍后重试");
        }
      }).catch(() => { });
    },

    handleReject(row) {
      const status = String(row.applyStatus);
      if (this.isTechnicalApplyType && status === '0') {
        this.rejectMode = 'first';
      } else if (this.isTechnicalApplyType && status === '1') {
        this.rejectMode = 'practical';
      } else {
        this.rejectMode = 'normal';
      }
      this.currentRow = row;
      this.rejectForm.rejectReason = '';
      this.rejectForm.convertToEntertainment = false;
      this.practicalRejectEntertainmentStatus = this.isPracticalRejectMode ? 'loading' : 'unknown';
      this.rejectDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.rejectForm) {
          this.$refs.rejectForm.clearValidate();
        }
        if (this.isPracticalRejectMode) {
          this.fetchEntertainmentCompanionStatus();
        }
      });
    },

    async fetchEntertainmentCompanionStatus() {
      try {
        const row = this.currentRow || {};
        // 列表若已带回是否已有生效娱乐陪，直接用列表字段，无需再转则隐藏选项
        const listFlag = this.resolveEntertainmentFlagFromRow(row);
        if (listFlag !== null) {
          this.practicalRejectEntertainmentStatus = listFlag ? 'has' : 'none';
          if (listFlag) this.rejectForm.convertToEntertainment = false;
          return;
        }

        const userId = row.userId;
        const productId = row.productId || row.goodsId;
        if (!userId || !productId) {
          this.practicalRejectEntertainmentStatus = 'none';
          return;
        }
        const res = await entertainmentCompanionCheck({ userId, productId });
        const value = this.extractEntertainmentCompanionValue(res);
        this.practicalRejectEntertainmentStatus = value ? 'has' : 'none';
        if (value) this.rejectForm.convertToEntertainment = false;
      } catch (error) {
        console.error("查询娱乐陪身份失败:", error);
        this.practicalRejectEntertainmentStatus = 'none';
      }
    },

    resolveEntertainmentFlagFromRow(row) {
      if (!row || typeof row !== 'object') return null;
      const keys = [
        'hasEntertainmentCompanion',
        'hasEntertainmentSkill',
        'existEntertainmentSkill',
        'hasActiveEntertainmentSkill',
        'entertainmentCompanionExists',
        'hasEntertainSkill',
        'hasEntertainment',
      ];
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return this.normalizeBoolean(row[key]);
        }
      }
      return null;
    },

    extractEntertainmentCompanionValue(res) {
      // 拦截器可能直接返回 boolean / 0 / 1
      if (res === true || res === false) return res;
      if (res === 1 || res === '1' || res === 0 || res === '0') return this.normalizeBoolean(res);
      if (!res) return false;
      if (typeof res !== 'object') return this.normalizeBoolean(res);

      if (res.success && res.data !== undefined) return this.normalizeBooleanFlag(res.data);
      if (res.code === 200 && res.data !== undefined) return this.normalizeBooleanFlag(res.data);
      if (res.data && res.data.success && res.data.data !== undefined) {
        return this.normalizeBooleanFlag(res.data.data);
      }
      if (res.data !== undefined) return this.normalizeBooleanFlag(res.data);
      return this.normalizeBooleanFlag(res);
    },

    normalizeBooleanFlag(value) {
      if (value && typeof value === 'object') {
        const nested = this.resolveEntertainmentFlagFromRow(value);
        if (nested !== null) return nested;
        if (value.exists !== undefined) return this.normalizeBoolean(value.exists);
        if (value.result !== undefined) return this.normalizeBoolean(value.result);
        if (value.flag !== undefined) return this.normalizeBoolean(value.flag);
        if (value.value !== undefined) return this.normalizeBoolean(value.value);
      }
      return this.normalizeBoolean(value);
    },

    normalizeBoolean(value) {
      if (value === true || value === false) return value;
      if (value === 1 || value === '1') return true;
      if (value === 0 || value === '0') return false;
      if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (text === 'true' || text === 'yes' || text === 'y') return true;
        if (text === 'false' || text === 'no' || text === 'n') return false;
      }
      if (value && typeof value === 'object') return false;
      return !!value;
    },

    submitReject() {
      this.$refs.rejectForm.validate(async (valid) => {
        if (!valid) return;

        this.rejectLoading = true;
        try {
          const params = {
            priceId: this.currentRow.priceId,
            rejectReason: this.rejectForm.rejectReason.trim()
          };
          let res;
          if (this.isTechnicalFirstRejectMode) {
            res = await firstRejectUserSkillAudit(params);
          } else if (this.isPracticalRejectMode) {
            // 已有生效娱乐陪时强制不转
            const convertToEntertainment = this.practicalRejectEntertainmentStatus === 'has'
              ? false
              : !!this.rejectForm.convertToEntertainment;
            res = await practicalRejectUserSkillAudit({
              ...params,
              convertToEntertainment
            });
          } else {
            res = await rejectUserSkillAudit(params);
          }
          if (res.success) {
            this.$message.success(this.isTechnicalFirstRejectMode ? '初审已驳回' : this.isPracticalRejectMode ? '实战考核已驳回' : '已驳回');
            this.rejectDialogVisible = false;
            this.rejectMode = 'normal';
            this.practicalRejectEntertainmentStatus = 'unknown';
            this.fetchTableData();
          } else {
            this.$message.error(res.errorMessage || '操作失败');
          }
        } catch (error) {
          console.error(this.isTechnicalFirstRejectMode ? "初审驳回失败:" : "驳回失败:", error);
          this.$message.error("操作失败，请稍后重试");
        } finally {
          this.rejectLoading = false;
        }
      });
    }
  }
}
</script>

<style scoped lang="scss">
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
  overflow-y: auto;
  min-height: 0;
}

.pagination-wrapper {
  flex-shrink: 0;
  border-top: 1px solid #EBEEF5;
  display: flex;
  justify-content: flex-end;
}

// 手机号单元格
.phone-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .phone-eye {
    font-size: 16px;
    cursor: pointer;
    transition: color 0.3s;

    &:hover {
      color: #409EFF !important;
    }
  }
}

// 头像单元格
.avatar-cell {
  display: flex;
  justify-content: center;
  cursor: pointer;

  .avatar-thumb {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

// 驳回原因
.reject-reason {
  color: #FF4D4F;
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

// 标签样式
.el-tag {
  border-width: 0;
}

.el-tag--success {
  background-color: rgba(27, 194, 134, 0.1);
  color: #1BC286;
}

.el-tag--warning {
  background-color: rgba(255, 129, 7, 0.1);
  color: #FF8107;
}

.el-tag--danger {
  background-color: rgba(255, 77, 79, 0.1);
  color: #FF4D4F;
}

// 认证抽屉
.auth-drawer {
  ::v-deep .el-drawer__header {
    padding: 18px 24px;
    border-bottom: 1px solid #F0F2F5;
    margin-bottom: 0;
    background: linear-gradient(135deg, #f7f2ff 0%, #fbfaff 100%);
    color: #303133;
    font-weight: 600;
  }

  ::v-deep .el-drawer__body {
    padding: 0;
    overflow: hidden;
    background: #F7F8FC;
  }

  .drawer-content {
    height: 100%;
    overflow-y: auto;
    padding: 20px;

    .auth-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      margin-bottom: 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, #7f38ff 0%, #a667ff 100%);
      color: #fff;
      box-shadow: 0 10px 24px rgba(143, 3, 255, 0.18);
    }

    .summary-title {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.4;
    }

    .summary-subtitle {
      margin-top: 4px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.82);
    }

    .summary-note {
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.92);
    }

    .summary-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 34px;
      padding: 0 16px;
      border: 1px solid rgba(255, 255, 255, 0.32);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      line-height: 32px;
      letter-spacing: 0.5px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }

    .summary-tag-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.14);
      flex-shrink: 0;
    }

    .summary-tag-0 {
      background: linear-gradient(135deg, #ffb347 0%, #ff8a00 100%);
      border-color: rgba(255, 255, 255, 0.42);
    }

    .summary-tag-1 {
      background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
      border-color: rgba(255, 255, 255, 0.42);
    }

    .summary-tag-2 {
      background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%);
      border-color: rgba(255, 255, 255, 0.42);
    }

    .summary-tag-3 {
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      border-color: rgba(255, 255, 255, 0.42);
    }

    .auth-section {
      margin-bottom: 16px;
      padding: 18px;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 4px 14px rgba(31, 35, 41, 0.05);
    }

    .section-title {
      position: relative;
      padding-left: 12px;
      margin-bottom: 16px;
      font-size: 15px;
      font-weight: 600;
      color: #303133;
    }

    .section-title::before {
      content: '';
      position: absolute;
      left: 0;
      top: 3px;
      width: 4px;
      height: 16px;
      border-radius: 999px;
      background: linear-gradient(180deg, #8f03ff 0%, #c25fff 100%);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: stretch;
    }

    .info-card {
      padding: 14px;
      border: 1px solid #F0F2F5;
      border-radius: 12px;
      background: #FAFBFF;
    }

    .info-label {
      margin-bottom: 8px;
      font-size: 12px;
      color: #909399;
    }

    .info-value {
      font-size: 14px;
      line-height: 1.5;
      color: #303133;
      font-weight: 600;
      word-break: break-all;
    }

    .material-block {
      padding: 14px;
      border-radius: 12px;
      background: #FAFBFF;
    }

    .material-block+.material-block {
      margin-top: 12px;
    }

    .material-title {
      margin-bottom: 10px;
      font-size: 13px;
      color: #606266;
      font-weight: 600;
    }

    .material-subtitle {
      margin-bottom: 10px;
      font-size: 12px;
      color: #909399;
    }

    .material-subtitle--spaced {
      margin-top: 14px;
    }

    .skill-images {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;

      .skill-media {
        width: 92px;
        height: 92px;
        border-radius: 10px;
        object-fit: cover;
        cursor: pointer;
        border: 1px solid #EBEEF5;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        background: #fff;
      }

      .skill-video-thumb {
        padding: 0;
        background: transparent;
        border: none;
        outline: none;
        position: relative;
      }

      .skill-video-thumb__video {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        object-fit: cover;
        display: block;
      }

      .skill-video-thumb__mask {
        position: absolute;
        inset: 0;
        border-radius: 10px;
        background: radial-gradient(240px 180px at 50% 45%, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.28) 100%);
        pointer-events: none;
        opacity: 1;
      }

      .skill-video-thumb__play {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 42px;
        height: 42px;
        margin-left: -21px;
        margin-top: -21px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
        pointer-events: none;
      }

      .skill-video-thumb__play::after {
        content: '';
        position: absolute;
        left: 16px;
        top: 13px;
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-left: 12px solid rgba(143, 3, 255, 0.92);
      }

      .skill-video-thumb:hover {
        transform: translateY(-1px);
      }

      .skill-video-thumb:hover .skill-video-thumb__mask {
        background: radial-gradient(240px 180px at 50% 45%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.24) 100%);
      }

      .skill-video-thumb:active {
        transform: translateY(0);
      }
    }

    .voice-player {
      width: 100%;
      border-radius: 10px;
      background: #fff;
    }

    .meta-list {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #fff;
    }

    .meta-title {
      margin-bottom: 8px;
      font-size: 12px;
      color: #909399;
      line-height: 1.6;
    }

    .meta-line {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: #606266;
      font-size: 12px;
      line-height: 1.6;
      word-break: break-all;

      .meta-label {
        flex: none;
      }

      .meta-value {
        flex: 1;
        min-width: 0;
        text-align: right;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-all;
      }
    }

    .meta-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .meta-chip-list--compact {
      margin-top: 0;
    }

    .meta-chip {
      padding: 6px 10px;
      border-radius: 999px;
      background: #fff;
      color: #606266;
      font-size: 12px;
      border: 1px solid #ebeef5;
    }

    .meta-chip--plain {
      max-width: 100%;
      border-radius: 10px;
      white-space: normal;
      word-break: break-all;
      overflow-wrap: anywhere;
    }

    .info-card--full {
      grid-column: 1 / -1;
    }

    .meta-empty {
      font-size: 12px;
      color: #909399;
      line-height: 1.6;
    }

    .helper-text {
      margin-bottom: 8px;
      font-size: 12px;
      line-height: 1.6;
      color: #909399;
    }

    .field-values {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field-item {
      padding: 14px;
      border: 1px solid #F0F2F5;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
    }

    .field-item--missing {
      border-style: dashed;
      border-color: #dcdfe6;
    }

    .field-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .field-name {
      color: #303133;
      font-weight: 600;
      text-align: left;
    }

    .field-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .field-badge {
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 1;
      white-space: nowrap;
    }

    .field-badge--required {
      background: rgba(255, 77, 79, 0.1);
      color: #ff4d4f;
    }

    .field-badge--optional {
      background: rgba(144, 147, 153, 0.12);
      color: #909399;
    }

    .field-type {
      color: #909399;
      font-size: 12px;
      flex-shrink: 0;
      padding: 4px 8px;
      border-radius: 999px;
      background: #f3ecff;
    }

    .field-content {
      color: #606266;
      text-align: left;
      word-break: break-all;
      line-height: 1.7;
    }

    .field-text,
    .text-block {
      padding: 12px 14px;
      border-radius: 10px;
      background: #fff;
      color: #606266;
      line-height: 1.7;
      word-break: break-all;
    }

    .field-images {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .field-options {
      margin-top: 10px;
      font-size: 12px;
      line-height: 1.6;
      color: #909399;
    }

    .field-image {
      width: 76px;
      height: 76px;
      border-radius: 8px;
      border: 1px solid #EBEEF5;
    }

    .empty-value,
    .empty-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 72px;
      border-radius: 12px;
      background: #FAFBFF;
      color: #909399;
      font-size: 13px;
    }
  }
}

// 驳回弹窗
.reject-dialog {
  ::v-deep .el-dialog__body {
    padding: 20px 24px;
  }

  ::v-deep .assessment-level-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 2px;
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered {
    margin: 0;
    height: 46px;
    width: 100%;
    padding: 0 46px 0 16px;
    border-radius: 14px;
    border: 1px solid transparent;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(250, 250, 255, 0.9) 100%) padding-box,
      linear-gradient(135deg, rgba(143, 3, 255, 0.28) 0%, rgba(63, 124, 255, 0.18) 100%) border-box;
    box-shadow: 0 18px 50px rgba(16, 24, 40, 0.08);
    display: flex;
    align-items: center;
    transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border-color 0.22s ease;
    overflow: hidden;
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(700px 240px at 14% 0%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 55%);
    transition: opacity 0.22s ease;
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered:hover {
    transform: translateY(-1px);
    box-shadow: 0 22px 60px rgba(16, 24, 40, 0.12);

    &::after {
      opacity: 1;
    }
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered.is-checked {
    border-color: transparent;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 250, 255, 0.86) 100%) padding-box,
      linear-gradient(135deg, rgba(143, 3, 255, 0.85) 0%, rgba(63, 124, 255, 0.75) 100%) border-box;
    box-shadow: 0 26px 70px rgba(106, 53, 255, 0.18);
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered.is-checked::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 1;
    background: radial-gradient(700px 240px at 14% 0%, rgba(143, 3, 255, 0.18) 0%, rgba(143, 3, 255, 0) 55%);
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered.is-checked .assessment-level-check {
    opacity: 1;
  }

  ::v-deep .assessment-level-group .el-radio__input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  ::v-deep .assessment-level-group .el-radio__label {
    padding-left: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2px;
    color: rgba(32, 32, 60, 0.9);
  }

  ::v-deep .assessment-level-group .el-radio__input.is-checked + .el-radio__label {
    color: rgba(32, 32, 60, 0.96);
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered {
    position: relative;
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered .assessment-level-check {
    position: absolute;
    top: 50%;
    right: 16px;
    width: 18px;
    height: 18px;
    margin-top: -9px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(143, 3, 255, 0.95) 0%, rgba(63, 124, 255, 0.85) 100%);
    box-shadow: 0 10px 24px rgba(106, 53, 255, 0.22);
    opacity: 0;
    transform: scale(0.92);
    transition: opacity 0.22s ease, transform 0.22s ease;
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered.is-checked .assessment-level-check {
    transform: scale(1);
  }

  ::v-deep .assessment-level-group .el-radio.is-bordered .assessment-level-check::after {
    content: '';
    position: absolute;
    top: 6px;
    left: 5px;
    width: 7px;
    height: 4px;
    border-left: 2px solid rgba(255, 255, 255, 0.98);
    border-bottom: 2px solid rgba(255, 255, 255, 0.98);
    transform: rotate(-45deg);
  }
}

.dialog-footer {
  text-align: right;

  .el-button {
    min-width: 80px;
  }
}

.video-preview-dialog {
  ::v-deep .el-dialog__body {
    padding: 16px 18px 18px;
  }
}

.video-preview-body {
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-preview-player {
  width: 100%;
  max-height: 70vh;
  border-radius: 14px;
  background: #000;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
}

// 技能冻结说明
::v-deep .freeze-info-dialog {
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(49, 56, 84, 0.18);
}

::v-deep .freeze-info-dialog .el-dialog__header {
  display: none;
}

::v-deep .freeze-info-dialog .el-dialog__body {
  padding: 0;
}

.freeze-info-panel {
  padding: 22px 22px 18px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f8f9fd 100%);
}

.freeze-info-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.freeze-info-panel__title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2533;
  line-height: 1.2;
}

.freeze-info-panel__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #8a93a6;
}

.freeze-info-panel__close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background: #f3f4f8;
  color: #909399;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #ebecef;
    color: #606266;
  }
}

.freeze-info-panel__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 72px;
}

.freeze-info-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #eef0f5;
  box-shadow: 0 8px 20px rgba(83, 97, 123, 0.04);
}

.freeze-info-card__label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #303645;

  em {
    margin-left: auto;
    font-style: normal;
    font-size: 12px;
    font-weight: 600;
    color: #9047f8;
    background: rgba(144, 71, 248, 0.08);
    border-radius: 999px;
    padding: 2px 8px;
  }
}

.freeze-info-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9047f8;
  box-shadow: 0 0 0 3px rgba(144, 71, 248, 0.12);
}

.freeze-info-card__dot--muted {
  background: #909399;
  box-shadow: 0 0 0 3px rgba(144, 147, 153, 0.12);
}

.freeze-info-card__dot--attach {
  background: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
}

.freeze-info-card__value {
  font-size: 14px;
  line-height: 1.7;
  color: #5d6678;
  word-break: break-all;
  white-space: pre-wrap;
}

.freeze-info-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.freeze-info-image {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e8eaf0;
  cursor: pointer;
  background: #f7f8fc;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(64, 70, 96, 0.12);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.freeze-info-panel__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.freeze-info-btn {
  min-width: 88px;
  border-radius: 10px;
  font-weight: 600;
  background: #2f3542;
  border-color: #2f3542;
  color: #fff;

  &:hover,
  &:focus {
    background: #3a4150;
    border-color: #3a4150;
    color: #fff;
  }
}
</style>
