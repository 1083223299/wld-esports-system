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
        :confirm-reset="true"
        :colSpan="'2'"
        confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch"
        @reset="handleReset"
      ></SearchForm>
    </div>

    <!-- 列表卡片 -->
    <el-card class="list-card" shadow="never">
      <div class="action-bar">
        <el-button
          v-permission="'system:unionSupport:add'"
          type="primary"
          icon="el-icon-plus"
          class="add-btn"
          @click="handleAdd"
          >新增陪玩</el-button
        >
        <el-button
          type="primary"
          icon="el-icon-s-order"
          class="add-btn"
          style="background: #6a35ff"
          @click="$parent.activePage = 'invitation'"
        >
          陪陪邀请记录
        </el-button>
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
          </span>
        </div>
      </div>

      <!-- 表格包裹层 -->
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          row-key="id"
          v-loading="loading"
          :border="false"
          height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
          @sort-change="handleSortChange"
          :row-class-name="tableRowClassName"
          ref="table"
        >
          <!-- 表格列保持不变 -->
          <el-table-column
            prop="userId"
            label="陪玩ID"
            sortable="custom"
            width="100"
          ></el-table-column>
          <el-table-column label="陪玩名称" min-width="160">
            <template slot-scope="scope">
              <div class="name-cell">
                <span class="name-text">{{ scope.row.userName }}</span>
                <span class="type-tag" :class="`type-tag--${companionTypeOf(scope.row).key}`">{{
                  companionTypeOf(scope.row).label
                }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="tradeId"
            label="公会ID"
            width="140"
          ></el-table-column>
          <el-table-column
            prop="tradeName"
            label="公会名称"
            width="120"
          ></el-table-column>
          <el-table-column label="头像" width="80">
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
          <el-table-column label="联系方式" width="120">
            <template slot-scope="scope">
              <PhoneDisplay :value="scope.row.phone" />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="用户状态" width="100">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === 0 ? 'success' : 'warning'">
                {{ scope.row.status === 0 ? "启用" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="isSkillTop"
            label="主技能置顶"
            width="100"
            v-if="checkPermission('system:unionSupport:top')"
          >
            <template slot-scope="scope">
              <el-switch
                v-model="scope.row.isSkillTop"
                active-color="#8F03FF"
                :active-value="1"
                :inactive-value="0"
                @change="skillTopChange(scope.row)"
                validate-event
              >
              </el-switch>
            </template>
          </el-table-column>
          <el-table-column prop="topSortValue" label="排序值" width="100">
            <template slot-scope="{ row }">
              <div class="sort-value-cell">
                <span>{{ row.topSortValue }}</span>
                <el-tooltip
                  content="编辑排序值"
                  placement="top"
                  v-permission="'system:unionSupport:sort'"
                >
                  <el-button
                    type="text"
                    icon="el-icon-edit"
                    class="sort-edit-icon"
                    @click="openSortDialog(row)"
                  ></el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="businessStatus"
            label="营业状态"
            v-if="checkPermission('system:unionSupport:status')"
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
          </el-table-column>
          <el-table-column
            label="陪玩技能"
            v-if="checkPermission('system:unionSupport:skill')"
          >
            <template slot-scope="scope">
              <el-button
                type="text"
                size="small"
                @click="viewSkills(scope.row)"
                style="color: #9047f8"
                >查看</el-button
              >
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
          <el-table-column prop="fansCount" label="粉丝数" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{
                scope.row.fansCount | formatNumber
              }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="followCount" label="关注数" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{
                scope.row.followCount | formatNumber
              }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="接单量" sortable="custom">
            <template slot-scope="scope">
              <span class="number-cell">{{
                scope.row.orderCount | formatNumber
              }}</span>
            </template>
          </el-table-column>
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
            v-if="checkPermission('system:unionSupport:evaluate')"
          >
            <template slot-scope="scope">
              <div class="evaluate-cell">
                {{ scope.row.evaluate }}
                <el-button
                  type="text"
                  size="small"
                  @click="viewEvaluateDetails(scope.row)"
                  style="color: #9047f8; margin-left: 8px"
                  >查看</el-button
                >
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="createTime"
            label="创建时间"
            width="150"
          ></el-table-column>
          <el-table-column label="禁用操作人" width="150">
            <template slot-scope="{ row }">
              <div
                v-if="row.banOperatorName || row.banOperatorId"
                class="ban-operator-cell"
              >
                <div class="ban-operator-name">
                  <span>{{ row.banOperatorName }}</span>
                  <span v-if="row.banOperatorDeleted" class="ban-operator-deleted"
                    >已注销</span
                  >
                </div>
                <div class="ban-operator-id">ID: {{ row.banOperatorId }}</div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="unbanTime" label="解禁时间" width="160">
            <template slot-scope="{ row }">
              {{ row.unbanTime || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            prop="banReason"
            label="禁用原因"
            width="160"
            show-overflow-tooltip
          >
            <template slot-scope="{ row }">
              {{ row.banReason || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="200"
            fixed="right"
            v-if="
              checkPermission([
                'system:unionSupport:techManage',
                'system:unionSupport:disable',
              ])
            "
          >
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  type="text"
                  size="small"
                  @click="openTechDialog(scope.row)"
                  v-permission="'system:unionSupport:techManage'"
                  >游戏管理</el-button
                >
                <el-button
                  v-permission="'system:unionSupport:disable'"
                  type="text"
                  size="small"
                  :class="
                    String(scope.row.status) === '0'
                      ? 'text-danger'
                      : 'text-success'
                  "
                  @click="toggleStatus(scope.row)"
                >
                  {{ String(scope.row.status) === "0" ? "禁用" : "启用" }}
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  style="color: #f56c6c"
                  @click="handleRemoveFromClub(scope.row)"
                  v-permission="'system:union:exit'"
                  >移出俱乐部</el-button
                >
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
          @current-change="handleCurrentChange"
        ></PaginationSimple>
      </div>
    </el-card>

    <!-- 图片放大组件：v-model控制显示，单图传[url] -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
    <BanUserDialog
      ref="banUserDialog"
      :visible.sync="banDialogVisible"
      force-guild
      @success="fetchTableData"
    />
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

    <!-- 编辑主技能置顶排序值 -->
    <el-dialog
      title="编辑排序值"
      :visible.sync="sortDialogVisible"
      width="420px"
      :close-on-click-modal="false"
      @close="resetSortDialog"
    >
      <el-form
        ref="sortFormRef"
        :model="sortForm"
        :rules="sortRules"
        label-width="90px"
      >
        <el-form-item label="排序值" prop="topSortValue">
          <el-input-number
            v-model="sortForm.topSortValue"
            :min="0"
            :step="1"
            :precision="0"
            controls-position="right"
            placeholder="请输入排序值"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="sortDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sortSubmitting" @click="submitSort"
          >确定</el-button
        >
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
                <div class="tech-section__meta">{{ techCurrentUser.userName || '当前陪玩' }} · 共 {{ techSelectedCount }} 项
                </div>
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
                        <button v-for="option in techIdentityOptions" :key="option.value" type="button"
                          class="tech-chip"
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
import BanUserDialog from "@/components/BanUserDialog/index.vue";
import checkPermission from "@/utils/checkPermission";
// 导入API接口
import {
  unionList, // 获取陪玩列表
  unionSkill, // 获取陪玩技能
  unionComment, // 获取陪玩评价
  unionBusinessStatus, // 修改陪玩营业状态
  setRecommendPartner, // 设置/取消推荐搭档
  manageUserSkillTop, // 修改主技能置顶
  updateTopSortValue, // 修改置顶排序值
  getTechnicalCompanionManageInfo,
  batchSaveTechnicalCompanion,
  executeExit,
} from "@/api/unionSupport";
import { updateUserStatus } from "@/api/personalSupport";

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
      userName: "", // 用户名
      banDialogVisible: false,
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
        {
          type: "input",
          prop: "tradeName",
          label: "公会名称",
          placeholder: "请输入公会名称",
          clearable: true,
          span: 6,
        },
        {
          type: "input",
          prop: "tradeId",
          label: "公会ID",
          placeholder: "请输入公会ID",
          clearable: true,
          span: 6,
        },
        {
          type: "input",
          prop: "tradeUserName",
          label: "陪玩名称",
          placeholder: "请输入陪玩名称",
          clearable: true,
          span: 6,
        },
        {
          type: "input",
          prop: "tradeUserId",
          inputType: "number",
          label: "陪玩ID",
          placeholder: "请输入陪玩ID",
          clearable: true,
          span: 6,
        },
        {
          type: "input",
          prop: "tradeUserPhone",
          label: "陪玩手机号",
          placeholder: "请输入陪玩手机号",
          clearable: true,
          span: 6,
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
          span: 6,
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
          span: 6,
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
          span: 6,
        },
        {
          type: "select",
          prop: "isSkillTop",
          label: "主技能置顶",
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "是", value: "1" },
            { label: "否", value: "0" },
          ],
          clearable: true,
          span: 6,
        },
        {
          type: "select",
          prop: "isTechnicalWaiter",
          label: "开启技术培",
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "是", value: "1" },
            { label: "否", value: "0" },
          ],
          clearable: true,
          span: 6,
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
          span: 6,
        },
        {
          type: "select",
          prop: "companionType",
          label: "陪陪类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: "" },
            { label: "公会陪陪", value: "pure" },
            { label: "商户公会陪陪", value: "merchant" },
          ],
          clearable: true,
          span: 6,
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
          span: 6,
        },
      ],
      // 筛选表单数据
      filterForm: {
        tradeId: "",
        tradeName: "",
        tradeUserId: "",
        tradeUserName: "",
        tradeUserPhone: "",
        status: "",
        businessStatus: "",
        evaluate: "",
        isSkillTop: "",
        isTechnicalWaiter: "",
        isRecommendPartner: "",
        companionType: "",
        startTime: "",
        endTime: "",
        createTime: [],
        isQueryTradeUnionUser: 1,
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
      playingVoiceId: null, // 当前播放的语音ID
      playingVoice: null, // 当前播放的语音数据
      moduleHeight: 0, // 搜索模块高度
      sortDialogVisible: false, // 排序值弹窗显示状态
      sortSubmitting: false, // 排序值提交状态
      sortForm: {
        userId: "",
        topSortValue: undefined,
      },
      sortRules: {
        topSortValue: [
          { required: true, message: "请输入排序值", trigger: "change" },
        ],
      },
      techDrawerVisible: false, // 技术陪管理抽屉显示状态
      techLoading: false, // 技能下拉加载状态
      techSubmitting: false, // 技术陪提交状态
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

      // 移出俱乐部
      removeDialogVisible: false,
      removeForm: { userId: "", compulsoryReason: "" },
      removeLoading: false,
      removeRules: {
        compulsoryReason: [
          { required: true, message: "请输入移出原因", trigger: "blur" },
          { max: 50, message: "不能超过50个字符", trigger: "blur" },
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
    /**
     * 陪陪类型：key 直接采用后端 companionType 枚举（personal/pure/merchant，
     * 服务端按「公会-商户绑定关系」实时计算）；无该字段时本地兜底
     */
    companionTypeOf(row) {
      if (row && row.companionType) {
        const fallbackLabels = {
          pure: "公会陪陪",
        };
        return {
          key: row.companionType,
          label:
            row.companionTypeLabel ||
            fallbackLabels[row.companionType] ||
            "公会陪陪",
        };
      }
      return { key: "pure", label: "公会陪陪" };
    },
    // 主技能置顶开关，失败或取消时恢复原值
    async skillTopChange(row) {
      const currentVal = Number(row.isSkillTop);
      const oldVal = currentVal === 1 ? 0 : 1;
      const action = currentVal === 1 ? "置顶" : "取消置顶";
      this.$confirm(`确定要${action}${row.userName}主技能吗？`, "主技能置顶", {
        type: "warning",
      })
        .then(() => {
          manageUserSkillTop({
            userId: row.userId,
            isSkillTop: row.isSkillTop,
          })
            .then(() => {
              this.$message.success(`${action}成功`);
              this.fetchTableData();
            })
            .catch(() => {
              row.isSkillTop = oldVal;
            });
        })
        .catch(() => {
          row.isSkillTop = oldVal;
        });
    },
    // 打开排序值弹窗，带入当前行的排序值
    openSortDialog(row) {
      const sortValue = row.topSortValue;
      this.sortForm = {
        userId: row.userId,
        topSortValue:
          sortValue === null || sortValue === undefined || sortValue === ""
            ? undefined
            : Number(sortValue),
      };
      this.sortDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.sortFormRef) this.$refs.sortFormRef.clearValidate();
      });
    },
    // 重置排序值弹窗，避免残留上一次填写内容
    resetSortDialog() {
      this.sortSubmitting = false;
      this.sortForm = {
        userId: "",
        topSortValue: undefined,
      };
      if (this.$refs.sortFormRef) this.$refs.sortFormRef.clearValidate();
    },
    // 提交主技能置顶排序值
    submitSort() {
      this.$refs.sortFormRef.validate(async (valid) => {
        if (!valid) return;
        try {
          this.sortSubmitting = true;
          await updateTopSortValue({
            userId: this.sortForm.userId,
            topSortValue: this.sortForm.topSortValue,
          });
          this.$message.success("排序值更新成功");
          this.sortDialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          console.error("排序值更新失败:", error);
        } finally {
          this.sortSubmitting = false;
        }
      });
    },
    // 打开游戏管理抽屉，并按用户ID加载技能列表与当前配置
    async openTechDialog(row) {
      this.techDrawerVisible = true;
      this.techLoading = true;
      this.techCurrentUser = {
        userId: this.normalizeTechValue(row.userId),
        userName: row.userName || row.nickName || ""
      };
      this.techSkillOptions = [];
      this.techRows = [];
      try {
        const manageRes = await getTechnicalCompanionManageInfo({
          userId: this.normalizeTechValue(row.userId)
        });
        const manageList = this.normalizeTechSkills(manageRes);
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
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.rows)) return res.rows;
      if (Array.isArray(res?.data?.rows)) return res.data.rows;
      if (Array.isArray(res?.data?.data)) return res.data.data;
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

    formatTechSkillName(item) {
      return item.productName || item.skillName || item.goodsName || item.name || "未命名游戏";
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

    // 提交技术陪管理，按接口要求传 userId 和 skills
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
        tradeUserName: "",
        tradeUserPhone: "",
        status: "",
        businessStatus: "",
        evaluate: "",
        isSkillTop: "",
        isTechnicalWaiter: "",
        isRecommendPartner: "",
        companionType: "",
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
      if (String(row.status) === "0") {
        this.$refs.banUserDialog && this.$refs.banUserDialog.open(row);
        return;
      }
      this.$confirm(
        `确定要启用${row.userName || row.nickName || ""}账号吗？`,
        "提示",
        {
          type: "warning",
          confirmButtonText: "确定",
          cancelButtonText: "取消",
        }
      )
        .then(async () => {
          try {
            const res = await updateUserStatus({
              userId: Number(row.userId),
              status: "0",
            });
            if (res && res.success === false) {
              this.$message.error((res && res.errorMessage) || "启用失败");
              return;
            }
            this.$message.success("启用成功");
            this.fetchTableData();
          } catch (error) {
            console.error("启用用户失败:", error);
            this.$message.error("启用失败");
          }
        })
        .catch(() => {});
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
              isSkillTop: Number(item.isSkillTop || 0), // 主技能置顶开关使用数字值
              isRecommendPartner: Number(item.isRecommendPartner || 0), // 推荐搭档开关使用数字值
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
      this.removeForm.userId = String(row.userId);
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
            userId: this.removeForm.userId,
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
  },
};
</script>
<style scoped>
/* 页面容器 */
.list-wrapper {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 列表卡片 */
.list-card {
  flex: 0.93;
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
.action-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-bottom: 20px;
}

.add-btn {
  background: #6a35ff;
  border: none;
  width: 191px;
}

.add-btn:hover {
  background: #7b38d9;
}

.voice-control-group {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0px 12px 0px 0px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 6px;
}

.voice-playing-info {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
  flex: 1;
  overflow: auto;
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

/* 名称 + 类型标签行内组合 */
.name-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 陪陪类型标签：公会陪陪=灰底深灰字 / 商户公会陪陪=紫底紫字 */
.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  flex-shrink: 0;
}

.type-tag--pure {
  background: #f2f3f5;
  color: #4e5969;
}

.type-tag--merchant {
  background: #f5edff;
  color: #8f03ff;
}
</style>

<style scoped lang="scss">
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
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.avatar-cell:hover {
  background-color: #f0f0f0;
}

.avatar-thumb {
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

// 联系方式
.contact-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-icon {
  margin-left: 8px;
  font-size: 10px;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 8px;
}

// 数字单元格样式
.number-cell {
  font-weight: 500;
  color: #333;
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
  background: #9047f8;
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
  color: #111111;
  font-size: 13px;
  font-weight: 500;
}

.ban-operator-id {
  color: #9ca3af;
  font-size: 12px;
}

// 排序值
.sort-value-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.sort-edit-icon {
  padding: 0;
  color: #9047f8;
}

// 操作按钮组样式
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
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

.el-tag--small {
  padding: 0;
}

// 文本按钮颜色
.el-button--text {
  color: rgb(144, 71, 248);
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
  color: #000;
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
  align-items: center;
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
  color: #000;
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

.tech-row-field {
  min-width: 0;
}

.tech-row-label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #000;
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
  color: #000;
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

::v-deep .tech-row-field .el-input__inner {
  border-radius: 12px;
  border-color: #E7DBFF;
  height: 38px;
  background: #FCFAFF;
  color: #34265B;
}

::v-deep .tech-row-field .el-input__inner:hover,
::v-deep .tech-row-field .el-input__inner:focus {
  border-color: #9047F8;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(144, 71, 248, 0.08);
}

::v-deep .tech-row-field .el-input__suffix {
  display: flex;
  align-items: center;
}
</style>
