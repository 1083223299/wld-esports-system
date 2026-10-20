<template>
  <div class="container-body">
    <div ref="responsiveModule">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :label-width="'96px'"
        :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch"
        @reset="handleReset"
      ></SearchForm>
    </div>
    <!-- 操作按钮区域 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button
          v-permission="'system:accompanyingList:add'"
          type="primary"
          icon="el-icon-plus"
          class="add-btn"
          @click="handleAdd"
          >新增陪玩</el-button
        >
        <el-button
          type="primary"
          icon="el-icon-document"
          class="add-btn"
          @click="handleInvitationRecord"
          >陪陪邀请记录</el-button
        >
        <!-- 语音控制按钮组 -->
        <div class="voice-control-group" v-if="playingVoice">
          <el-button
            size="small"
            @click="pauseAllVoices"
            icon="el-icon-pause"
            type="danger"
            plain
          >
            关闭语音
          </el-button>
          <span class="voice-playing-info">
            正在播放: {{ playingVoice.userName }} 的语音条
            <!-- <el-tag size="mini" type="success" style="margin-left: 8px;">
              {{ playingVoice.voice.duration ? Math.round(playingVoice.voice.duration) + '秒' : '--' }}
            </el-tag> -->
          </span>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          row-key="id"
          v-loading="loading"
          :border="false"
          height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          @sort-change="handleSortChange"
          @selection-change="handleSelectionChange"
          :row-class-name="tableRowClassName"
          ref="table"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column
            prop="userId"
            label="陪玩ID"
            sortable="custom"
            width="100"
          ></el-table-column>
          <el-table-column label="陪玩名称" width="160">
            <template slot-scope="scope">
              <div class="user-name-cell">
                <span>{{ scope.row.userName }}</span>
                <el-tag
                  v-if="isUnionCustomerService(scope.row)"
                  size="mini"
                  type="warning"
                  effect="plain"
                  class="cs-tag"
                >
                  客服
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <!-- <el-table-column prop="tradeId" label="公会ID" width="140"></el-table-column>
        <el-table-column prop="tradeName" label="公会名称" width="120"></el-table-column> -->
          <el-table-column label="头像" width="100">
            <template slot-scope="scope">
              <div class="avatar-cell">
                <img
                  v-if="scope.row.urlLink"
                  :src="scope.row.urlLink"
                  class="avatar-thumb"
                  @click="previewAvatar(scope.row)"
                  @error="(e) => handleImgError(e)"
                />
                <img
                  v-else
                  src="@/assets/defaulIcon.png"
                  class="avatar-thumb"
                  @click="defaulImg"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="realName"
            label="真实姓名"
            width="100"
          ></el-table-column>
          <!-- 联系方式列 -->
          <el-table-column label="联系方式" width="128">
            <template slot-scope="scope">
              <PhoneDisplay :value="scope.row.phone" />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="用户状态" width="100">
            <template slot-scope="scope">
              <el-tag
                :type="scope.row.status === 0 ? 'success' : 'warning'"
                size="small"
              >
                {{ scope.row.status === 0 ? "启用" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="businessStatus"
            label="营业状态"
            width="100"
            v-if="checkPermission('system:accompanyingList:status')"
          >
            <template slot-scope="scope">
              <el-switch
                v-model="scope.row.businessStatus"
                active-color="#8F03FF"
                active-value="1"
                inactive-value="0"
                @change="businessStatusChange(scope.row)"
                validate-event
              >
              </el-switch>
            </template>
            <!-- <template slot-scope="scope">
            <el-tag :type="scope.row.businessStatus === '1' ? 'success' : 'warning'" size="small">
              {{ scope.row.businessStatus === '0' ? '停业' : '正常' }}
            </el-tag>
          </template> -->
          </el-table-column>
          <el-table-column
            label="陪玩技能"
            width="90"
            v-if="checkPermission('system:accompanyingList:skill')"
          >
            <template slot-scope="scope">
              <el-button
                type="text"
                size="small"
                @click="viewSkills(scope.row)"
                style="color: #9047f8"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="推荐搭档" width="110">
            <template slot-scope="scope">
              <el-switch
                v-model="scope.row.isRecommendPartner"
                active-color="#8F03FF"
                :active-value="1"
                :inactive-value="0"
                @change="recommendPartnerChange(scope.row)"
                validate-event
              >
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column
            prop="fansCount"
            label="粉丝数"
            sortable="custom"
            width="100"
          >
            <template slot-scope="scope">
              <span class="number-cell">{{
                scope.row.fansCount | formatNumber
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="followCount"
            label="关注数"
            sortable="custom"
            width="100"
          >
            <template slot-scope="scope">
              <span class="number-cell">{{
                scope.row.followCount | formatNumber
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="orderCount"
            label="接单量"
            sortable="custom"
            width="100"
          >
            <template slot-scope="scope">
              <span class="number-cell">{{
                scope.row.orderCount | formatNumber
              }}</span>
            </template>
          </el-table-column>
          <!-- 语音条列 -->
          <el-table-column label="语音条">
            <template slot-scope="scope">
              <voice-item
                :voice="
                  typeof scope.row.voice === 'string'
                    ? { url: scope.row.voice, status: 'idle' }
                    : scope.row.voice
                "
                :voice-id="scope.row.userId"
                :is-playing="playingVoiceId === scope.row.userId"
                :show-progress="true"
                @before-play="handleBeforeVoicePlay"
                @play="handleVoicePlay"
                @pause="handleVoicePause"
                @stop="handleVoiceStop"
                @ended="handleVoiceEnded"
                @error="handleVoiceError"
                @progress="handleVoiceProgress"
                @status-change="handleVoiceStatusChange"
              ></voice-item>
            </template>
          </el-table-column>
          <el-table-column
            label="评价"
            width="100"
            v-if="checkPermission('system:accompanyingList:evaluate')"
          >
            <template slot-scope="scope">
              <div class="evaluate-cell">
                {{ scope.row.evaluate }}
                <el-button
                  type="text"
                  size="small"
                  @click="viewEvaluateDetails(scope.row)"
                  style="color: #9047f8"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间"></el-table-column>
          <el-table-column
            label="操作"
            fixed="right"
            align="center"
            v-if="checkPermission('system:accompanyingList:Setservice')"
          >
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  v-permission="'system:accompanyingList:Setservice'"
                  type="text"
                  size="small"
                  :class="
                    isUnionCustomerService(scope.row)
                      ? 'text-danger'
                      : 'text-success'
                  "
                  @click="toggleCustomerService(scope.row)"
                >
                  {{
                    isUnionCustomerService(scope.row) ? "取消客服" : "设为客服"
                  }}
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  style="color: #f56c6c"
                  @click="handleRemoveFromClub(scope.row)"
                  v-permission="'system:union:exit'"
                >
                  移出俱乐部
                </el-button>
              </div>
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
          :selected-rows="selectedRows"
          @current-change="handleCurrentChange"
          @batch-enable="batchEnable"
          @batch-disable="batchDisable"
          @clear-selection="clearSelection"
        ></PaginationSimple>
      </div>
    </el-card>

    <!-- 弹窗组件 -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />

    <skills-dialog
      :visible.sync="skillsDialogVisible"
      :loading="skillsLoading"
      :user-name="userName"
      :main-skill="mainSkill"
      :secondary-skill="secondarySkill"
      @close="skillsDialogVisible = false"
    />

    <evaluate-dialog
      :visible.sync="evaluateDialogVisible"
      :user-name="commentList.userName"
      :total="commentpagination.total"
      :evaluate-score="commentEvaluate"
      :comment-list="commentList"
      :current-page="commentpagination.pageNum"
      :page-size="commentpagination.pageSize"
      @close="evaluateDialogVisible = false"
      @page-change="handleCommentPageChange"
      :loading="commentLoading"
    />

    <el-dialog
      :visible.sync="customerServiceDialogVisible"
      width="440px"
      append-to-body
      custom-class="cs-confirm-dialog"
      :close-on-click-modal="false"
      @close="closeCustomerServiceDialog"
    >
      <div slot="title" class="cs-confirm-header">
        <div class="cs-confirm-icon">
          <i class="el-icon-warning-outline"></i>
        </div>
        <div class="cs-confirm-title-wrap">
          <div class="cs-confirm-title">是否确认设为客服</div>
          <div class="cs-confirm-subtitle">
            提交后将立即更新当前公会客服账号
          </div>
        </div>
      </div>
      <div class="cs-confirm-content">
        <div class="cs-confirm-notice">
          <div class="cs-confirm-notice-title">温馨提示</div>
          <p>建议将该陪陪昵称改为{俱乐部名}客服</p>
          <p>当前仅支持设置一位客服</p>
          <p>若此前已设有客服，提交后，原客服账号的资格将被自动取消</p>
        </div>
      </div>
      <span slot="footer" class="cs-confirm-footer">
        <el-button class="cs-cancel-btn" @click="closeCustomerServiceDialog"
          >取消</el-button
        >
        <el-button
          class="cs-submit-btn"
          type="primary"
          :loading="customerServiceSubmitting"
          @click="confirmSetCustomerService"
          >提交</el-button
        >
      </span>
    </el-dialog>

    <!-- 移出俱乐部 -->
    <el-dialog
      title="移出俱乐部"
      :visible.sync="removeDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      @closed="resetRemoveForm"
    >
      <el-form
        ref="removeForm"
        :model="removeForm"
        :rules="removeRules"
        label-width="80px"
      >
        <el-form-item label="原因" prop="compulsoryReason">
          <el-input
            v-model="removeForm.compulsoryReason"
            type="textarea"
            :rows="4"
            maxlength="50"
            show-word-limit
            placeholder="请输入移出原因"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="removeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="removeLoading" @click="submitRemove"
          >确定移出</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
// 导入组件
import VoiceItem from "./components/VoicePlayer.vue"; // 语音播放组件
import PhoneDisplay from "@/components/PhoneDisplay/index.vue";
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import SkillsDialog from "./components/SkillsDialog.vue"; // 技能详情弹窗
import EvaluateDialog from "./components/EvaluateDialog.vue"; // 评价详情弹窗
import checkPermission from "@/utils/checkPermission";
// 导入API接口
import {
  unionList, // 获取陪玩列表
  unionStatus, // 修改陪玩状态
  unionCustomerService, // 设置/取消客服
  unionSkill, // 获取陪玩技能
  unionComment, // 获取陪玩评价
  unionBusinessStatus, // 修改陪玩营业状态
  setRecommendPartner, // 设置/取消推荐搭档
  executeExit,
} from "@/api/unionSupport";

export default {
  name: "UnionCompanionList", // 组件名称
  // 注册组件
  components: {
    VoiceItem,
    PhoneDisplay,
    SearchForm,
    PaginationSimple,
    SkillsDialog,
    EvaluateDialog,
  },
  inject: ["switchToAdd", "getSharedRefresh"], // 注入新增页面跳转方法
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
      // 是有头像
      userName: "", // 用户名
      unionScoreForm: {}, // 评价表单数据
      commentEvaluate: 0, // 评价分数
      commentList: [], // 评价列表数据
      commentLoading: false, // 评价列表加载状态
      commentpagination: {
        // 评价分页参数
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      mainSkill: [], // 主要技能列表
      secondarySkill: [], // 次要技能列表
      skillsLoading: false, // 技能加载状态
      // 日期格式化：转成 yyyy-MM-dd HH:mm:ss 格式（供初始值使用）
      formatDateToStr: (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const h = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        const s = String(date.getSeconds()).padStart(2, "0");
        return `${y}-${m}-${d} ${h}:${mm}:${s}`;
      },
      // 搜索表单配置项
      searchItems: [
        // {
        //   type: "input",
        //   prop: "tradeName",
        //   label: "公会名称",
        //   placeholder: "请输入公会名称",
        //   clearable: true,
        // },
        // {
        //   type: "input",
        //   prop: "tradeId",
        //   label: "公会ID",
        //   placeholder: "请输入公会ID",
        //   clearable: true,
        // },
        {
          type: "input",
          prop: "tradeUserName",
          label: "陪玩名称",
          placeholder: "请输入陪玩名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "userId",
          inputType: "number",
          label: "陪玩ID",
          placeholder: "请输入陪玩ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "tradeUserPhone",
          label: "陪玩手机号",
          placeholder: "请输入陪玩手机号",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "账号状态",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "正常", value: 0 },
            { label: "停用", value: 1 },
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
            { label: "停业", value: 0 },
            { label: "正常", value: 1 },
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
            { label: "不满意", value: 0 },
            { label: "一般", value: 1 },
            { label: "满意", value: 2 },
            { label: "满分好评", value: 3 },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "isRecommendPartner",
          label: "是否推荐搭档",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "是", value: "1" },
            { label: "否", value: "0" },
          ],
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
                this.searchItems.find(
                  (item) => item.prop === "createTime"
                ).pickerOptions.disabledDate = (time) => {
                  const selectedDate = minDate;
                  const current = new Date(time);
                  const timeDiff = Math.abs(
                    current.getTime() - selectedDate.getTime()
                  );
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                  // 如果日期差大于31天，则禁用
                  return dayDiff > 31;
                };
              } else {
                // 当选择了两个日期后，重置禁用规则
                this.searchItems.find(
                  (item) => item.prop === "createTime"
                ).pickerOptions.disabledDate = null;
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
        tradeId: "",
        tradeName: "",
        tradeUserId: "",
        userId: "",
        tradeUserName: "",
        tradeUserPhone: "",
        status: "",
        businessStatus: "",
        evaluate: "",
        isRecommendPartner: "",
        startTime: "",
        endTime: "",
        createTime: [],
      },
      pickerOptions: null, // 日期选择器配置
      tableData: [], // 表格数据源
      selectedRows: [], // 选中的行数据
      loading: false, // 加载状态
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      sortParams: { prop: "", order: "" }, // 排序参数
      avatarDialogVisible: false, // 头像预览弹窗显示状态
      previewAvatarUrl: "", // 预览头像URL
      skillsDialogVisible: false, // 技能弹窗显示状态
      evaluateDialogVisible: false, // 评价弹窗显示状态
      customerServiceDialogVisible: false, // 设为客服确认弹窗
      customerServiceSubmitting: false, // 设为客服提交中
      pendingCustomerServiceRow: null, // 待设为客服的行数据
      playingVoiceId: null, // 当前播放的语音ID
      playingVoice: null, // 当前播放的语音数据
      moduleHeight: 0, // 搜索模块高度

      removeDialogVisible: false,
      removeForm: { userId: "", compulsoryReason: "" },
      removeLoading: false,
      removeRules: {
        compulsoryReason: [
          { required: true, message: "请输入移出原因", trigger: "blur" },
          { max: 100, message: "不能超过50个字符", trigger: "blur" },
        ],
      },
    };
  },
  // 创建生命周期：初始化配置和数据
  created() {
    this.initPickerOptions(); // 初始化日期选择器配置
    // 核心：打开页面，默认选中最近30天（精准到时分秒）
    // const endDate = new Date(); // 结束时间：当前时间 → 23:59:59
    // endDate.setHours(23, 59, 59, 999);
    // const startDate = new Date(); // 开始时间：当前时间 - 30天 → 00:00:00
    // startDate.setTime(endDate.getTime() - 30 * 24 * 3600 * 1000);
    // startDate.setHours(0, 0, 0, 0);
    // // 赋值给filterForm.createTime（精准到时分秒），传给SearchForm作为初始值
    // this.filterForm.createTime = [
    //   this.formatDateToStr(startDate),
    //   this.formatDateToStr(endDate)
    // ];
    this.initTableData(); // 初始化表格数据
  },
  // 挂载生命周期：添加事件监听
  mounted() {
    /**获取搜索框高度 ***/
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener("resize", this.updateModuleHeight);
    // 监听页面可见性变化，暂停语音播放
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  },
  // 销毁前生命周期：清理资源
  beforeDestroy() {
    window.removeEventListener("resize", this.updateModuleHeight);
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
  activated() {
    // console.log('批量新增/编辑组件被激活')
    if (this.getSharedRefresh()) {
      this.fetchTableData();
    }
  },
  // 方法定义
  methods: {
    checkPermission,
    isUnionCustomerService(row) {
      return Number(row && row.isUnionCs) === 1;
    },
    // 运营状态切换
    async businessStatusChange(row) {
      const oldVal = row.businessStatus === "1" ? "0" : "1";
      const action = row.businessStatus === "1" ? "开启" : "关闭";
      this.$confirm(`确定要${action}${row.userName}营业吗？`, "营业状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            userId: row.userId,
            businessStatus: row.businessStatus,
          };
          // 调用状态修改接口
          unionBusinessStatus(params)
            .then(() => {
              this.$message.success(`已${action}${row.userName}营业`);
              this.fetchTableData(); // 刷新数据
            })
            .catch(() => {
              row.businessStatus = oldVal;
            });
        })
        .catch(() => {
          row.businessStatus = oldVal;
        });
    },
    // 推荐搭档开关：即时生效，失败或已达上限时恢复原值
    async recommendPartnerChange(row) {
      const oldVal = Number(row.isRecommendPartner) === 1 ? 0 : 1;
      const action = Number(row.isRecommendPartner) === 1 ? "开启" : "关闭";
      try {
        const res = await setRecommendPartner({
          tradeId: row.tradeId,
          userId: row.userId,
          isRecommendPartner: Number(row.isRecommendPartner),
        });
        if (res && res.success === false) {
          row.isRecommendPartner = oldVal;
          this.$message.error(
            (res && res.errorMessage) || `${action}推荐搭档失败`
          );
          return;
        }
        this.$message.success(`已${action}${row.userName}的推荐搭档`);
        this.fetchTableData();
      } catch (error) {
        console.error("设置推荐搭档失败:", error);
        row.isRecommendPartner = oldVal;
      }
    },
    // 处理图片加载失败（损坏/404/跨域等）
    handleImgError(e) {
      // 替换为默认头像的绝对/相对路径，和你v-else里的路径保持一致
      e.target.src = require("@/assets/defaulIcon.png");
      // 【可选】防止个别情况图片死循环加载（比如默认图也丢了）
      e.target.onerror = null;
    },
    defaulImg() {
      this.$message.warning("头像文件不存在！");
    },
    /**获取搜索框高度计算 ***/
    updateModuleHeight() {
      this.$nextTick(() => {
        if (this.$refs.responsiveModule) {
          this.moduleHeight = this.$refs.responsiveModule.offsetHeight;
          console.log("当前高度:", this.moduleHeight);
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
     * 切换手机号显示/隐藏状态
     * @param {Object} row 行数据
     */
    toggletradeUserPhoneVisible(row) {
      this.$set(row, "showFulltradeUserPhone", !row.showFulltradeUserPhone);
    },
    /**
     * 初始化日期选择器配置
     */
    initPickerOptions() {
      this.pickerOptions = {
        onPick: ({ maxDate, minDate }) => {
          if (minDate && !maxDate) {
            this.pickerOptions.disabledDate = (time) => {
              const start = minDate;
              const end = new Date(
                minDate.getTime() + 31 * 24 * 60 * 60 * 1000
              );
              const current = new Date(time);
              return (
                current.getTime() < start.getTime() ||
                current.getTime() > end.getTime()
              );
            };
          }
        },
        disabledDate: () => false,
      };
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
        (item) => item.userId === voiceId
      );
    },
    /**
     * 暂停当前播放的语音
     */
    pauseCurrentVoice() {
      if (this.playingVoiceId) {
        const row = this.tableData.find(
          (item) => item.userId === this.playingVoiceId
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
        (item) => item.userId === voiceData.voiceId
      );
      if (row) row.voice.status = "playing";
      this.playingVoiceId = voiceData.voiceId;
      this.playingVoice = this.tableData.find(
        (item) => item.userId === voiceData.voiceId
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
        (item) => item.userId === voiceData.voiceId
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
        (item) => item.userId === errorData.voiceId
      );
      if (row) row.voice.status = "error";
      this.playingVoiceId = null;
      this.playingVoice = null;
    },
    /**
     * 处理语音进度更新事件
     */
    handleVoiceProgress() {},
    /**
     * 处理语音状态变更事件
     */
    handleVoiceStatusChange() {},
    /**
     * 停止指定语音
     * @param {String} voiceId 语音ID
     */
    stopVoice(voiceId) {
      const row = this.tableData.find((item) => item.userId === voiceId);
      if (row && row.voice) row.voice.status = "idle";
    },
    /**
     * 停止所有语音播放
     */
    stopAllVoices() {
      if (this.playingVoiceId) {
        const currentRow = this.tableData.find(
          (item) => item.userId === this.playingVoiceId
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
          (item) => item.userId === this.playingVoiceId
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
        const row = this.tableData.find(
          (item) => item.userId === this.playingVoiceId
        );
        if (row && row.voice?.status === "playing") row.voice.status = "paused";
      }
    },
    // ===================== 业务逻辑方法 =====================
    /**
     * 处理表格选择变更
     * @param {Array} selection 选中的行数据
     */
    handleSelectionChange(selection) {
      this.selectedRows = selection;
    },
    /**
     * 处理搜索事件
     * @param {Object} e 搜索表单数据
     */
    handleSearch(e) {
      if (e) {
        const formValues = e;
        // 处理日期范围
        if (formValues.createTime && formValues.createTime.length === 2) {
          this.filterForm.startTime = formValues.createTime[0];
          this.filterForm.endTime = formValues.createTime[1];
        } else {
          this.filterForm.startTime = "";
          this.filterForm.endTime = "";
        }
        delete formValues.createTime;
        this.filterForm = { ...this.filterForm, ...formValues };
      }
      this.pagination.pageNum = 1; // 重置页码
      this.fetchTableData(); // 重新获取数据
    },
    /**
     * 处理重置事件
     */
    handleReset() {
      this.filterForm = {
        tradeId: "",
        tradeName: "",
        tradeUserId: "",
        userId: "",
        tradeUserName: "",
        tradeUserPhone: "",
        status: "",
        businessStatus: "",
        evaluate: "",
        isRecommendPartner: "",
        startTime: "",
        endTime: "",
        createTime: [],
      };
      this.pagination.pageNum = 1; // 重置页码
      this.sortParams = { prop: "", order: "" }; // 重置排序
      this.fetchTableData(); // 重新获取数据
    },
    /**
     * 处理新增按钮点击
     */
    handleAdd() {
      this.switchToAdd();
    },
    /**
     * 处理编辑按钮点击
     * @param {Object} row 行数据
     */
    handleEdit(row) {
      this.switchToAdd(row);
    },
    /**
     * 切换陪玩账号状态（启用/禁用）
     * @param {Object} row 行数据
     */
    toggleStatus(row) {
      const action = row.status === 0 ? "禁用" : "启用";
      this.$confirm(`确定要${action}${row.userName}账号吗？`, "用户状态", {
        type: "warning",
      })
        .then(() => {
          const params = {
            tradeUserId: row.userId,
            status: row.status === 1 ? 0 : 1,
          };
          // 调用状态修改接口
          unionStatus(params).then(() => {
            row.status = row.status === 1 ? 0 : 1;
            this.$message.success(`已${action}${row.userName}账号`);
            this.fetchTableData(); // 刷新数据
          });
        })
        .catch(() => {});
    },
    toggleCustomerService(row) {
      const isCustomerService = this.isUnionCustomerService(row);
      if (!row.tradeId || !row.userId) {
        this.$message.warning("缺少公会ID或用户ID，无法操作客服状态");
        return;
      }
      if (!isCustomerService) {
        this.pendingCustomerServiceRow = row;
        this.customerServiceDialogVisible = true;
        return;
      }
      const params = {
        tradeId: row.tradeId,
        userId: row.userId,
        isUnionCs: 0,
      };
      this.$confirm(`确定要取消“${row.userName}”的客服资格吗？`, "取消客服", {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      })
        .then(() => {
          return unionCustomerService(params);
        })
        .then(() => {
          this.$message.success("已取消客服");
          this.fetchTableData();
        })
        .catch(() => {});
    },
    closeCustomerServiceDialog() {
      this.customerServiceDialogVisible = false;
      this.customerServiceSubmitting = false;
      this.pendingCustomerServiceRow = null;
    },
    confirmSetCustomerService() {
      const row = this.pendingCustomerServiceRow;
      if (!row || !row.tradeId || !row.userId) {
        this.$message.warning("缺少公会ID或用户ID，无法操作客服状态");
        this.closeCustomerServiceDialog();
        return;
      }
      this.customerServiceSubmitting = true;
      unionCustomerService({
        tradeId: row.tradeId,
        userId: row.userId,
        isUnionCs: 1,
      })
        .then(() => {
          this.$message.success("已设为客服");
          this.closeCustomerServiceDialog();
          this.fetchTableData();
        })
        .catch(() => {
          this.customerServiceSubmitting = false;
        });
    },
    /**
     * 获取陪玩技能数据
     * @param {Object} ele 行数据
     */
    async onUnionSkill(ele) {
      this.skillsLoading = true;
      try {
        const params = {
          traeUserId: ele.userId,
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
     * @param {Object
      }
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
      this.commentList = []; // 清空评价列表
      this.commentEvaluate = 0; // 重置评价分数
      this.unionScoreForm = row; // 保存当前行数据
      this.onUnionScore(); // 获取评价数据
      this.evaluateDialogVisible = true; // 打开弹窗
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
     * 预览头像
     * @param {Object} user 用户数据
     */
    previewAvatar(user) {
      this.previewAvatarUrl = user.urlLink;
      const img = new Image();
      img.src = this.previewAvatarUrl;
      img.onload = () => {
        this.avatarDialogVisible = true;
      }; // 图片有效
      img.onerror = () => {
        this.$message.warning("头像文件损坏或不存在！");
      }; // 图片损坏
      // this.avatarDialogVisible = true;
    },
    /**
     * 关闭头像预览弹窗
     */
    handleAvatarDialogClose() {
      this.avatarDialogVisible = false;
      this.previewAvatarUrl = "";
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
     * 批量启用账号
     */
    batchEnable() {
      this.$confirm(
        `确定要启用选中的 ${this.selectedRows.length} 个账号吗？`,
        "批量启用",
        { type: "warning" }
      )
        .then(() => {
          this.selectedRows.forEach((row) => (row.status = 0));
          this.$message.success("批量启用成功");
          this.selectedRows = []; // 清空选中
          this.fetchTableData(); // 刷新数据
        })
        .catch(() => {});
    },
    /**
     * 批量禁用账号
     */
    batchDisable() {
      this.$confirm(
        `确定要禁用选中的 ${this.selectedRows.length} 个账号吗？`,
        "批量禁用",
        { type: "warning" }
      )
        .then(() => {
          this.selectedRows.forEach((row) => (row.status = 1));
          this.$message.success("批量禁用成功");
          this.selectedRows = []; // 清空选中
          this.fetchTableData(); // 刷新数据
        })
        .catch(() => {});
    },
    /**
     * 清空表格选择
     */
    clearSelection() {
      this.selectedRows = [];
      if (this.$refs.table) this.$refs.table.clearSelection(); // 清空表格选择
      this.$message.info("已清空选择");
    },
    /**
     * 获取表格数据
     */
    fetchTableData() {
      this.loading = true;
      // 处理日期范围
      if (
        this.filterForm.createTime &&
        this.filterForm.createTime.length === 2
      ) {
        this.filterForm.startTime = this.filterForm.createTime[0];
        this.filterForm.endTime = this.filterForm.createTime[1];
      }
      // 构造请求参数
      const formatData = {
        ...this.filterForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        // sortField: this.sortParams.prop,
        // sortOrder:
        // 	this.sortParams.order === "ascending"  // 如果 Element UI 返回的是 "ascending"（升序）
        // 		? "asc"                              // 就转换成后端需要的 "asc"
        // 		: this.sortParams.order === "descending" // 如果返回的是 "descending"（降序）
        // 			? "desc"                             // 就转换成后端需要的 "desc"
        // 			: "",                                // 否则为空字符串（无排序）
      };
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
      unionList(formatData)
        .then((res) => {
          if (res.data && res.data.rows) {
            // 处理表格数据，添加手机号显示状态和语音默认配置
            this.tableData = res.data.rows.map((item) => ({
              ...item,
              showFulltradeUserPhone: false,
              voice: { url: item.voice } || {
                url: "",
                status: "idle",
                currentTime: 0,
                progress: 0,
              },
            }));
            this.pagination.total = res.data.total || 0; // 设置总记录数
          } else {
            this.tableData = [];
            this.pagination.total = 0;
          }
          this.loading = false; // 关闭加载状态
        })
        .catch((error) => {
          console.error("获取陪陪列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },

    // 移出俱乐部
    handleRemoveFromClub(row) {
      this.removeForm.userId = row.userId;
      this.removeForm.compulsoryReason = "";
      this.removeDialogVisible = true;
    },
    resetRemoveForm() {
      this.$refs.removeForm && this.$refs.removeForm.resetFields();
      this.removeForm = { userId: "", compulsoryReason: "" };
    },
    submitRemove() {
      this.$refs.removeForm.validate(async (valid) => {
        if (!valid) return;
        this.removeLoading = true;
        try {
          await executeExit({
            userId: String(this.removeForm.userId),
            compulsoryReason: this.removeForm.compulsoryReason,
          });
          this.$message.success("移出成功");
          this.removeDialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          console.error("移出失败:", error);
        } finally {
          this.removeLoading = false;
        }
      });
    },

    // 陪陪邀请记录
    handleInvitationRecord() {
      this.$parent.activePage = "invitation";
    },
  },
};
</script>

<style scoped lang="scss">
/* 页面容器 */
.container-body {
  height: 100%;
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
  border-radius: 24px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0 20px;
}

/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
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

::v-deep.el-table .playing-row:hover > td {
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
  object-fit: cover;
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

// 评价单元格样式
.evaluate-cell {
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-name-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.cs-tag {
  flex-shrink: 0;
}

.cs-confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.cs-confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cs-confirm-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(143, 3, 255, 0.12),
    rgba(144, 71, 248, 0.2)
  );
  color: #8f03ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.cs-confirm-title-wrap {
  min-width: 0;
}

.cs-confirm-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.cs-confirm-content {
  padding: 4px 0 8px;
}

.cs-confirm-notice {
  padding: 16px;
  background: linear-gradient(180deg, #faf7ff 0%, #f5efff 100%);
  border: 1px solid rgba(143, 3, 255, 0.12);
  border-radius: 14px;
}

.cs-confirm-notice-title {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #2f2f36;
}

.cs-confirm-content p {
  margin: 0;
  color: #606266;
  line-height: 1.8;
  font-size: 14px;
}

.cs-confirm-content p + p {
  margin-top: 8px;
}

.cs-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cs-cancel-btn,
.cs-submit-btn {
  min-width: 88px;
  height: 36px;
  border-radius: 18px;
}

::v-deep .cs-confirm-dialog {
  border-radius: 20px;
  overflow: hidden;
}

::v-deep .cs-confirm-dialog .el-dialog__header {
  padding: 22px 24px 12px;
}

::v-deep .cs-confirm-dialog .el-dialog__body {
  padding: 8px 24px 12px;
}

::v-deep .cs-confirm-dialog .el-dialog__footer {
  padding: 8px 24px 24px;
}

// 操作按钮组样式
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
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
  justify-content: center;
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
.el-table th.el-table__cell > .cell {
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

  .pagination-fixed {
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
  color: #1bc286;
}

.el-tag.el-tag--warning {
  background-color: #fdf6ec00;
  border-color: #faecd800;
  color: #ff4d4f;
}

.el-tag--small {
  padding: 0;
}

/* 页面容器 */
.container-body {
  height: 100%;
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
  border-radius: 24px;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0 20px;
}

/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
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
  gap: 10px;
  flex-wrap: wrap;
}
</style>
