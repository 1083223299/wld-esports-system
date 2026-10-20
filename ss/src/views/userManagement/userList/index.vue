<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        @search="handleSearch" @reset="handleReset">
      </SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="userId" v-loading="loading" :border="false" height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <!-- 用户ID -->
          <el-table-column prop="userId" label="用户ID" width="100" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.userId }}
            </template>
          </el-table-column>
          <!-- 用户名称 -->
          <el-table-column prop="nickName" label="用户名称" width="110" show-overflow-tooltip>
          </el-table-column>

          <!-- 用户头像 -->
          <el-table-column label="用户头像" width="80">
            <template slot-scope="scope">
              <div class="avatar-cell">
                <!-- 有链接时加载目标图片，加载失败触发error事件替换为默认图 -->
                <img v-if="scope.row.avatar" :src="scope.row.avatar" class="avatar-thumb"
                  @click="previewAvatar(scope.row)" @error="(e) => handleImgError(e)" />
                <!-- 无链接直接显示默认图 -->
                <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" @click="defaulImg" />
              </div>
            </template>
          </el-table-column>

          <!-- 性别 -->
          <el-table-column prop="sex" label="性别" width="70">
            <template slot-scope="{ row }">
              {{ getGenderText(row.sex) }}
            </template>
          </el-table-column>

          <!-- 用户实名信息 -->
          <el-table-column prop="relName" label="用户实名信息" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">
              <div v-if="row.authType >= 2" class="real-info">
                <div class="real-info__name">{{ row.relName || '-' }}</div>
                <div class="real-info__card">{{ row.idCard || '-' }}</div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 身份类型 -->
          <el-table-column prop="isMember" label="身份类型" width="100">
            <template slot-scope="{ row }">
              <el-tag size="medium" :type="getMemberTypeTag(row.isMember)">
                {{ getMemberTypeText(row.isMember) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 联系方式 -->
          <el-table-column prop="phone" label="联系方式" width="120">
            <template slot-scope="{ row }">
              <PhoneDisplay :value="row.phone" />
            </template>
          </el-table-column>

          <!-- 粉丝数 -->
          <el-table-column prop="fanCount" label="粉丝数" width="90">
            <template slot-scope="{ row }">
              {{ row.fansCount || 0 }}
            </template>
          </el-table-column>

          <!-- 关注数 -->
          <el-table-column prop="followCount" label="关注数" width="90">
            <template slot-scope="{ row }">
              {{ row.followCount || 0 }}
            </template>
          </el-table-column>

          <!-- 访客数 -->
          <!-- <el-table-column prop="visitorCount" label="访客数" width="100">
            <template slot-scope="{ row }">
              {{ row.visitorCount || 0 }}
            </template>
          </el-table-column> -->

          <!-- 接单量 -->
          <el-table-column prop="orderCount" label="接单量" width="90">
            <template slot-scope="{ row }">
              {{ row.orderCount || 0 }}
            </template>
          </el-table-column>

          <!-- 注册时间 -->
          <el-table-column prop="createTime" label="注册时间" width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.createTime || '-' }}
            </template>
          </el-table-column>

          <!-- 解禁时间 -->
          <el-table-column prop="unbanTime" label="解禁时间" width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.unbanTime || '-' }}
            </template>
          </el-table-column>

          <!-- 禁用原因 -->
          <el-table-column prop="banReason" label="禁用原因" min-width="120" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.banReason || '-' }}
            </template>
          </el-table-column>

          <!-- 禁用操作人 -->
          <el-table-column label="禁用操作人" width="150">
            <template slot-scope="{ row }">
              <div v-if="row.banOperatorName || row.banOperatorId" class="ban-operator-cell">
                <div class="ban-operator-name">
                  <span>{{ row.banOperatorName }}</span>
                  <span v-if="row.banOperatorDeleted" class="ban-operator-deleted">已注销</span>
                </div>
                <div class="ban-operator-id">ID: {{ row.banOperatorId }}</div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" fixed="right" width="250">
            <template slot-scope="{ row }">
              <div class="action-buttons">
                <el-button type="text" size="mini"
                  :class="row.status === '0' ? 'action-btn--danger' : 'action-btn--success'"
                  @click="handleStatusChange(row)" v-permission="'system:disabled:list'">
                  {{ row.status === '0' ? '禁用' : '启用' }}
                </el-button>
                <el-button type="text" size="mini" class="action-btn--primary" @click="handleAccountQuery(row)"
                  v-permission="'system:userList:AssetQuery'">资产查询</el-button>
                <el-button type="text" size="mini" class="action-btn--warning" @click="handleDeductionDialog(row)"
                  v-permission="'system:userList:CoinDeduction'">未来币扣减</el-button>
                <el-button type="text" size="mini" class="action-btn--info" @click="handleDeductionLogDrawer(row)"
                  v-permission="'system:userList:DeductionLog'">扣减日志</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 固定底部：分页区域 -->
      <div class="pagination-fixed">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 图片放大组件：v-model控制显示，单图传[url] -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
    <!-- 资产查询 -->
    <el-dialog :visible.sync="accountDialogVisible" width="430px" :close-on-click-modal="false" class="account-dialog"
      append-to-body>
      <div class="account-dialog__panel" v-loading="accountLoading">
        <div class="account-dialog__header">
          <div>
            <div class="account-dialog__title">资产查询</div>
            <div class="account-dialog__subtitle">查看当前用户账户余额与收入明细</div>
          </div>
          <div class="account-dialog__user">ID {{ accountDetail.userId || '--' }}</div>
        </div>

        <div class="account-hero">
          <div class="account-hero__label">我的余额</div>
          <div class="account-hero__value">{{ formatAmount(accountDetail.amount) }}</div>
          <div class="account-hero__unit">元</div>
        </div>
        <div class="account-section account-section--income">
          <div class="account-section__title">收入</div>
          <div class="account-grid">
            <div class="account-card">
              <div class="account-card__label">总收入</div>
              <div class="account-card__value">{{ formatAmount(accountDetail.allAmount) }}</div>
            </div>
            <div class="account-card account-card--accent">
              <div class="account-card__label">可用余额（可提现）</div>
              <div class="account-card__value">{{ formatAmount(accountDetail.availableAmount) }}</div>
            </div>
            <div class="account-card">
              <div class="account-card__label">未结算余额（结算中）</div>
              <div class="account-card__value">{{ formatAmount(accountDetail.freezeAmount) }}</div>
            </div>
            <div class="account-card">
              <div class="account-card__label">已提现余额</div>
              <div class="account-card__value">{{ formatAmount(accountDetail.withdrawnAmount) }}</div>
            </div>
          </div>
          <div class="account-dialog__footer">
            <el-button class="account-dialog__close" @click="accountDialogVisible = false">关闭</el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 禁用用户 -->
    <el-dialog :visible.sync="banDialogVisible" width="560px" custom-class="user-ban-dialog" append-to-body
      :close-on-click-modal="false" :show-close="false" @close="resetBanForm">
      <div class="ban-dialog__panel" v-loading="banDialogLoading">
        <div class="ban-dialog__header">
          <div>
            <div class="ban-dialog__title">禁用</div>
            <div class="ban-dialog__subtitle">请填写禁用信息，提交后将按规则限制账号使用</div>
          </div>
          <div class="ban-dialog__user">用户ID {{ banTargetUser.userId || '--' }}</div>
        </div>

        <div v-if="banClubInfo.visible" class="ban-dialog__club">
          <div class="ban-dialog__club-label">所属俱乐部</div>
          <div class="ban-dialog__club-value">{{ banClubInfo.text }}</div>
        </div>

        <el-form ref="banFormRef" :model="banForm" :rules="banRules" label-width="96px" class="ban-dialog__form">
          <div class="ban-dialog__form-card">
            <el-form-item label="禁用" prop="banType">
              <el-radio-group v-model="banForm.banType" class="ban-dialog__radios" @change="handleBanTypeChange">
                <el-radio label="temporary" class="ban-dialog__radio">临时禁用</el-radio>
                <el-radio label="permanent" class="ban-dialog__radio">永久禁用</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="banForm.banType === 'temporary'" label="禁用天数" prop="banDays" required>
              <div class="ban-dialog__days" :class="{ 'is-focus': banDaysFocused }">
                <el-input v-model="banForm.banDays" class="ban-dialog__days-input" placeholder="请输入禁用天数" maxlength="5"
                  @input="handleBanDaysInput" @keypress.native="handleBanDaysKeypress"
                  @paste.native="handleBanDaysPaste" @focus="banDaysFocused = true" @blur="banDaysFocused = false" />
                <span class="ban-dialog__days-unit">天</span>
              </div>
            </el-form-item>
            <el-form-item label="禁用账号" prop="banScope">
              <el-radio-group v-model="banForm.banScope" class="ban-dialog__radios">
                <el-radio label="current" class="ban-dialog__radio">仅当前账号</el-radio>
                <el-radio label="allIdCard" class="ban-dialog__radio">同身份证下所有账号</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="禁用原因" prop="banReason">
              <el-input v-model="banForm.banReason" type="textarea" :rows="4" maxlength="50" show-word-limit
                placeholder="请输入禁用原因（用户端可见）" />
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="banForm.remark" type="textarea" :rows="3" maxlength="50" show-word-limit
                placeholder="请输入备注（选填）" />
            </el-form-item>
          </div>

          <div class="ban-dialog__upload-card">
            <div class="ban-dialog__upload-card-header">
              <div class="ban-dialog__upload-card-title">上传附件</div>
              <div class="ban-dialog__upload-card-desc">支持图片、录音、视频，最多上传 5 组，支持点击预览</div>
            </div>
            <el-form-item label-width="0" class="ban-dialog__upload-card-form-item">
              <div class="ban-upload">
                <div class="ban-upload__list">
                  <div v-for="(item, index) in banAttachments" :key="`${item.ossId}-${index}`" class="ban-upload__item">
                    <img v-if="item.type === 'image'" :src="item.url" class="ban-upload__img"
                      @click="handleBanPreviewImage(index)" />
                    <template v-else-if="item.type === 'video'">
                      <video :src="item.url" class="ban-upload__img" preload="metadata"
                        @click="handleBanPreviewMedia(item.url, 'video')" />
                      <div class="ban-upload__media-icon"><i class="el-icon-video-play" /></div>
                    </template>
                    <template v-else>
                      <div class="ban-upload__img ban-upload__audio" @click="handleBanPreviewMedia(item.url, 'audio')">
                        <i class="el-icon-headset"></i>
                        <span>录音</span>
                      </div>
                      <div class="ban-upload__media-icon"><i class="el-icon-headset" /></div>
                    </template>
                    <button type="button" class="ban-upload__remove" @click="handleBanDeleteAttachment(index)">
                      <i class="el-icon-close"></i>
                    </button>
                  </div>

                  <el-upload v-if="banAttachments.length < 5" action="#" :show-file-list="false"
                    :before-upload="beforeBanUpload" :http-request="handleBanUpload" class="ban-upload__uploader"
                    accept=".png,.jpg,.jpeg,.gif,.mp3,.wav,.mp4,.m4a,.avi" :disabled="banUploading">
                    <div class="ban-upload__trigger">
                      <div v-if="banUploading" class="ban-upload__loading">
                        <i class="el-icon-loading"></i>
                        <span>上传中...</span>
                      </div>
                      <template v-else>
                        <i class="el-icon-plus"></i>
                        <span>上传文件</span>
                      </template>
                    </div>
                  </el-upload>
                </div>
              </div>
            </el-form-item>
          </div>
        </el-form>

        <div class="ban-dialog__footer">
          <el-button class="ban-dialog__btn ban-dialog__btn--ghost" @click="banDialogVisible = false">取消</el-button>
          <el-button type="primary" class="ban-dialog__btn ban-dialog__btn--primary" :loading="banSubmitting"
            @click="submitBanForm">提交</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog :visible.sync="banMediaDialogVisible" width="640px" :close-on-click-modal="true"
      custom-class="ban-media-dialog" append-to-body @close="handleBanMediaDialogClose">
      <video v-if="banMediaType === 'video'" :src="banMediaUrl" controls autoplay class="ban-media-player" />
      <audio v-else-if="banMediaType === 'audio'" :src="banMediaUrl" controls autoplay
        class="ban-media-player ban-media-player--audio" />
    </el-dialog>

    <FutureCoinDeductionDialog :visible.sync="deductionDialogVisible" :user-id="deductionForm.userId" />

    <el-drawer :visible.sync="deductionLogDrawerVisible" direction="rtl" size="60vw" class="deduction-log-drawer"
      :with-header="false" append-to-body>
      <div class="deduction-log-drawer__body" v-loading="deductionLogLoading">
        <div class="deduction-log-drawer__summary">
          <div>
            <div class="deduction-log-drawer__title">扣减日志</div>
            <div class="deduction-log-drawer__subtitle">
              用户 {{ deductionLogCurrentUser.userName || '--' }} · ID {{ deductionLogCurrentUser.userId || '--' }}
            </div>
          </div>
          <el-button type="text" class="deduction-log-drawer__close" @click="deductionLogDrawerVisible = false">
            <i class="el-icon-close"></i>
          </el-button>
        </div>

        <div class="deduction-log-drawer__search">
          <SearchForm ref="deductionLogSearchForm" :fields="deductionLogSearchItems"
            :initial-values="deductionLogFilterForm" :gutter="16" @search="handleDeductionLogSearch"
            @reset="handleDeductionLogReset" />
        </div>

        <div class="deduction-log-drawer__table">
          <el-table :data="deductionLogTableData" stripe :border="false"
            :header-row-style="{ backgroundColor: '#F6F7FB' }" :header-cell-style="{ textAlign: 'center' }"
            :cell-style="{ textAlign: 'center' }" height="100%">
            <el-table-column label="扣减类型" min-width="110">
              <template slot-scope="{ row }">
                {{ getDeductionTypeText(row.type) }}
              </template>
            </el-table-column>
            <el-table-column label="未来币金额" min-width="110">
              <template slot-scope="{ row }">
                <span class="deduction-log-amount">-{{ formatAmount(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="140" show-overflow-tooltip />
            <el-table-column label="扣除凭证" min-width="150">
              <template slot-scope="{ row }">
                <div v-if="normalizeLogImages(row.ossUrls).length" class="deduction-log-vouchers">
                  <div v-for="(img, index) in normalizeLogImages(row.ossUrls).slice(0, 4)" :key="`${row.id}-${index}`"
                    class="deduction-log-voucher" @click="previewDeductionLogImages(row.ossUrls, index)">
                    <img :src="img" alt="" />
                  </div>
                  <div v-if="normalizeLogImages(row.ossUrls).length > 4"
                    class="deduction-log-voucher deduction-log-voucher--more"
                    @click="previewDeductionLogImages(row.ossUrls, 0)">
                    +{{ normalizeLogImages(row.ossUrls).length - 4 }}
                  </div>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="关联订单号" min-width="130">
              <template slot-scope="{ row }">
                <span class="deduction-log-order">{{ row.orderId || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="100">
              <template slot-scope="{ row }">
                <span :class="['deduction-log-status', `is-${getDeductionStatusTheme(row.status)}`]">
                  {{ getDeductionStatusText(row.status) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="原因" min-width="120" show-overflow-tooltip>
              <template slot-scope="{ row }">
                {{ row.auditRemark || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="提交时间" min-width="160">
              <template slot-scope="{ row }">
                {{ row.createTime || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="扣除时间" min-width="160">
              <template slot-scope="{ row }">
                {{ row.updateTime || '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="deduction-log-drawer__pagination">
          <PaginationSimple :current-page="deductionLogPagination.pageNum" :page-size="deductionLogPagination.pageSize"
            :total="deductionLogPagination.total" @current-change="handleDeductionLogPageChange" />
        </div>
      </div>
    </el-drawer>

    <ImgZoom v-model="deductionPreviewVisible" :img-list="deductionPreviewList"
      :initial-index="deductionPreviewIndex" />
    <ImgZoom v-model="deductionLogPreviewVisible" :img-list="deductionLogPreviewList"
      :initial-index="deductionLogPreviewIndex" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import FutureCoinDeductionDialog from "@/components/FutureCoinDeductionDialog/index.vue";
import { getUserPriceClass } from "@/api/reportComplaint";
import checkPermission from "@/utils/checkPermission";
import { fileUpload } from '@/api/user';
import { userList, updateUserStatus, getUserAccountDetail, addAccountApproval, openListAccountApproval } from '@/api/personalSupport';

export default {
  name: 'UserList',
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom,
    FutureCoinDeductionDialog,
    PhoneDisplay
  },
  data() {
    return {
      // ========== 搜索表单配置 ==========
      searchItems: [
        {
          prop: "nickName",
          label: "用户名称",
          type: "input",
          placeholder: "请输入用户名称",
          clearable: true
        },
        {
          prop: "userId",
          label: "用户ID",
          type: "input",
          placeholder: "请输入用户ID",
          clearable: true
        },
        {
          prop: "phone",
          label: "联系方式",
          type: "input",
          placeholder: "请输入手机号/邮箱",
          clearable: true
        },
        {
          prop: "relName",
          label: "真实姓名",
          type: "input",
          placeholder: "请输入真实姓名",
          clearable: true
        },
        {
          prop: "idCard",
          label: "身份证号码",
          type: "input",
          placeholder: "请输入身份证号码",
          clearable: true
        },
        {
          prop: "status",
          label: "账号状态",
          type: "select",
          placeholder: "请选择状态",
          clearable: true,
          options: [
            { label: "启用", value: "0" },
            { label: "禁用", value: "1" }
          ]
        },
        {
          prop: "isMember",
          label: "身份类型",
          type: "select",
          placeholder: "请选择身份类型",
          clearable: true,
          options: [
            { label: "普通用户", value: "0" },
            { label: "公会成员", value: "1" },
            { label: "公会负责人", value: "2" },
            { label: "商户陪陪", value: "4" }
          ]
        },
        {
          prop: "createTime",
          label: "注册时间",
          type: "daterange",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          clearable: true,
          valueFormat: "yyyy-MM-dd HH:mm",
          pickerOptions: {
            disabledDate: (time) => {
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return time.getTime() < oneMonthAgo.getTime();
            }
          }
        }
      ],

      // 筛选表单数据
      filterForm: {
        nickName: '',
        userId: '',
        phone: '',
        relName: '',
        idCard: '',
        status: '',
        isMember: '',
        createTime: null
      },

      // 分页参数
      pagination: { pageNum: 1, pageSize: 10, total: 0 },

      // 表格数据
      tableData: [],
      loading: false,

      // 头像预览
      avatarDialogVisible: false,
      previewAvatarUrl: '',
      accountDialogVisible: false,
      accountLoading: false,
      accountDetail: {
        userId: '',
        amount: 0,
        allAmount: 0,
        freezeAmount: 0,
        withdrawnAmount: 0,
        availableAmount: 0
      },
      deductionDialogVisible: false,
      deductionLoading: false,
      deductionSubmitting: false,
      deductionUploading: false,
      deductionPreviewVisible: false,
      deductionPreviewIndex: 0,
      deductionPreviewList: [],
      deductionVoucherList: [],
      deductionForm: {
        userId: '',
        type: 0,
        amount: '',
        reason: '',
        ossIds: []
      },
      deductionRules: {
        type: [{ required: true, message: '请选择扣减类型', trigger: 'change' }],
        amount: [{ validator: (rule, value, callback) => this.validateDeductionAmount(rule, value, callback), trigger: 'blur' }],
        reason: [
          { required: true, message: '请输入申请原因', trigger: 'blur' },
          { max: 50, message: '申请原因不能超过50字', trigger: 'blur' }
        ],
        ossIds: [{ validator: (rule, value, callback) => this.validateDeductionVouchers(rule, value, callback), trigger: 'change' }]
      },
      deductionLogDrawerVisible: false,
      deductionLogLoading: false,
      deductionLogTableData: [],
      deductionLogPagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      deductionLogCurrentUser: {
        userId: '',
        userName: '',
        userPhone: ''
      },
      deductionLogFilterForm: {
        userId: '',
        orderId: '',
        type: '',
        status: '',
        createTime: [],
        updateTime: []
      },
      deductionLogSearchItems: [
        {
          prop: "orderId",
          label: "订单号",
          type: "input",
          placeholder: "请输入订单号",
          clearable: true
        },
        {
          prop: "type",
          label: "扣减类型",
          type: "select",
          placeholder: "请选择扣减类型",
          clearable: true,
          options: [
            { label: "我的余额", value: 0 },
            { label: "可用余额（可提现）", value: 1 }
          ]
        },
        {
          prop: "status",
          label: "状态",
          type: "select",
          placeholder: "请选择状态",
          clearable: true,
          options: [
            { label: "待审核", value: 0 },
            { label: "通过", value: 1 },
            { label: "驳回", value: 2 }
          ]
        },
        {
          prop: "createTime",
          label: "提交时间",
          type: "daterange",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间",
          clearable: true,
          valueFormat: "yyyy-MM-dd HH:mm:ss"
        },
        {
          prop: "updateTime",
          label: "扣除时间",
          type: "daterange",
          startPlaceholder: "开始时间",
          endPlaceholder: "结束时间",
          clearable: true,
          valueFormat: "yyyy-MM-dd HH:mm:ss"
        }
      ],
      deductionLogPreviewVisible: false,
      deductionLogPreviewList: [],
      deductionLogPreviewIndex: 0,

      banDialogVisible: false,
      banDialogLoading: false,
      banSubmitting: false,
      banTargetUser: { userId: '', nickName: '' },
      banClubInfo: { visible: false, text: '' },
      banForm: {
        banType: 'temporary',
        banScope: 'current',
        banDays: '',
        banReason: '',
        remark: ''
      },
      banAttachments: [],
      banUploading: false,
      banDaysFocused: false,
      banMediaDialogVisible: false,
      banMediaUrl: '',
      banMediaType: ''
    };
  },
  computed: {
    currentDeductionBalance() {
      return Number(this.deductionForm.type === 0 ? this.accountDetail.amount : this.accountDetail.availableAmount) || 0;
    },
    deductionBalanceLabel() {
      return this.deductionForm.type === 0 ? '我的余额' : '可用余额（可提现）';
    },
    banRules() {
      return {
        banType: [{ required: true, message: '请选择禁用类型', trigger: 'change' }],
        banScope: [{ required: true, message: '请选择禁用账号范围', trigger: 'change' }],
        banDays: [{
          required: true,
          validator: (rule, value, callback) => {
            if (this.banForm.banType !== 'temporary') {
              callback();
              return;
            }
            const days = String(value || '').trim();
            if (!days) {
              callback(new Error('请输入禁用天数'));
              return;
            }
            if (!/^[1-9]\d*$/.test(days)) {
              callback(new Error('禁用天数只能为正整数'));
              return;
            }
            callback();
          },
          trigger: ['blur', 'change']
        }],
        banReason: [
          { required: true, message: '请输入禁用原因', trigger: 'blur' },
          { max: 50, message: '禁用原因不能超过50字', trigger: 'blur' }
        ],
        remark: [{ max: 50, message: '备注不能超过50字', trigger: 'blur' }]
      };
    }
  },

  mounted() {
    this.fetchTableData();
  },

  methods: {
    checkPermission,
    // ========== 数据请求 ==========
    async fetchTableData() {
      this.loading = true;
      try {
        const data = {
          pageNum: this.pagination.pageNum,
          pageSize: this.pagination.pageSize,
          userId: this.filterForm.userId,
          nickName: this.filterForm.nickName,
          phone: this.filterForm.phone,
          relName: this.filterForm.relName,
          idCard: this.filterForm.idCard,
          status: this.filterForm.status,
          isMember: this.filterForm.isMember,
          beginCreateTime: this.filterForm.createTime ? this.filterForm.createTime[0] : '',
          endCreateTime: this.filterForm.createTime ? this.filterForm.createTime[1] : ''
        };

        const resData = await userList(data);
        const res = resData.data;

        if (res.code === 200) {
          this.tableData = (res.rows || []).map(row => ({
            ...row,
            showPhone: false,
          }));
          this.pagination.total = res.total || 0;
        } else {
          this.$message.error(res.msg || "查询失败");
        }
      } catch (error) {
        console.error("获取用户列表失败:", error);
        this.$message.error("获取数据失败");
      } finally {
        this.loading = false;
      }
    },

    // ========== 搜索/重置 ==========
    handleSearch(formValues) {
      this.filterForm = { ...formValues };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset(formValues) {
      this.filterForm = { ...formValues };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    // ========== 分页 ==========
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    async fetchDeductionLogList() {
      this.deductionLogLoading = true;
      try {
        const params = {
          pageNum: this.deductionLogPagination.pageNum,
          pageSize: this.deductionLogPagination.pageSize,
          userId: this.deductionLogFilterForm.userId,
          orderId: this.deductionLogFilterForm.orderId,
          type: this.deductionLogFilterForm.type,
          status: this.deductionLogFilterForm.status,
          createStartTime: this.deductionLogFilterForm.createTime && this.deductionLogFilterForm.createTime.length ? this.deductionLogFilterForm.createTime[0] : '',
          createEndTime: this.deductionLogFilterForm.createTime && this.deductionLogFilterForm.createTime.length ? this.deductionLogFilterForm.createTime[1] : '',
          updateStartTime: this.deductionLogFilterForm.updateTime && this.deductionLogFilterForm.updateTime.length ? this.deductionLogFilterForm.updateTime[0] : '',
          updateEndTime: this.deductionLogFilterForm.updateTime && this.deductionLogFilterForm.updateTime.length ? this.deductionLogFilterForm.updateTime[1] : ''
        };
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null || params[key] === undefined) {
            delete params[key];
          }
        });
        const res = await openListAccountApproval(params);
        if (res && res.success && res.data) {
          this.deductionLogTableData = Array.isArray(res.data.rows) ? res.data.rows : [];
          this.deductionLogPagination.total = Number(res.data.total || 0);
          return;
        }
        this.$message.error((res && res.errorMessage) || '获取扣减日志失败');
      } catch (error) {
        console.error("获取扣减日志失败:", error);
        this.$message.error("获取扣减日志失败");
      } finally {
        this.deductionLogLoading = false;
      }
    },

    // ========== 状态管理 ==========
    handleStatusChange(row) {
      if (row.status === '0') {
        this.openBanDialog(row);
        return;
      }
      this.$confirm('确定要启用该用户吗？', '提示', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(() => this.submitEnableUser(row))
        .catch(() => { });
    },
    isGuildCompanion(row) {
      const member = String(row.isMember ?? '');
      return ['1', '2'].includes(member);
    },
    resolveClubText(tradeUnionIntroduction) {
      const intro = tradeUnionIntroduction || {};
      const name = intro.tradeName || '';
      const id = intro.tradeNo || '';
      if (!name && !id) {
        return '';
      }
      return `${name || '--'}（${id || '--'}）`;
    },
    async openBanDialog(row) {
      this.banTargetUser = {
        userId: row.userId || '',
        nickName: row.nickName || row.userName || ''
      };
      this.resetBanForm();
      this.banDialogVisible = true;
      this.banClubInfo = { visible: false, text: '' };

      if (!this.isGuildCompanion(row)) {
        return;
      }

      this.banDialogLoading = true;
      try {
        const res = await getUserPriceClass({ userId: row.userId });
        const tradeUnionIntroduction =
          (res && res.tradeUnionIntroduction) ||
          (res && res.data && res.data.tradeUnionIntroduction) ||
          null;
        const clubText = this.resolveClubText(tradeUnionIntroduction);
        this.banClubInfo = {
          visible: true,
          text: clubText || '暂无俱乐部信息'
        };
      } catch (error) {
        console.error('获取俱乐部信息失败:', error);
        this.banClubInfo = { visible: true, text: '暂无俱乐部信息' };
      } finally {
        this.banDialogLoading = false;
      }
    },
    resetBanForm() {
      this.banForm = {
        banType: 'temporary',
        banScope: 'current',
        banDays: '',
        banReason: '',
        remark: ''
      };
      this.banAttachments = [];
      this.banUploading = false;
      this.banDaysFocused = false;
      this.$nextTick(() => {
        if (this.$refs.banFormRef) {
          this.$refs.banFormRef.clearValidate();
        }
      });
    },
    /** 禁用天数：仅保留正整数（去掉非数字、前导 0、单独的 0） */
    sanitizeBanDays(value) {
      return String(value || '')
        .replace(/[^\d]/g, '')
        .replace(/^0+/, '');
    },
    handleBanDaysInput(val) {
      this.banForm.banDays = this.sanitizeBanDays(val);
    },
    handleBanDaysKeypress(e) {
      const key = e.key;
      // 允许控制键（Backspace / Delete / Tab / 方向键等）
      if (key.length !== 1) return;
      if (!/\d/.test(key)) {
        e.preventDefault();
        return;
      }
      // 首位不允许输入 0
      if (key === '0' && !String(this.banForm.banDays || '')) {
        e.preventDefault();
      }
    },
    handleBanDaysPaste(e) {
      e.preventDefault();
      const text =
        (e.clipboardData && e.clipboardData.getData('text')) ||
        (window.clipboardData && window.clipboardData.getData('Text')) ||
        '';
      this.banForm.banDays = this.sanitizeBanDays(text).slice(0, 5);
    },
    handleBanTypeChange(val) {
      if (val === 'permanent') {
        this.banForm.banDays = '';
      }
      this.$nextTick(() => {
        if (this.$refs.banFormRef) {
          this.$refs.banFormRef.clearValidate(['banDays']);
        }
      });
    },
    getBanFileType(file) {
      if (!file || !file.type) {
        return 'audio';
      }
      if (file.type.startsWith('image/')) {
        return 'image';
      }
      if (file.type.startsWith('video/')) {
        return 'video';
      }
      return 'audio';
    },
    beforeBanUpload(file) {
      const allowedTypes = [
        'image/png', 'image/jpg', 'image/jpeg', 'image/gif',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a',
        'video/mp4', 'video/avi', 'video/x-msvideo'
      ];
      const name = String(file.name || '').toLowerCase();
      const extAllowed = /\.(png|jpe?g|gif|mp3|wav|mp4|m4a|avi)$/.test(name);
      const typeAllowed = allowedTypes.includes(file.type) || extAllowed;
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!typeAllowed) {
        this.$message.error('仅支持图片、录音、视频格式');
        return false;
      }
      if (!isLt100M) {
        this.$message.error('文件大小不能超过 100MB');
        return false;
      }
      if (this.banAttachments.length >= 5) {
        this.$message.error('最多上传5组文件');
        return false;
      }
      return true;
    },
    async handleBanUpload({ file, onSuccess }) {
      try {
        this.banUploading = true;
        const formData = new FormData();
        formData.append('file', file);
        const response = await fileUpload(formData);
        if (response.code === 200 && response.data && response.data.ossId) {
          this.banAttachments.push({
            url: URL.createObjectURL(file),
            ossId: response.data.ossId,
            type: this.getBanFileType(file)
          });
          onSuccess && onSuccess('success');
          this.$message.success('上传成功');
          return;
        }
        throw new Error(response.message || '上传失败');
      } catch (error) {
        this.$message.error((error && error.message) || '上传失败');
      } finally {
        this.banUploading = false;
      }
    },
    handleBanDeleteAttachment(index) {
      this.banAttachments.splice(index, 1);
    },
    handleBanPreviewImage(index) {
      const imageList = this.banAttachments.filter(item => item.type === 'image').map(item => item.url);
      const imageIndex = imageList.indexOf(this.banAttachments[index].url);
      this.deductionLogPreviewList = imageList;
      this.deductionLogPreviewIndex = imageIndex >= 0 ? imageIndex : 0;
      this.deductionLogPreviewVisible = true;
    },
    handleBanPreviewMedia(url, type) {
      this.banMediaUrl = url;
      this.banMediaType = type;
      this.banMediaDialogVisible = true;
    },
    handleBanMediaDialogClose() {
      this.banMediaUrl = '';
      this.banMediaType = '';
    },
    async submitBanForm() {
      if (!this.$refs.banFormRef) {
        return;
      }
      const valid = await this.$refs.banFormRef.validate().catch(() => false);
      if (!valid) {
        return;
      }
      const isTemporary = this.banForm.banType === 'temporary';
      const payload = {
        userId: Number(this.banTargetUser.userId),
        status: '1',
        banType: isTemporary ? 0 : 1,
        banScope: this.banForm.banScope === 'current' ? 0 : 1,
        banDays: isTemporary ? Number(this.banForm.banDays) : 36500,
        businessType: 'MANUAL',
        banReason: this.banForm.banReason,
        remark: this.banForm.remark || undefined,
        businessFile: this.banAttachments.map(item => item.ossId).filter(Boolean).join(',') || undefined
      };
      this.banSubmitting = true;
      try {
        const res = await updateUserStatus(payload);
        if (res && res.success === false) {
          this.$message.error((res && res.errorMessage) || '禁用失败');
          return;
        }
        this.$message.success('禁用成功');
        this.banDialogVisible = false;
        this.fetchTableData();
      } catch (error) {
        console.error('禁用用户失败:', error);
        this.$message.error('禁用失败');
      } finally {
        this.banSubmitting = false;
      }
    },
    async submitEnableUser(row) {
      const res = await updateUserStatus({
        userId: Number(row.userId),
        status: '0',
      });
      if (res && res.success === false) {
        this.$message.error((res && res.errorMessage) || '启用失败');
        return;
      }
      this.$message.success('启用成功');
      this.fetchTableData();
    },

    async fetchAccountDetail(userId, loadingKey) {
      if (loadingKey) {
        this[loadingKey] = true;
      }
      this.accountDetail = {
        userId: userId || '',
        amount: 0,
        allAmount: 0,
        freezeAmount: 0,
        withdrawnAmount: 0,
        availableAmount: 0
      };
      try {
        const res = await getUserAccountDetail(userId);
        if (res && res.success && res.data) {
          this.accountDetail = {
            ...this.accountDetail,
            ...res.data
          };
          return true;
        }
        this.$message.error((res && res.errorMessage) || '获取资产信息失败');
        return false;
      } catch (error) {
        console.error("获取资产信息失败:", error);
        this.$message.error("获取资产信息失败");
        return false;
      } finally {
        if (loadingKey) {
          this[loadingKey] = false;
        }
      }
    },
    async handleAccountQuery(row) {
      this.accountDialogVisible = true;
      await this.fetchAccountDetail(row.userId, 'accountLoading');
    },
    async handleDeductionDialog(row) {
      this.resetDeductionForm(row.userId);
      this.deductionDialogVisible = true;
    },
    async handleDeductionLogDrawer(row) {
      this.deductionLogCurrentUser = {
        userId: row.userId || '',
        userName: row.nickName || row.userName || '',
        userPhone: row.phone || ''
      };
      this.deductionLogFilterForm = {
        userId: row.userId || '',
        orderId: '',
        type: '',
        status: '',
        createTime: [],
        updateTime: []
      };
      this.deductionLogPagination.pageNum = 1;
      this.deductionLogDrawerVisible = true;
      await this.fetchDeductionLogList();
    },
    handleDeductionLogSearch(formValues) {
      this.deductionLogFilterForm = {
        ...this.deductionLogFilterForm,
        ...formValues,
        userId: this.deductionLogCurrentUser.userId || this.deductionLogFilterForm.userId
      };
      this.deductionLogPagination.pageNum = 1;
      this.fetchDeductionLogList();
    },
    handleDeductionLogReset(formValues) {
      this.deductionLogFilterForm = {
        ...formValues,
        userId: this.deductionLogCurrentUser.userId || ''
      };
      this.deductionLogPagination.pageNum = 1;
      this.fetchDeductionLogList();
    },
    handleDeductionLogPageChange(page) {
      this.deductionLogPagination.pageNum = page;
      this.fetchDeductionLogList();
    },
    handleDeductionTypeChange() {
      if (this.$refs.deductionFormRef) {
        this.$refs.deductionFormRef.clearValidate(['amount']);
      }
    },
    handleDeductionAmountInput(value) {
      this.deductionForm.amount = String(value || '')
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1')
        .replace(/^(\d+)\.(\d{0,2}).*$/, '$1.$2');
    },
    validateDeductionAmount(rule, value, callback) {
      if (value === '' || value === null || value === undefined) {
        callback(new Error('请输入扣减金额'));
        return;
      }
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        callback(new Error('扣减金额必须大于0'));
        return;
      }
      if (amount > this.currentDeductionBalance) {
        callback(new Error('输入值需小于用户未来币余额值'));
        return;
      }
      callback();
    },
    validateDeductionVouchers(rule, value, callback) {
      if (!Array.isArray(this.deductionForm.ossIds) || !this.deductionForm.ossIds.length) {
        callback(new Error('请上传扣除凭证'));
        return;
      }
      callback();
    },
    beforeDeductionUpload(file) {
      const isImage = file.type.startsWith("image/");
      const isLt5M = file.size / 1024 / 1024 < 5;
      const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
      if (!isImage || !allowedTypes.includes(file.type)) {
        this.$message.error("仅支持上传png、jpg、jpeg格式的图片");
        return false;
      }
      if (!isLt5M) {
        this.$message.error("图片大小不能超过 5MB");
        return false;
      }
      if (this.deductionVoucherList.length >= 5) {
        this.$message.error("最多上传5张凭证");
        return false;
      }
      return true;
    },
    async handleDeductionUpload({ file, onSuccess }) {
      try {
        this.deductionUploading = true;
        const formData = new FormData();
        formData.append('file', file);
        const response = await fileUpload(formData);
        if (response.code === 200 && response.data && response.data.ossId) {
          const item = {
            url: URL.createObjectURL(file),
            ossId: response.data.ossId
          };
          this.deductionVoucherList.push(item);
          this.deductionForm.ossIds = this.deductionVoucherList.map(voucher => voucher.ossId);
          if (this.$refs.deductionFormRef) {
            this.$refs.deductionFormRef.validateField('ossIds');
          }
          onSuccess && onSuccess("success");
          this.$message.success("凭证上传成功");
          return;
        }
        throw new Error(response.message || '上传失败');
      } catch (error) {
        this.$message.error(error.message || '上传失败');
      } finally {
        this.deductionUploading = false;
      }
    },
    removeDeductionVoucher(index) {
      this.deductionVoucherList.splice(index, 1);
      this.deductionForm.ossIds = this.deductionVoucherList.map(voucher => voucher.ossId);
      if (this.$refs.deductionFormRef) {
        this.$refs.deductionFormRef.validateField('ossIds');
      }
    },
    previewDeductionVoucher(index) {
      this.deductionPreviewList = this.deductionVoucherList.map(item => item.url);
      this.deductionPreviewIndex = index;
      this.deductionPreviewVisible = true;
    },
    previewDeductionLogImages(urls, index = 0) {
      const list = this.normalizeLogImages(urls);
      if (!list.length) {
        return;
      }
      this.deductionLogPreviewList = list;
      this.deductionLogPreviewIndex = index;
      this.deductionLogPreviewVisible = true;
    },
    resetDeductionForm(userId = '') {
      this.deductionVoucherList = [];
      this.deductionPreviewList = [];
      this.deductionForm = {
        userId: userId || '',
        type: 0,
        amount: '',
        reason: '',
        ossIds: []
      };
      this.$nextTick(() => {
        if (this.$refs.deductionFormRef) {
          this.$refs.deductionFormRef.clearValidate();
        }
      });
    },
    closeDeductionDialog() {
      this.deductionDialogVisible = false;
      this.resetDeductionForm();
    },
    async submitDeduction() {
      if (!this.$refs.deductionFormRef) {
        return;
      }
      this.$refs.deductionFormRef.validate(async valid => {
        if (!valid) {
          return;
        }
        this.deductionSubmitting = true;
        try {
          const payload = {
            userId: this.deductionForm.userId,
            type: this.deductionForm.type,
            amount: Number(this.deductionForm.amount),
            reason: this.deductionForm.reason,
            ossIds: this.deductionForm.ossIds
          };
          const res = await addAccountApproval(payload);
          if (res && (res.success || res.code === 200)) {
            this.$message.success('提交成功');
            this.closeDeductionDialog();
            return;
          }
          this.$message.error((res && (res.errorMessage || res.msg)) || '提交失败');
        } catch (error) {
          console.error("未来币扣减提交失败:", error);
          this.$message.error("提交失败");
        } finally {
          this.deductionSubmitting = false;
        }
      });
    },

    // ========== 头像预览 ==========
    previewAvatar(row) {
      if (row.avatar) {
        this.previewAvatarUrl = row.avatar;
        const img = new Image();
        img.src = this.previewAvatarUrl;
        img.onload = () => {
          this.avatarDialogVisible = true;
        };
        img.onerror = () => {
          this.$message.warning('头像文件损坏或不存在！');
        };
      } else {
        this.$message.warning('头像文件不存在！');
      }
    },

    // 处理图片加载失败
    handleImgError(e) {
      e.target.src = require('@/assets/defaulIcon.png');
      e.target.onerror = null;
    },

    defaulImg() {
      this.$message.warning('头像文件不存在！');
    },

    formatAmount(value) {
      const amount = Number(value || 0);
      if (!Number.isFinite(amount)) {
        return '0.00';
      }
      return amount.toFixed(2);
    },
    normalizeLogImages(list) {
      if (!Array.isArray(list)) {
        return [];
      }
      return list.filter(Boolean);
    },
    getDeductionTypeText(type) {
      const map = {
        0: '我的余额',
        1: '可用余额（可提现）'
      };
      return map[Number(type)] || '-';
    },
    getDeductionStatusText(status) {
      const map = {
        0: '待审核',
        1: '通过',
        2: '驳回'
      };
      return map[Number(status)] || '-';
    },
    getDeductionStatusTheme(status) {
      const map = {
        0: 'pending',
        1: 'success',
        2: 'reject'
      };
      return map[Number(status)] || 'default';
    },

    // ========== 辅助方法 ==========
    getGenderText(sex) {
      const map = { 0: '男', 1: '女', 2: '未知' };
      return map[sex];
    },

    getMemberTypeText(type) {
      const map = { 0: '普通用户', 1: '公会成员', 2: '公会负责人', 4: '商户陪陪' };
      return map[type] || type;
    },

    getMemberTypeTag(type) {
      const map = { 0: 'info', 1: 'success', 2: 'warning', 4: 'danger' };
      return map[type] || 'info';
    },

    // 切换联系方式显示状态
    toggleContactVisibility(row) {
      row.showPhone = !row.showPhone;
    }
  }
};
</script>

<style scoped>
/* 页面容器 */
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 列表卡片 */
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

/* 表格包裹层 - 由 el-table 接管横/竖滚动，滚动条始终在可视区域边缘 */
.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

/* 分页区域 */
.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 4px;
  white-space: nowrap;
}

.action-buttons ::v-deep .el-button--text {
  padding: 0 4px;
  margin: 0;
}

.action-btn--danger {
  color: #f56c6c !important;
}

.action-btn--success {
  color: #67c23a !important;
}

.action-btn--primary {
  color: #6a35ff !important;
}

.action-btn--warning {
  color: #e6a23c !important;
}

.action-btn--info {
  color: #409eff !important;
}

.action-btn--danger:hover,
.action-btn--danger:focus {
  color: #f78989 !important;
}

.action-btn--success:hover,
.action-btn--success:focus {
  color: #85ce61 !important;
}

.action-btn--primary:hover,
.action-btn--primary:focus {
  color: #8f5eff !important;
}

.action-btn--warning:hover,
.action-btn--warning:focus {
  color: #ebb563 !important;
}

.action-btn--info:hover,
.action-btn--info:focus {
  color: #66b1ff !important;
}

.real-info {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.6;
}

.real-info__name {
  color: #1f2533;
  font-weight: 600;
}

.real-info__card {
  color: #7b8496;
  font-size: 12px;
}

/* 头像单元格 */
.avatar-cell {
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.avatar-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.avatar-thumb:hover {
  transform: scale(1.1);
}

/* 联系方式 */
.contact-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-info span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  display: flex;
  align-items: center;
}

.phone-icon {
  margin-left: 8px;
  font-size: 10px;
  cursor: pointer;
}

.account-dialog ::v-deep .el-dialog {
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(31, 37, 51, 0.14);
}

.account-dialog ::v-deep .el-dialog__header {
  display: none;
}

.account-dialog ::v-deep .el-dialog__body {
  padding: 0;
}

.account-dialog__panel {
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.12), transparent 24%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.1), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
}

.account-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.account-dialog__title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2533;
}

.account-dialog__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #7b8496;
}

.account-dialog__user {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(143, 3, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  color: #6a4ce0;
}

.account-hero {
  position: relative;
  margin-bottom: 16px;
  padding: 22px 22px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1d2433 0%, #3d4d6c 100%);
  box-shadow: 0 14px 30px rgba(38, 49, 72, 0.22);
  overflow: hidden;
}

.account-hero::after {
  content: "";
  position: absolute;
  top: -22px;
  right: -12px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.account-hero__label {
  position: relative;
  z-index: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.account-hero__value {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
}

.account-hero__unit {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.account-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(139, 152, 179, 0.12);
  box-shadow: 0 8px 24px rgba(83, 97, 123, 0.08);
}

.account-card--accent {
  background: linear-gradient(135deg, rgba(143, 3, 255, 0.08), rgba(12, 167, 255, 0.1));
  border-color: rgba(143, 3, 255, 0.12);
}

.account-card__label {
  min-height: 36px;
  font-size: 13px;
  line-height: 1.45;
  color: #667085;
}

.account-card__value {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  color: #1f2533;
}

.account-dialog__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.account-dialog__close {
  min-width: 96px;
  height: 38px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #2f3135 0%, #494f59 100%);
  color: #fff;
}

.account-dialog__close:hover,
.account-dialog__close:focus {
  color: #fff;
  background: linear-gradient(135deg, #202226 0%, #3c414b 100%);
}

.deduction-dialog__panel {
  padding: 26px 28px 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 24%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.08), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
}

.deduction-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.deduction-dialog__title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2533;
}

.deduction-dialog__subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #7b8496;
}

.deduction-dialog__user {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(143, 3, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  color: #6a4ce0;
}

.deduction-summary {
  position: relative;
  margin-bottom: 16px;
  padding: 22px 22px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
  box-shadow: 0 14px 28px rgba(44, 58, 88, 0.2);
  overflow: hidden;
}

.deduction-summary::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.deduction-summary__label,
.deduction-summary__value,
.deduction-summary__unit {
  position: relative;
  z-index: 1;
}

.deduction-summary__label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.deduction-summary__value {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
  color: #fff;
}

.deduction-summary__unit {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}

.deduction-form ::v-deep .el-form-item {
  margin-bottom: 20px;
}

.deduction-form ::v-deep .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.deduction-form-card,
.deduction-upload-card {
  padding: 18px 18px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(225, 230, 239, 0.88);
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.08);
}

.deduction-upload-card {
  margin-top: 14px;
  padding-bottom: 16px;
}

.deduction-radio-group {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  width: 100%;
}

.deduction-radio {
  margin-right: 0;
}

.deduction-radio-group ::v-deep .el-radio__label {
  font-size: 14px;
  color: #4b5565;
}

.deduction-radio-group ::v-deep .el-radio__input.is-checked+.el-radio__label {
  color: #5b46d6;
  font-weight: 600;
}

.deduction-radio-group ::v-deep .el-radio__inner {
  width: 16px;
  height: 16px;
  border-color: #c9d2e3;
}

.deduction-radio-group ::v-deep .el-radio__input.is-checked .el-radio__inner {
  border-color: #8f03ff;
  background: #8f03ff;
}

.deduction-radio-group ::v-deep .el-radio__inner::after {
  width: 6px;
  height: 6px;
}

.deduction-amount {
  display: flex;
  align-items: center;
  gap: 10px;
}

.deduction-form ::v-deep .el-input__inner,
.deduction-form ::v-deep .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.deduction-form ::v-deep .el-input__inner {
  height: 42px;
  line-height: 42px;
}

.deduction-form ::v-deep .el-input__inner:focus,
.deduction-form ::v-deep .el-textarea__inner:focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.deduction-form ::v-deep .el-input-group__append {
  border-color: #e2e8f2;
  background: #f5f7fb;
  color: #5d6678;
  font-weight: 600;
  border-radius: 0 14px 14px 0;
}

.deduction-upload-card__header {
  margin-bottom: 14px;
}

.deduction-upload-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2533;
}

.deduction-required {
  margin-right: 4px;
  color: #f56c6c;
}

.deduction-label-required {
  margin-right: 4px;
  color: #f56c6c;
}

.deduction-upload-card__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a94a6;
}

.deduction-upload-card__form-item {
  margin-bottom: 0 !important;
}

.deduction-upload__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.deduction-upload__item,
.deduction-upload__trigger {
  width: 92px;
  height: 92px;
  border-radius: 18px;
}

.deduction-upload__item {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6eaf2;
  background: #fff;
  box-shadow: 0 8px 20px rgba(90, 105, 132, 0.08);
}

.deduction-upload__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.deduction-upload__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  cursor: pointer;
}

.deduction-upload__uploader {
  display: inline-flex;
}

.deduction-upload__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  border: 1px dashed #cad3e4;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  color: #6d7890;
  transition: all 0.2s ease;
}

.deduction-upload__trigger:hover {
  border-color: #8f03ff;
  color: #6a4ce0;
  box-shadow: 0 10px 22px rgba(143, 3, 255, 0.08);
}

.deduction-upload__loading {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.deduction-upload__tip {
  margin-top: 10px;
  font-size: 12px;
  color: #8a94a6;
}

.deduction-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.deduction-dialog__btn {
  min-width: 92px;
  height: 38px;
  border-radius: 999px;
}

.deduction-dialog__btn--ghost {
  border-color: #dbe1ec;
  background: #fff;
  color: #566174;
}

.deduction-dialog__btn--ghost:hover,
.deduction-dialog__btn--ghost:focus {
  color: #566174;
  border-color: #c8d1e0;
  background: #f8faff;
}

.deduction-dialog__btn--primary {
  border: none;
  background: linear-gradient(135deg, #8f03ff 0%, #5c67ff 100%);
  box-shadow: 0 10px 22px rgba(108, 95, 255, 0.22);
}

.deduction-dialog__btn--primary:hover,
.deduction-dialog__btn--primary:focus {
  background: linear-gradient(135deg, #7b00df 0%, #4f58eb 100%);
}

.deduction-log-drawer {
  ::v-deep .el-drawer__body {
    padding: 0;
    overflow: hidden;
    background: #f6f8fc;
  }
}

.deduction-log-drawer__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px;
  box-sizing: border-box;
}

.deduction-log-drawer__summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, #7f38ff 0%, #a667ff 100%);
  color: #fff;
  box-shadow: 0 12px 28px rgba(143, 3, 255, 0.18);
}

.deduction-log-drawer__title {
  font-size: 20px;
  font-weight: 700;
}

.deduction-log-drawer__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.84);
}

.deduction-log-drawer__close {
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
}

.deduction-log-drawer__search {
  margin-top: 16px;
  padding: 16px 18px 2px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(31, 35, 41, 0.06);
}

.deduction-log-drawer__table {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
  padding: 14px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(31, 35, 41, 0.06);
}

.deduction-log-drawer__pagination {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(31, 35, 41, 0.06);
}

.deduction-log-amount {
  font-weight: 700;
  color: #f56c6c;
}

.deduction-log-order {
  color: #2b78ff;
  font-weight: 600;
}

.deduction-log-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.deduction-log-status.is-pending {
  background: rgba(255, 173, 51, 0.12);
  color: #ff9f1a;
}

.deduction-log-status.is-success {
  background: rgba(52, 199, 89, 0.12);
  color: #20a053;
}

.deduction-log-status.is-reject {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.deduction-log-status.is-default {
  background: rgba(123, 132, 150, 0.12);
  color: #7b8496;
}

.deduction-log-vouchers {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.deduction-log-voucher {
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #e7ebf2;
  background: #f8faff;
  cursor: pointer;
}

.deduction-log-voucher img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.deduction-log-voucher--more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #6b7384;
}

.ban-dialog__panel {
  padding: 26px 28px 24px;
  background:
    radial-gradient(circle at top left, rgba(143, 3, 255, 0.1), transparent 24%),
    radial-gradient(circle at top right, rgba(12, 167, 255, 0.08), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
}

.ban-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.ban-dialog__title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2533;
}

.ban-dialog__subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #7b8496;
}

.ban-dialog__user {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(143, 3, 255, 0.08);
  font-size: 12px;
  font-weight: 600;
  color: #6a4ce0;
}

.ban-dialog__club {
  position: relative;
  margin-bottom: 16px;
  padding: 18px 22px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1f2433 0%, #34435f 100%);
  box-shadow: 0 14px 28px rgba(44, 58, 88, 0.2);
  overflow: hidden;
}

.ban-dialog__club::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.ban-dialog__club-label,
.ban-dialog__club-value {
  position: relative;
  z-index: 1;
}

.ban-dialog__club-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.ban-dialog__club-value {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  color: #fff;
}

.ban-dialog__form ::v-deep .el-form-item {
  margin-bottom: 20px;
}

.ban-dialog__form ::v-deep .el-form-item__label {
  font-weight: 600;
  color: #303645;
}

.ban-dialog__form-card,
.ban-dialog__upload-card {
  padding: 18px 18px 4px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(225, 230, 239, 0.88);
  box-shadow: 0 10px 28px rgba(83, 97, 123, 0.08);
}

.ban-dialog__upload-card {
  margin-top: 14px;
  padding-bottom: 16px;
}

.ban-dialog__radios {
  height: auto;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  width: 100%;
}

.ban-dialog__radio {
  margin-right: 0;
}

.ban-dialog__radios ::v-deep .el-radio__label {
  font-size: 14px;
  color: #4b5565;
}

.ban-dialog__radios ::v-deep .el-radio__input.is-checked+.el-radio__label {
  color: #5b46d6;
  font-weight: 600;
}

.ban-dialog__radios ::v-deep .el-radio__inner {
  width: 16px;
  height: 16px;
  border-color: #c9d2e3;
}

.ban-dialog__radios ::v-deep .el-radio__input.is-checked .el-radio__inner {
  border-color: #8f03ff;
  background: #8f03ff;
}

.ban-dialog__radios ::v-deep .el-radio__inner::after {
  width: 6px;
  height: 6px;
}

.ban-dialog__days {
  display: flex;
  align-items: stretch;
  max-width: 240px;
  height: 42px;
  overflow: hidden;
  border: 1px solid #e2e8f2;
  border-radius: 14px;
  background: #fbfcff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ban-dialog__days.is-focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.ban-dialog__days-input {
  flex: 1;
  min-width: 0;
}

.ban-dialog__days-input ::v-deep .el-input__inner {
  height: 40px;
  line-height: 40px;
  border: none !important;
  border-radius: 0 !important;
  background: transparent;
  box-shadow: none !important;
}

.ban-dialog__days-input ::v-deep .el-input__inner:focus {
  border: none !important;
  box-shadow: none !important;
}

.ban-dialog__days-unit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 0 14px;
  border-left: 1px solid #e2e8f2;
  background: #f5f7fb;
  color: #5d6678;
  font-size: 14px;
  font-weight: 600;
}

.ban-dialog__form ::v-deep .el-input__inner,
.ban-dialog__form ::v-deep .el-textarea__inner {
  border-radius: 14px;
  border-color: #e2e8f2;
  background: #fbfcff;
}

.ban-dialog__form ::v-deep .el-input__inner {
  height: 42px;
  line-height: 42px;
}

.ban-dialog__form ::v-deep .el-input__inner:focus,
.ban-dialog__form ::v-deep .el-textarea__inner:focus {
  border-color: #8f03ff;
  box-shadow: 0 0 0 3px rgba(143, 3, 255, 0.08);
}

.ban-dialog__upload-card-header {
  margin-bottom: 14px;
}

.ban-dialog__upload-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2533;
}

.ban-dialog__upload-card-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a94a6;
}

.ban-dialog__upload-card-form-item {
  margin-bottom: 0 !important;
}

.ban-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.ban-dialog__btn {
  min-width: 92px;
  height: 38px;
  border-radius: 999px;
}

.ban-dialog__btn--ghost {
  border-color: #dbe1ec;
  background: #fff;
  color: #566174;
}

.ban-dialog__btn--ghost:hover,
.ban-dialog__btn--ghost:focus {
  color: #566174;
  border-color: #c8d1e0;
  background: #f8faff;
}

.ban-dialog__btn--primary {
  border: none;
  background: linear-gradient(135deg, #8f03ff 0%, #5c67ff 100%);
  box-shadow: 0 10px 22px rgba(108, 95, 255, 0.22);
}

.ban-dialog__btn--primary:hover,
.ban-dialog__btn--primary:focus {
  background: linear-gradient(135deg, #7b00df 0%, #4f58eb 100%);
}

.ban-upload__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ban-upload__item,
.ban-upload__trigger {
  width: 92px;
  height: 92px;
  border-radius: 18px;
}

.ban-upload__item {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6eaf2;
  background: #fff;
  box-shadow: 0 8px 20px rgba(90, 105, 132, 0.08);
}

.ban-upload__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.ban-upload__audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6d7890;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  font-size: 12px;
}

.ban-upload__audio i {
  font-size: 22px;
}

.ban-upload__media-icon {
  position: absolute;
  left: 8px;
  bottom: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  pointer-events: none;
}

.ban-upload__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(31, 37, 51, 0.72);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.ban-upload__uploader {
  display: inline-flex;
}

.ban-upload__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  border: 1px dashed #cad3e4;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
  color: #6d7890;
  transition: all 0.2s ease;
}

.ban-upload__trigger:hover {
  border-color: #8f03ff;
  color: #6a4ce0;
  box-shadow: 0 10px 22px rgba(143, 3, 255, 0.08);
}

.ban-upload__loading {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.ban-media-player {
  width: 100%;
  max-height: 70vh;
  outline: none;
}

.ban-media-player--audio {
  margin-top: 12px;
}

/* 禁用操作人 */
.ban-operator-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.6;
}

.ban-operator-name {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ban-operator-deleted {
  font-size: 11px;
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  padding: 0 6px;
  border-radius: 4px;
  line-height: 18px;
}

.ban-operator-id {
  color: #7b8496;
  font-size: 12px;
}
</style>

<style>
.user-ban-dialog {
  border-radius: 24px;
  overflow: hidden;
  margin-top: 8vh !important;
}

.user-ban-dialog .el-dialog__header {
  display: none;
}

.user-ban-dialog .el-dialog__body {
  padding: 0 !important;
}

.user-ban-dialog .el-dialog__footer {
  padding: 0 !important;
}

.user-ban-dialog .el-form-item__error {
  padding-top: 4px;
}
</style>
