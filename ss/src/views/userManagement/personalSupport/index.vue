<template>
  <div class="container">
    <!-- 筛选查询区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？" @search="handleSearch" @reset="handleReset"></SearchForm>
    </div>
    <!-- 操作按钮区域 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar">
        <!-- 语音控制按钮组 -->
        <div class="voice-control-group" v-if="playingVoice">
          <el-button size="small" @click="pauseAllVoices" icon="el-icon-pause" type="danger" plain>
            关闭语音
          </el-button>
          <span class="voice-playing-info">
            正在播放: {{ playingVoice.nickName }} 的语音条
          </span>
        </div>
      </div>
      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false" height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" @sort-change="handleSortChange"
          :row-class-name="tableRowClassName" ref="table" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="userId" label="陪玩ID" sortable="custom"></el-table-column>
          <el-table-column prop="nickName" label="陪玩名称"></el-table-column>
          <el-table-column label="头像" width="80">
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
          <el-table-column prop="relName" label="真实姓名" width="90"></el-table-column>
          <!-- 联系方式列 -->
          <el-table-column label="联系方式" width="120">
            <template slot-scope="scope">
              <PhoneDisplay :value="scope.row.phone" />
            </template>
          </el-table-column>

          <el-table-column prop="isSkillTop" label="主技能置顶" width="100" v-if="checkPermission('system:personalSupport:top')">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.isSkillTop" active-color="#8F03FF" :active-value="1" :inactive-value="0"
                @change="skillTopChange(scope.row)" validate-event>
              </el-switch>
            </template>
          </el-table-column>

          <el-table-column prop="topSortValue" label="排序值" width="100" v-if="checkPermission('system:personalSupport:sort')">
            <template slot-scope="{ row }">
              <div class="sort-value-cell">
                <span>{{ row.topSortValue }}</span>
                <el-tooltip content="编辑排序值" placement="top">
                  <el-button type="text" icon="el-icon-edit" class="sort-edit-icon"
                    @click="openTopSortDialog(row)"></el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="businessStatus" label="营业状态" v-if="checkPermission('system:personalSupport:status')">
            <template slot-scope="scope">
              <el-switch v-model="scope.row.businessStatus" active-color="#8F03FF" active-value="1" inactive-value="0"
                @change="businessStatusChange(scope.row)" validate-event>
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column label="陪玩技能" v-if="checkPermission('system:personalSupport:skill')">
            <template slot-scope="scope">
              <el-button type="text" size="small" @click="viewSkills(scope.row)" style="color: #9047F8;">
                查看
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="fansCount" label="粉丝数" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{ scope.row.fansCount | formatNumber }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="followCount" label="关注数" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{ scope.row.followCount | formatNumber }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="接单量" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{ scope.row.orderCount | formatNumber }}</span>
            </template>
          </el-table-column>
          <!-- 语音条列 -->
          <el-table-column label="语音条">
            <template slot-scope="scope">
              <voice-item v-if="scope.row.voice && scope.row.voice.url" :voice="scope.row.voice"
                :voice-id="scope.row.userId" :is-playing="playingVoiceId === scope.row.userId" :show-progress="true"
                @before-play="handleBeforeVoicePlay" @play="handleVoicePlay" @pause="handleVoicePause"
                @stop="handleVoiceStop" @ended="handleVoiceEnded" @error="handleVoiceError"
                @progress="handleVoiceProgress" @status-change="handleVoiceStatusChange"></voice-item>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column v-if="checkPermission('system:personalSupport:evaluate')">
            <template slot="header">
              <div class="comm-header">
                <span>评价</span>
                <span class="comm-header-tips">(每日十点刷新)</span>
              </div>
            </template>
            <template slot-scope="scope">
              <div class="evaluate-cell">
                {{ scope.row.evaluate }}
                <el-button type="text" size="small" @click="viewEvaluateDetails(scope.row)"
                  style="color: #9047F8; margin-left: 8px;">
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="depositAmount" label="保证金余额(元)" width="120">
            <template slot-scope="{ row }">
              {{ row.depositAmount === null || row.depositAmount === undefined || row.depositAmount === '' ? '-' : row.depositAmount }}
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="150"></el-table-column>
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
          <el-table-column prop="unbanTime" label="解禁时间" width="160">
            <template slot-scope="{ row }">
              {{ row.unbanTime || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="banReason" label="禁用原因" width="160" show-overflow-tooltip>
            <template slot-scope="{ row }">
              {{ row.banReason || '-' }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="240" fixed="right">
            <template slot-scope="scope">
              <el-button type="text" size="small" @click="openTechnicalWaiterDialog(scope.row)"
                v-permission="'system:personalSupport:techManage'">游戏管理
              </el-button>
              <el-button type="text" size="small" style="color: #E6A23C;" @click="openDepositDeduct(scope.row)">
                保证金扣减
              </el-button>
              <el-button type="text" size="small" style="color: #409EFF;" @click="openDepositDeductLog(scope.row)">
                扣减日志
              </el-button>
              <el-button type="text" size="small" :class="scope.row.status == '0' ? 'text-danger' : 'text-success'"
                @click="toggleStatus(scope.row)" v-permission="'system:personalSupport:disable'">
                {{ scope.row.status == '0' ? '禁用' : '启用' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange"></PaginationSimple>
      </div>
    </el-card>

    <!-- 图片放大组件：v-model控制显示，单图传[url] -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />

    <BanUserDialog ref="banUserDialog" :visible.sync="banDialogVisible" @success="fetchTableData" />

    <skills-dialog :visible.sync="skillsDialogVisible" :loading="skillsLoading" :user-name="userName"
      :main-skill="mainSkill" :secondary-skill="secondarySkill" @close="skillsDialogVisible = false" />

    <evaluate-dialog :visible.sync="evaluateDialogVisible" :user-name="commentList.userName"
      :total="commentpagination.total" :evaluate-score="commentEvaluate" :comment-list="commentList"
      :current-page="commentpagination.pageNum" :page-size="commentpagination.pageSize"
      @close="evaluateDialogVisible = false" @page-change="handleCommentPageChange" :loading="commentLoading" />

    <el-dialog title="编辑排序值" :visible.sync="topSortDialogVisible" width="420px" :close-on-click-modal="false"
      @close="resetTopSortDialog">
      <el-form ref="topSortForm" :model="topSortForm" :rules="topSortRules" label-width="90px">
        <el-form-item label="排序值" prop="topSortValue">
          <el-input-number v-model="topSortForm.topSortValue" :min="0" :step="1" :precision="0"
            controls-position="right" placeholder="请输入排序值" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="topSortDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="topSortSubmitting" @click="submitTopSortValue">确定</el-button>
      </span>
    </el-dialog>

    <el-drawer title="游戏管理" :visible.sync="techDrawerVisible" direction="rtl" size="560px" class="tech-manage-drawer"
      :wrapperClosable="false" @close="resetTechDrawer">
      <div class="tech-manage-panel" v-loading="techLoading">
        <div class="tech-drawer-content">
          <div class="tech-section">
            <div class="tech-section__header">
              <div>
                <div class="tech-section__title">游戏配置</div>
                <div class="tech-section__meta">{{ techCurrentUser.userName || '当前陪玩' }} · 共 {{ techSelectedCount }} 项</div>
              </div>
            </div>
            <div v-if="techRows.length" class="tech-config-list">
              <div v-for="(item, index) in techRows" :key="item.rowKey" class="tech-config-card">
                <div class="tech-config-card__header">
                  <div class="tech-config-card__title-wrap">
                    <div class="tech-config-card__index">{{ index + 1 }}</div>
                    <div>
                      <div class="tech-config-card__title">{{ item.productName || '未命名游戏' }}</div>
                    </div>
                  </div>
                </div>

                <div class="tech-config-card__body">
                  <div class="tech-config-card__grid">
                    <div class="tech-option-block">
                      <div class="tech-row-label">陪玩属性</div>
                      <div class="tech-chip-group">
                        <button v-for="option in techIdentityOptions" :key="option.value" type="button" class="tech-chip"
                          :class="{ 'is-active': Number(item.isTechnicalWaiter) === Number(option.value) }"
                          @click="handleTechIdentityChange(item, option.value)">
                          {{ option.label }}
                        </button>
                      </div>
                    </div>

                    <div v-if="Number(item.isTechnicalWaiter) === 1" class="tech-option-block">
                      <div class="tech-row-label">类型</div>
                      <div class="tech-level-grid">
                        <button v-for="option in techAssessmentOptions" :key="option.value" type="button"
                          class="tech-level-card" :class="{ 'is-active': item.assessmentLevel === option.value }"
                          @click="item.assessmentLevel = option.value">
                          <span class="tech-level-card__title">{{ option.label }}</span>
                          <span class="tech-level-card__value">{{ option.value }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="tech-empty-block">
              <div class="tech-empty-block__title">暂无可管理游戏</div>
              <div class="tech-empty-block__desc">当前用户还没有可配置的技能游戏，请先确认技能数据是否已创建。</div>
            </div>
          </div>
        </div>

        <div class="tech-manage-footer">
          <div class="tech-manage-footer__summary">已完成 {{ techSelectedCount }} / {{ techSkillOptions.length }} 项配置</div>
          <div class="tech-manage-footer__actions">
            <el-button @click="techDrawerVisible = false">取消</el-button>
            <el-button type="primary" :loading="techSubmitting" @click="submitTech">保存配置</el-button>
          </div>
        </div>
      </div>
    </el-drawer>

    <DepositDeductDialog
      :visible.sync="depositDeductVisible"
      :type="0"
      :target-id="depositDeductTarget.id"
      :deposit-amount="depositDeductTarget.depositAmount"
      @success="fetchTableData"
    />
    <DepositDeductLogDrawer
      :visible.sync="depositDeductLogVisible"
      :type="0"
      :target-id="depositDeductLogTarget.id"
      :target-name="depositDeductLogTarget.name"
    />
  </div>
</template>

<script>
// 导入组件
import VoiceItem from "../components/VoicePlayer.vue";           // 语音播放组件
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import SkillsDialog from "../components/SkillsDialog.vue";
import EvaluateDialog from "../components/EvaluateDialog.vue";     // 评价详情弹窗
import BanUserDialog from "@/components/BanUserDialog/index.vue";
import DepositDeductDialog from "@/components/DepositDeductDialog/index.vue";
import DepositDeductLogDrawer from "@/components/DepositDeductLogDrawer/index.vue";
import checkPermission from "@/utils/checkPermission";

// 导入API接口
import {
  unionSkill, unionBusinessStatus, unionComment,   // 获取陪玩技能
} from "@/api/unionSupport";

import {
  getPersonalUserList, updateUserStatus, manageUserSkillTop, updateTopSortValue,
  getTechnicalCompanionManageInfo, batchSaveTechnicalCompanion  // 陪玩列表
} from '@/api/personalSupport'

export default {
  name: "UnionCompanionList", // 组件名称
  computed: {
    techSelectedCount() {
      return this.techRows.length;
    }
  },
  // 注册组件
  components: {
    VoiceItem,
    PhoneDisplay,
    SearchForm,
    PaginationSimple,
    SkillsDialog,
    EvaluateDialog,
    BanUserDialog,
    DepositDeductDialog,
    DepositDeductLogDrawer
  },
  // 过滤器
  filters: {
    // 数字格式化过滤器：万为单位，千分位分隔
    formatNumber(num) {
      if (!num) return "0";
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + "万";
      }
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
  },
  // 数据定义
  data() {
    return {
      userName: "", // 用户名
      mainSkill: [],                     // 主要技能列表
      secondarySkill: [],                 // 次要技能列表
      skillsLoading: false,              // 技能加载状态
      unionScoreForm: {},                // 评价表单数据
      evaluateDialogVisible: false,// 评价弹窗是否展示
      banDialogVisible: false,
      depositDeductVisible: false,
      depositDeductTarget: { id: "", depositAmount: "" },
      depositDeductLogVisible: false,
      depositDeductLogTarget: { id: "", name: "" },
      commentEvaluate: 0,                // 评价分数
      commentList: [],                   // 评价列表数据
      commentLoading: false,            // 评价列表加载状态
      commentpagination: {               // 评价分页参数
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "nickName",
          label: "陪陪名称",
          placeholder: "请输入昵称或真实姓名",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          label: "陪陪ID",
          placeholder: "请输入陪陪ID",
          clearable: true,
          inputType: "number",
        },
        {
          type: "input",
          prop: "phone",
          label: "陪陪手机号",
          placeholder: "请输入陪陪手机号",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "账号状态",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "正常", value: '0' },
            { label: "停用", value: '1' },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "businessStatus",
          label: "营业状态",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "停业", value: '0' },
            { label: "正常", value: '1' },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "evaluate",
          label: "评价",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "不满意", value: "不满意" },
            { label: "一般", value: "一般" },
            { label: "满意", value: "满意" },
            { label: "满分好评", value: "满分好评" },
          ],
          clearable: true,
        },
        {
          type: "select", prop: "isSkillTop", label: "主技能置顶", placeholder: "请选择状态",
          options: [{ label: "全部", value: "" }, { label: "是", value: "1" }, { label: "否", value: "0" }],
          clearable: true,
        },
        {
          type: "select", prop: "isTechnicalWaiter", label: "开启技术培", placeholder: "请选择状态",
          options: [{ label: "全部", value: "" }, { label: "是", value: "1" }, { label: "否", value: "0" }],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTime",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            onPick: ({ maxDate, minDate }) => {
              if (minDate && !maxDate) {
                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = (time) => {
                  const selectedDate = minDate;
                  const current = new Date(time);
                  const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                  // 如果日期差大于31天，则禁用
                  return dayDiff > 30;
                };
              } else {
                // 当选择了两个日期后，重置禁用规则
                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = null;
              }
            },
            disabledDate: null,
            // 快捷选择配置
            shortcuts: [
              {
                text: "最近一周",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
              {
                text: "最近一个月",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
            ],
          },
        },
      ],
      // 筛选表单数据
      filterForm: {
        nickName: "",
        userId: "",
        phone: "",
        status: "",
        businessStatus: "",
        isSkillTop: "",
        isTechnicalWaiter: "",
        evaluate: "",
        startTime: "",
        endTime: "",
        createTime: [],
      },
      tableData: [],              // 表格数据源
      loading: false,             // 加载状态
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      sortParams: { prop: "", order: "" }, // 排序参数
      avatarDialogVisible: false, // 头像预览弹窗显示状态
      previewAvatarUrl: "",       // 预览头像URL
      skillsDialogVisible: false, // 技能弹窗显示状态
      playingVoiceId: null,       // 当前播放的语音ID
      playingVoice: null,         // 当前播放的语音数据
      moduleHeight: 0, // 搜索模块高度
      topSortDialogVisible: false,
      topSortSubmitting: false,
      topSortForm: {
        userId: "",
        topSortValue: undefined,
      },
      topSortRules: {
        topSortValue: [{ required: true, message: "请输入排序值", trigger: "change" }],
      },
      techDrawerVisible: false,
      techLoading: false,
      techSubmitting: false,
      techCurrentUser: {},
      techSkillOptions: [],
      techRows: [],
      techIdentityOptions: [
        { label: "娱乐陪", value: 0 },
        { label: "技术陪", value: 1 }
      ],
      techAssessmentOptions: [
        { label: "大众群演", value: "mass" },
        { label: "三线明星", value: "third" },
        { label: "一线明星", value: "first" },
        { label: "顶流明星", value: "top" }
      ],
      techRowSeed: 0,
    };
  },
  created() {
    this.initTableData();     // 初始化表格数据
  },
  // 挂载生命周期：添加事件监听
  mounted() {
    /**获取搜索框高度 ***/
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateModuleHeight);
    // 监听页面可见性变化，暂停语音播放
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

  },
  // 销毁前生命周期：清理资源
  beforeDestroy() {
    window.removeEventListener('resize', this.updateModuleHeight);
    this.stopAllVoices(); // 停止所有语音播放
    // 移除事件监听
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
  },
  // 监听属性变化
  watch: {
    // 监听播放语音ID变化，停止之前的语音
    playingVoiceId(newVal, oldVal) {
      if (oldVal && newVal !== oldVal) this.stopVoice(oldVal);
    },
  },
  // 方法定义
  methods: {
    openDepositDeduct(row) {
      this.depositDeductTarget = {
        id: row.userId,
        depositAmount: row.depositAmount
      };
      this.depositDeductVisible = true;
    },
    openDepositDeductLog(row) {
      this.depositDeductLogTarget = {
        id: row.userId,
        name: row.nickName || ""
      };
      this.depositDeductLogVisible = true;
    },
    normalizeCreateTimeFilter(filter = {}) {
      const nextFilter = { ...filter };
      const createTime = Array.isArray(nextFilter.createTime)
        ? nextFilter.createTime.filter((item) => item)
        : [];

      if (createTime.length === 2) {
        nextFilter.createTime = createTime;
        nextFilter.startTime = createTime[0];
        nextFilter.endTime = createTime[1];
      } else {
        nextFilter.createTime = [];
        nextFilter.startTime = "";
        nextFilter.endTime = "";
      }

      return nextFilter;
    },
    checkPermission,
    // 打开游戏管理抽屉，并按用户ID加载当前配置
    async openTechnicalWaiterDialog(row) {
      this.techDrawerVisible = true;
      this.techLoading = true;
      this.techCurrentUser = {
        userId: this.normalizeTechValue(row.userId),
        userName: row.userName || row.nickName || ""
      };
      this.techSkillOptions = [];
      this.techRows = [];
      try {
        const res = await getTechnicalCompanionManageInfo({
          userId: this.normalizeTechValue(row.userId)
        });
        const manageList = this.normalizeTechSkills(res);
        this.techSkillOptions = manageList;
        this.techRows = this.buildTechRows(manageList);
      } catch (error) {
        console.error("查询技术陪管理数据失败:", error);
      } finally {
        this.techLoading = false;
      }
    },
    // 兼容接口可能返回数组、data数组或rows分页结构的情况
    normalizeTechSkills(res) {
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.rows)) return res.rows;
      if (Array.isArray(res?.data?.rows)) return res.data.rows;
      return [];
    },
    buildTechRows(skillOptions = []) {
      const mergedList = skillOptions.map((item) => {
        return this.createTechRowFromSkill(item);
      });
      const uniqueMap = new Map();
      mergedList.forEach((item) => {
        if (!item.priceId || !uniqueMap.has(item.priceId)) {
          uniqueMap.set(item.priceId || item.rowKey, item);
        }
      });
      return Array.from(uniqueMap.values());
    },

    createTechRowFromSkill(item = {}) {
      const priceId = this.normalizeTechValue(item.priceId);
      return {
        rowKey: `tech-row-${Date.now()}-${this.techRowSeed++}`,
        priceId,
        productId: this.normalizeTechValue(item.productId),
        productName: item.productName || item.skillName || item.goodsName || "",
        isTechnicalWaiter: this.normalizeTechNumber(item.isTechnicalWaiter, 0),
        assessmentLevel: this.normalizeTechAssessmentLevel(item.assessmentLevel)
      };
    },

    handleTechIdentityChange(row, value) {
      row.isTechnicalWaiter = Number(value);
      if (Number(value) !== 1) {
        row.assessmentLevel = "";
      }
    },
    normalizeTechValue(value) {
      if (value === null || value === undefined || value === "") return "";
      return String(value);
    },
    normalizeTechNumber(value, fallback = 0) {
      if (value === null || value === undefined || value === "") return fallback;
      return Number(value);
    },
    normalizeTechAssessmentLevel(value) {
      const normalizedValue = this.normalizeTechValue(value);
      return ["mass", "third", "first", "top"].includes(normalizedValue) ? normalizedValue : "";
    },
    // 重置技术陪管理抽屉，避免下一次打开残留上一次选择
    resetTechDrawer() {
      this.techLoading = false;
      this.techSubmitting = false;
      this.techCurrentUser = {};
      this.techSkillOptions = [];
      this.techRows = [];
    },
    validateTechRows() {
      const validRows = this.techRows.filter(item => item.priceId);
      if (!validRows.length) {
        this.$message.warning("暂无可配置游戏");
        return null;
      }
      const hasInvalidRow = validRows.some(item => {
        if (item.isTechnicalWaiter === "") return true;
        if (Number(item.isTechnicalWaiter) === 1) {
          return !item.assessmentLevel;
        }
        return false;
      });
      if (hasInvalidRow) {
        this.$message.warning("请完善每条游戏的陪玩属性，技术陪还需选择类型");
        return null;
      }
      return validRows.map(item => ({
        priceId: this.normalizeTechValue(item.priceId),
        assessmentLevel: Number(item.isTechnicalWaiter) === 1 ? item.assessmentLevel : "",
        isTechnicalWaiter: Number(item.isTechnicalWaiter)
      }));
    },
    // 提交技术陪管理
    async submitTech() {
      try {
        const skills = this.validateTechRows();
        if (!skills) return;
        this.techSubmitting = true;
        await batchSaveTechnicalCompanion({
          userId: this.normalizeTechValue(this.techCurrentUser.userId),
          skills
        });
        this.$message.success("游戏管理保存成功");
        this.techDrawerVisible = false;
        this.fetchTableData();
      } catch (error) {
        console.error("技术陪管理提交失败:", error);
      } finally {
        this.techSubmitting = false;
      }
    },
    // 打开排序值编辑弹窗
    openTopSortDialog(row) {
      const sortValue = row.topSortValue;
      this.topSortForm = {
        userId: row.userId,
        topSortValue: sortValue === null || sortValue === undefined || sortValue === "" ? undefined : Number(sortValue),
      };
      this.topSortDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.topSortForm) this.$refs.topSortForm.clearValidate();
      });
    },
    // 重置排序值弹窗
    resetTopSortDialog() {
      this.topSortSubmitting = false;
      this.topSortForm = {
        userId: "",
        topSortValue: undefined,
      };
      if (this.$refs.topSortForm) this.$refs.topSortForm.clearValidate();
    },
    // 提交排序值
    submitTopSortValue() {
      this.$refs.topSortForm.validate(async (valid) => {
        if (!valid) return;
        try {
          this.topSortSubmitting = true;
          await updateTopSortValue({
            userId: this.topSortForm.userId,
            topSortValue: this.topSortForm.topSortValue,
          });
          this.$message.success("排序值更新成功");
          this.topSortDialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          console.error("排序值更新失败:", error);
        } finally {
          this.topSortSubmitting = false;
        }
      });
    },
    // 主技能置顶切换
    async skillTopChange(row) {
      const oldVal = row.isSkillTop === 1 ? 0 : 1;
      const action = row.isSkillTop === 1 ? "置顶" : "取消置顶";
      this.$confirm(`确定要${action}${row.nickName}主技能吗？`, "主技能置顶", {
        type: "warning",
      })
        .then(() => {
          const params = {
            userId: row.userId,
            isSkillTop: row.isSkillTop,
          };
          manageUserSkillTop(params).then(() => {
            this.$message.success(`${action}成功`);
            this.fetchTableData();
          }).catch(() => {
            row.isSkillTop = oldVal;
          });
        })
        .catch(() => {
          row.isSkillTop = oldVal;
        });
    },
    // 运营状态切换
    async businessStatusChange(row) {
      const oldVal = row.businessStatus === '1' ? '0' : '1'
      const action = row.businessStatus === '1' ? "开启" : "关闭";
      this.$confirm(`确定要${action}${row.nickName}营业吗？`, "营业状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            userId: row.userId,
            businessStatus: row.businessStatus,
          };
          // 调用状态修改接口
          unionBusinessStatus(params).then(() => {
            this.$message.success(`已${action}${row.nickName}营业`);
            this.fetchTableData(); // 刷新数据
          }).catch(() => {
            row.businessStatus = oldVal
          });
        }).catch(() => {
          row.businessStatus = oldVal
        });
    },
    // 处理图片加载失败（损坏/404/跨域等）
    handleImgError(e) {
      // 替换为默认头像的绝对/相对路径，和你v-else里的路径保持一致
      e.target.src = require('@/assets/defaulIcon.png')
      // 【可选】防止个别情况图片死循环加载（比如默认图也丢了）
      e.target.onerror = null
    },
    defaulImg() {
      this.$message.warning('头像文件不存在！')
    },
    /**获取搜索框高度计算 ***/
    updateModuleHeight() {
      this.$nextTick(() => {
        if (this.$refs.responsiveModule) {
          this.moduleHeight = this.$refs.responsiveModule.offsetHeight;
        }
      });
    },
    /**
     * 表格行样式类名
     * @param {Object} param0 行数据
     * @returns {String} 样式类名
     */
    tableRowClassName({ row }) {
      return row.userId === this.playingVoiceId ? "playing-row" : "";
    },
    /**
     * 初始化表格数据
     */
    initTableData() {
      this.loading = true;
      this.fetchTableData();
    },
    // ===================== 语音相关方法 =====================
    /**
     * 语音播放前处理
     * @param {String} voiceId 语音ID
     */
    handleBeforeVoicePlay(voiceId) {
      if (this.playingVoiceId && this.playingVoiceId !== voiceId)
        this.pauseVoice(this.playingVoiceId);
      if (this.playingVoiceId === voiceId) {
        this.pauseCurrentVoice();
        return;
      }
      this.playingVoiceId = voiceId;
      this.playingVoice = this.tableData.find(
        (item) => item.userId === voiceId,
      );
    },
    /**
     * 暂停当前播放的语音
     */
    pauseCurrentVoice() {
      if (this.playingVoiceId) {
        const row = this.tableData.find(
          (item) => item.userId === this.playingVoiceId,
        );
        if (row && row.voice?.status === "playing") {
          row.voice.status = "paused";
          this.playingVoiceId = null;
          this.playingVoice = null;
        }
      }
    },
    /**
     * 暂停指定语音
     * @param {String} voiceId 语音ID
     */
    pauseVoice(voiceId) {
      const row = this.tableData.find((item) => item.userId === voiceId);
      if (row && row.voice?.status === "playing") {
        row.voice.status = "paused";
        this.$nextTick(() => this.$forceUpdate());
      }
    },
    /**
     * 处理语音播放事件
     * @param {Object} voiceData 语音数据
     */
    handleVoicePlay(voiceData) {
      const row = this.tableData.find(
        (item) => item.userId === voiceData.voiceId,
      );
      if (row) row.voice.status = "playing";
      this.playingVoiceId = voiceData.voiceId;
      this.playingVoice = this.tableData.find(
        (item) => item.userId === voiceData.voiceId,
      );
      // this.$message.success(
      //   `开始播放 ${this.playingVoice?.userName || ""} 的语音`,
      // );
    },
    /**
     * 处理语音暂停事件
     * @param {Object} voiceData 语音数据
     */
    handleVoicePause(voiceData) {
      const row = this.tableData.find(
        (item) => item.userId === voiceData.voiceId,
      );
      if (row) {
        row.voice.status = "paused";
        row.voice.currentTime = voiceData.currentTime;
      }
      if (this.playingVoiceId === voiceData.voiceId) {
        this.playingVoiceId = null;
        this.playingVoice = null;
      }
    },
    /**
     * 处理语音停止事件
     * @param {String} voiceId 语音ID
     */
    handleVoiceStop(voiceId) {
      const row = this.tableData.find((item) => item.userId === voiceId);
      if (row) row.voice.status = "idle";
      if (this.playingVoiceId === voiceId) {
        this.playingVoiceId = null;
        this.playingVoice = null;
      }
    },
    /**
     * 处理语音播放结束事件
     * @param {String} voiceId 语音ID
     */
    handleVoiceEnded(voiceId) {
      const row = this.tableData.find((item) => item.userId === voiceId);
      if (row) row.voice.status = "idle";
      this.playingVoiceId = null;
      this.playingVoice = null;
    },
    /**
     * 处理语音播放错误事件
     * @param {Object} errorData 错误数据
     */
    handleVoiceError(errorData) {
      console.error("语音播放错误:", errorData);
      // this.$message.error(
      //   `语音播放失败: ${errorData.error?.message || "未知错误"}`,
      // );
      const row = this.tableData.find(
        (item) => item.userId === errorData.voiceId,
      );
      if (row) row.voice.status = "error";
      this.playingVoiceId = null;
      this.playingVoice = null;
    },
    /**
     * 处理语音进度更新事件
     */
    handleVoiceProgress(progressData) {
      const row = this.getVoiceRow(progressData?.voiceId);
      if (!row || !row.voice || !progressData) return;
      row.voice.currentTime = progressData.currentTime || 0;
      row.voice.duration = progressData.duration || row.voice.duration || 0;
      row.voice.progress = progressData.progress || 0;
    },
    /**
     * 获取指定语音所在行
     * @param {String|Number} voiceId 语音ID
     * @returns {Object|null}
     */
    getVoiceRow(voiceId) {
      return this.tableData.find((item) => item.userId === voiceId) || null;
    },
    /**
     * 处理语音状态变更事件
     */
    handleVoiceStatusChange(statusData) {
      const row = this.getVoiceRow(statusData?.voiceId);
      if (!row || !row.voice || !statusData) return;
      row.voice.status = statusData.status;
      if (statusData.progress !== undefined) {
        row.voice.progress = statusData.progress;
      }
      if (statusData.currentTime !== undefined) {
        row.voice.currentTime = statusData.currentTime;
      }
      if (statusData.duration !== undefined) {
        row.voice.duration = statusData.duration;
      }
    },
    /**
     * 停止指定语音
     * @param {String} voiceId 语音ID
     */
    stopVoice(voiceId) {
      const row = this.getVoiceRow(voiceId);
      if (row && row.voice) row.voice.status = "idle";
    },
    /**
     * 停止所有语音播放
     */
    stopAllVoices() {
      if (this.playingVoiceId) {
        const currentRow = this.tableData.find(
          (item) => item.userId === this.playingVoiceId,
        );
        if (currentRow) currentRow.voice.status = "idle";
      }
      this.tableData.forEach((item) => {
        if (
          item.voice &&
          (item.voice.status === "playing" || item.voice.status === "paused")
        ) {
          item.voice.status = "idle";
        }
      });
      this.playingVoiceId = null;
      this.playingVoice = null;
      // this.$message.info("已停止所有语音播放");
    },
    /**
     * 暂停所有语音播放
     */
    pauseAllVoices() {
      if (this.playingVoiceId) {
        const currentRow = this.tableData.find(
          (item) => item.userId === this.playingVoiceId,
        );
        if (currentRow && currentRow.voice?.status === "playing")
          currentRow.voice.status = "paused";
      }
      this.tableData.forEach((item) => {
        if (item.voice && item.voice.status === "playing")
          item.voice.status = "paused";
      });
      this.playingVoiceId = null;
      this.playingVoice = null;
      // this.$message.info("已暂停所有语音播放");
    },
    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
      if (document.hidden && this.playingVoiceId) {
        const row = this.getVoiceRow(this.playingVoiceId);
        if (row && row.voice?.status === "playing") {
          row.voice.status = "paused";
        }
        this.playingVoiceId = null;
        this.playingVoice = null;
      }
    },
    /**
     * 规范化语音对象，避免模板里临时创建对象导致父子状态不同步
     * @param {Object} item 列表行数据
     * @returns {Object}
     */
    createVoiceData(item) {
      const voiceUrl = typeof item.skillVoice === "string" ? item.skillVoice.trim() : "";
      return {
        url: voiceUrl,
        duration: Number(item.skillVoiceLength) || 0,
        status: "idle",
        currentTime: 0,
        progress: 0,
      };
    },
    // ===================== 业务逻辑方法 =====================
    /**
     * 处理搜索事件
     * @param {Object} e 搜索表单数据
     */
    handleSearch(e) {
      const nextFilter = e ? { ...this.filterForm, ...e } : { ...this.filterForm };
      this.filterForm = this.normalizeCreateTimeFilter(nextFilter);
      this.pagination.pageNum = 1; // 重置页码
      this.fetchTableData();       // 重新获取数据
    },
    /**
     * 处理重置事件
     */
    handleReset() {
      this.filterForm = {
        nickName: "",
        userId: "",
        phone: "",
        status: "",
        businessStatus: "",
        isSkillTop: "",
        isTechnicalWaiter: "",
        evaluate: "",
        startTime: "",
        endTime: "",
        createTime: [],

      };
      this.pagination.pageNum = 1; // 重置页码
      this.sortParams = { prop: "", order: "" }; // 重置排序
      this.fetchTableData(); // 重新获取数据
    },

    /**
     * 切换陪玩账号状态（启用/禁用）
     * @param {Object} row 行数据
     */
    toggleStatus(row) {
      if (String(row.status) === '0') {
        this.$refs.banUserDialog && this.$refs.banUserDialog.open(row);
        return;
      }
      this.$confirm(`确定要启用${row.nickName || ''}账号吗？`, '提示', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(async () => {
          try {
            const res = await updateUserStatus({
              userId: Number(row.userId),
              status: '0'
            });
            if (res && res.success === false) {
              this.$message.error((res && res.errorMessage) || '启用失败');
              return;
            }
            this.$message.success('启用成功');
            this.fetchTableData();
          } catch (error) {
            console.error('启用用户失败:', error);
            this.$message.error('启用失败');
          }
        })
        .catch(() => { });
    },
    /**
     * 获取陪玩评价数据
     */
    onUnionScore() {
      try {
        this.commentLoading = true;
        const params = {
          userId: this.unionScoreForm.userId,
          pageNum: this.commentpagination.pageNum,
          pageSize: this.commentpagination.pageSize,
        };
        this.commentEvaluate = Number(this.unionScoreForm.evaluate);
        // 调用评价接口
        unionComment(params).then((res) => {
          this.commentList = res.data.rows;
          this.commentpagination.total = res.data.total;
        });
      } catch (error) {
        console.error("获取评价失败:", error);
      } finally {
        this.commentLoading = false;
      }
    },
    /**
     * 查看评价详情
     * @param {Object} row 行数据
     */
    viewEvaluateDetails(row) {
      this.commentpagination.pageNum = 1; // 重置页码
      this.commentList = [];              // 清空评价列表
      this.commentEvaluate = 0;           // 重置评价分数
      this.unionScoreForm = row;          // 保存当前行数据
      this.onUnionScore();                // 获取评价数据
      this.evaluateDialogVisible = true;  // 打开弹窗
    },
    /**
     * 处理评价分页变更
     * @param {Number} page 页码
     */
    handleCommentPageChange(page) {
      this.commentpagination.pageNum = page;
      this.onUnionScore(); // 重新获取评价数据
    },


    /**
     * 获取陪玩技能数据
     * @param {Object} ele 行数据
     */
    async onUnionSkill(ele) {
      this.skillsLoading = true;
      try {
        const params = {
          tradeUserId: ele.userId,
        };
        const res = await unionSkill(params);
        const dataList = (res && res.data && res.data.skills) || [];
        const isMainSkill = (item) =>
          item.mainSkill === true ||
          item.mainSkill === 1 ||
          item.mainSkill === "1" ||
          item.weight === 1 ||
          item.weight === "1";

        this.mainSkill = dataList.filter((item) => isMainSkill(item));
        this.secondarySkill = dataList.filter((item) => !isMainSkill(item));
      } catch (error) {
        console.error("获取技能失败:", error);
        this.mainSkill = [];
        this.secondarySkill = [];
      } finally {
        this.skillsLoading = false;
      }
    },
    /**
     * 查看陪玩技能详情
     * @param {Object}
     },
     /**
     * 查看陪玩技能详情
     * @param {Object} row 行数据
     */
    async viewSkills(row) {
      this.userName = row.userName || row.nickName || "";
      this.mainSkill = [];
      this.secondarySkill = [];
      this.skillsDialogVisible = true; // 打开弹窗
      await this.onUnionSkill(row); // 获取技能数据
    },
    /**
     * 预览头像
     * @param {Object} user 用户数据
     */
    previewAvatar(user) {
      this.previewAvatarUrl = user.avatar;
      const img = new Image()
      img.src = this.previewAvatarUrl
      img.onload = () => {
        this.avatarDialogVisible = true;
      } // 图片有效
      img.onerror = () => {
        this.$message.warning('头像文件损坏或不存在！')
      } // 图片损坏
      // this.avatarDialogVisible = true;
    },
    /**
     * 切换手机号显示/隐藏状态
     * @param {Object} row 行数据
     */
    toggletradeUserPhoneVisible(row) {
      this.$set(row, "showFulltradeUserPhone", !row.showFulltradeUserPhone);
    },
    /**
     * 处理表格排序变更
     * @param {Object} param0 排序参数
     */
    handleSortChange({ prop, order }) {
      this.sortParams = { prop, order };
      this.fetchTableData(); // 重新获取数据
    },
    /**
     * 处理分页页码变更
     * @param {Number} val 页码
     */
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData(); // 重新获取数据
    },

    /**
     * 获取表格数据
     */
    fetchTableData() {
      this.loading = true;
      // 构造请求参数
      const formatData = {
        ...this.normalizeCreateTimeFilter(this.filterForm),
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };

      // 处理时间范围：将 createTime 数组拆分为 startTime 和 endTime
      if (formatData.createTime && formatData.createTime.length === 2) {
        formatData.startTime = formatData.createTime[0];
        formatData.endTime = formatData.createTime[1];
      } else {
        delete formatData.startTime;
        delete formatData.endTime;
      }
      // 删除 createTime 字段
      delete formatData.createTime;

      // 移除空值参数
      Object.keys(formatData).forEach((key) => {
        if (
          formatData[key] === "" ||
          formatData[key] === null ||
          formatData[key] === undefined ||
          (Array.isArray(formatData[key]) && formatData[key].length === 0)
        ) {
          delete formatData[key];
        }
      });

      // 调用列表接口
      getPersonalUserList(formatData)
        .then((res) => {
          if (res.data && res.data.rows) {
            this.tableData = res.data.rows.map((item) => ({
              ...item,
              showFulltradeUserPhone: false,
              voice: this.createVoiceData(item),
            }));
            this.pagination.total = res.data.total || 0;
          } else {
            this.tableData = [];
            this.pagination.total = 0;
          }
          this.loading = false;
        })
        .catch((error) => {
          console.error("获取列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false;
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
  },
};
</script>

<style scoped lang="scss">
// 操作栏样式
.action-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  background: #fff;
  margin-bottom: 8px;
}

// 新增按钮样式
.add-btn {
  background: #6a35ff;
  border: none;
  width: 191px;
}

.add-btn:hover {
  background: #7b38d9;
}

// 语音控制组样式
.voice-control-group {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0px 12px 0px 0px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 6px;
  // border-left: 4px solid #9047f8;
}

// 语音播放信息样式
.voice-playing-info {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}


// 正在播放语音的行样式
::v-deep.el-table .playing-row {
  background-color: rgba(144, 71, 248, 0.05) !important;
}

::v-deep.el-table .playing-row:hover>td {
  background-color: rgba(144, 71, 248, 0.08) !important;
}

::v-deep.el-table .playing-row .voice-item {
  background: rgba(144, 71, 248, 0.1);
  border-color: #9047f8;
}

// 头像单元格样式
.avatar-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0;
  border-radius: 4px;
}

.avatar-cell:hover {
  background-color: #f0f0f0;
}

// 头像缩略图样式
.avatar-thumb {
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.avatar-thumb img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

// 数字单元格样式
.number-cell {
  font-weight: 500;
  color: #333;
}

.sort-value-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.sort-edit-icon {
  padding: 0;
  color: #9047F8;
}

// 评价单元格样式
.evaluate-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

// 禁用操作人表头
.ban-operator-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ban-operator-new {
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 5px;
  border-radius: 4px;
  background: #9047F8;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

// 禁用操作人单元格
.ban-operator-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ban-operator-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #000;
  font-size: 13px;
  font-weight: 500;
}

.ban-operator-id {
  color: #9CA3AF;
  font-size: 12px;
}

// 操作按钮组样式
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 禁用文字样式
.text-danger {
  color: #ff4d4f !important;
}

.text-danger:hover {
  color: #f78989 !important;
}

// 启用文字样式
.text-success {
  color: #1bc286 !important;
}

.text-success:hover {
  color: #85ce61 !important;
}

// 手机号单元格样式
.tradeUserPhone-cell {
  display: flex;
  align-items: center;
}

// 手机号图标样式
.tradeUserPhone-icon {
  margin-left: 8px;
  font-size: 10px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 8px;
}

.tradeUserPhone-icon:hover {
  color: #919191;
}

.tradeUserPhone-icon.active {
  color: #f56c6c;
  transform: scale(1.1);
}

// 表格表头居中
.el-table th.el-table__cell>.cell {
  text-align: center;
}

// 文本按钮颜色
.el-button--text {
  color: rgb(144, 71, 248);
}

// 批量操作区域样式
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

// 选中数量文本样式
.selected-count {
  color: #606266;
  font-size: 14px;
}

// 响应式样式
@media (max-width: 768px) {
  .voice-control-group {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
    justify-content: space-between;
  }

  .pagination-container {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-actions {
    margin-bottom: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }
}

.el-tag.el-tag--success {
  background-color: #f0f9eb00;
  border-color: #e1f3d800;
  color: #1BC286;
}

.el-tag.el-tag--warning {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #FF4D4F;
}

.el-tag--small {
  padding: 0;
}

.comm-header {
  display: flex;
  flex-direction: column;
  justify-content: center;

  .comm-header-tips {
    color: #999999;
    font-size: 12px;
    font-weight: 400;
  }
}

.tech-manage-drawer {
  ::v-deep .el-drawer__header {
    margin-bottom: 0;
    padding: 18px 24px;
    border-bottom: 1px solid #ECE5FB;
    background: linear-gradient(135deg, #F8F4FF 0%, #FDFBFF 100%);
    color: #34265B;
    font-size: 16px;
    font-weight: 600;
  }

  ::v-deep .el-drawer__body {
    padding: 0;
  }
}

.tech-manage-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tech-drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
}

.tech-section {
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #ECE5FB;
  box-shadow: 0 12px 28px rgba(144, 71, 248, 0.06);
}

.tech-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.tech-section__title {
  position: relative;
  padding-left: 12px;
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #34265B;
}

.tech-section__title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  width: 4px;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, #9047F8 0%, #B06BFF 100%);
}

.tech-section__meta {
  font-size: 12px;
  color: #8B79B5;
}

.tech-config-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tech-config-card {
  padding: 16px;
  border: 1px solid #EEE8FB;
  border-radius: 14px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FCFAFF 100%);
}

.tech-config-card__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F0EAFB;
}

.tech-config-card__title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.tech-config-card__index {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #F3E9FF;
  color: #9047F8;
  font-size: 11px;
  font-weight: 700;
}

.tech-config-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #34265B;
  line-height: 1.4;
}

.tech-config-card__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tech-config-card__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.tech-row-label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6F5A9E;
}

.tech-option-block {
  min-width: 0;
}

.tech-empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #909399;
  padding: 24px;
}

.tech-empty-block__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tech-empty-block__desc {
  max-width: 320px;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
  color: #8B79B5;
}

.tech-manage-footer {
  padding: 12px 20px 16px;
  border-top: 1px solid #F0F2F5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #FAF7FF;
}

.tech-manage-footer__summary {
  color: #8B79B5;
  font-size: 12px;
}

.tech-manage-footer__actions {
  display: flex;
  gap: 10px;
}

.tech-chip-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tech-chip {
  min-width: 82px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #DCCBFF;
  background: #FFFFFF;
  color: #6D57A5;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(144, 71, 248, 0.04);
}

.tech-chip:hover {
  border-color: #9047F8;
  color: #9047F8;
  background: #FAF6FF;
  transform: translateY(-1px);
}

.tech-chip.is-active {
  border-color: #9047F8;
  background: linear-gradient(135deg, #9047F8 0%, #A95FFF 100%);
  color: #FFFFFF;
  box-shadow: 0 10px 20px rgba(144, 71, 248, 0.18);
}

.tech-level-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.tech-level-card {
  position: relative;
  padding: 12px 8px;
  border-radius: 12px;
  border: 1px solid #DCCBFF;
  background: linear-gradient(180deg, #FFFFFF 0%, #FCFAFF 100%);
  text-align: center;
  transition: all 0.22s ease;
  cursor: pointer;
  overflow: hidden;
}

.tech-level-card:hover {
  border-color: #9047F8;
  background: #FAF6FF;
  box-shadow: 0 10px 22px rgba(144, 71, 248, 0.12);
  transform: translateY(-1px);
}

.tech-level-card.is-active {
  border-color: #9047F8;
  background: linear-gradient(135deg, #9047F8 0%, #A95FFF 100%);
  box-shadow: 0 12px 22px rgba(144, 71, 248, 0.2);
}

.tech-level-card__title {
  display: block;
  color: #34265B;
  font-size: 12px;
  font-weight: 600;
}

.tech-level-card__value {
  display: block;
  margin-top: 4px;
  color: #8B79B5;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.tech-level-card.is-active .tech-level-card__title,
.tech-level-card.is-active .tech-level-card__value {
  color: #FFFFFF;
}
</style>

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

/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
  flex: 1;
  overflow: auto !important;
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
  justify-content: center;
  gap: 10px;
}

/* 联系方式 */
.contact-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-info span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
</style>
