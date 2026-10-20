<template>
  <div class="container">
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20"
        :confirm-reset="true" confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch" @reset="handleReset"></SearchForm>
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
            正在播放: {{ playingVoice.userName }} 的语音条
          </span>
        </div>
      </div>
      <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
        :header-row-style="{ backgroundColor: '#F6F6FB' }" :height="`calc(100vh - ${moduleHeight}px - 260px)`"
        @sort-change="handleSortChange" @selection-change="handleSelectionChange" :row-class-name="tableRowClassName"
        ref="table">
        <el-table-column prop="userId" label="陪玩ID" sortable="custom"></el-table-column>
        <el-table-column prop="userName" label="陪玩名称"></el-table-column>
        <el-table-column label="头像">
          <template slot-scope="scope">
            <div class="avatar-cell">
              <!-- 有链接时加载目标图片，加载失败触发error事件替换为默认图 -->
              <img v-if="scope.row.urlLink" :src="scope.row.urlLink" class="avatar-thumb"
                @click="previewAvatar(scope.row)" @error="(e) => handleImgError(e)" />
              <!-- 无链接直接显示默认图 -->
              <img v-else src="@/assets/defaulIcon.png" class="avatar-thumb" @click="defaulImg" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="陪玩技能">
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
            <voice-item :voice="typeof scope.row.voice === 'string'
              ? { url: scope.row.voice, status: 'idle' }
              : scope.row.voice" :voice-id="scope.row.userId" :is-playing="playingVoiceId === scope.row.userId"
              :show-progress="true" @before-play="handleBeforeVoicePlay" @play="handleVoicePlay"
              @pause="handleVoicePause" @stop="handleVoiceStop" @ended="handleVoiceEnded" @error="handleVoiceError"
              @progress="handleVoiceProgress" @status-change="handleVoiceStatusChange"></voice-item>
          </template>
        </el-table-column>
        <el-table-column label="评价">
          <template slot-scope="scope">
            <div class="evaluate-cell">
              {{ scope.row.evaluate }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间"></el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template slot-scope="scope">
            <div class="action-buttons">
              <el-button v-permission="'system:registeredSupport:disable'" type="text" size="small"
                :class="scope.row.status === 0 ? 'text-danger' : 'text-success'" @click="toggleStatus(scope.row)">
                {{ scope.row.status === 0 ? '禁用' : '启用' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <div class="batch-actions" v-if="selectedRows.length > 0">
          <span class="selected-count">已选择 {{ selectedRows.length }} 项</span>
          <el-button type="text" @click="batchEnable" size="small">批量启用</el-button>
          <el-button type="text" @click="batchDisable" size="small">批量禁用</el-button>
          <el-button type="text" @click="clearSelection" size="small">清空</el-button>
        </div>

        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          :selected-rows="selectedRows" @current-change="handleCurrentChange" @batch-enable="batchEnable"
          @batch-disable="batchDisable" @clear-selection="clearSelection"></PaginationSimple>
      </div>
    </el-card>

    <!-- 图片放大组件：v-model控制显示，单图传[url] -->
    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
    <skills-dialog :visible.sync="skillsDialogVisible" :loading="skillsLoading" :user-name="userName"
      :main-skill="mainSkill" :secondary-skill="secondarySkill" @close="skillsDialogVisible = false" />
  </div>
</template>

<script>
// 导入组件
import VoiceItem from "../components/VoicePlayer.vue";           // 语音播放组件
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
import SkillsDialog from "../components/SkillsDialog.vue";

// 导入API接口
import {
  unionStatus,  // 修改陪玩状态
  unionSkill,   // 获取陪玩技能
} from "@/api/unionSupport";
import {
  getUserListIsWaiter  // 陪玩列表
} from '@/api/userManagement'

export default {
  name: "UnionCompanionList", // 组件名称
  // 注册组件
  components: {
    VoiceItem,
    SearchForm,
    PaginationSimple,
    SkillsDialog
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
      unionScoreForm: {},                // 评价表单数据
      mainSkill: [],                     // 主要技能列表
      secondarySkill: [],                 // 次要技能列表
      skillsLoading: false,              // 技能加载状态
      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "userId",
          label: "陪玩ID",
          inputType: "number",
          placeholder: "请输入陪玩ID",
          clearable: true,
        },
        {
          type: "input",
          prop: "nikeName",
          label: "陪玩名称",
          placeholder: "请输入陪玩名称",
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
      ],
      // 筛选表单数据
      filterForm: {
        userId: "",
        nikeName: "",
        status: "",
      },
      tableData: [],              // 表格数据源
      selectedRows: [],           // 选中的行数据
      loading: false,             // 加载状态
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      sortParams: { prop: "", order: "" }, // 排序参数
      avatarDialogVisible: false, // 头像预览弹窗显示状态
      previewAvatarUrl: "",       // 预览头像URL
      skillsDialogVisible: false, // 技能弹窗显示状态
      playingVoiceId: null,       // 当前播放的语音ID
      playingVoice: null,         // 当前播放的语音数据
      moduleHeight: 0, // 搜索模块高度
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
    handleVoiceProgress() {
    },
    /**
     * 处理语音状态变更事件
     */
    handleVoiceStatusChange() {
    },
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
        const row = this.tableData.find(
          (item) => item.userId === this.playingVoiceId,
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
        this.filterForm = { ...this.filterForm, ...e };
      }
      this.pagination.pageNum = 1; // 重置页码
      this.fetchTableData();       // 重新获取数据
    },
    /**
     * 处理重置事件
     */
    handleReset() {
      this.filterForm = {
        nikeName: "",
        userId: "",
        status: "",

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
        .catch(() => {
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
      this.previewAvatarUrl = user.urlLink;
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
        { type: "warning" },
      )
        .then(() => {
          this.selectedRows.forEach((row) => (row.status = 0));
          this.$message.success("批量启用成功");
          this.selectedRows = []; // 清空选中
          this.fetchTableData();  // 刷新数据
        })
        .catch(() => {
        });
    },
    /**
     * 批量禁用账号
     */
    batchDisable() {
      this.$confirm(
        `确定要禁用选中的 ${this.selectedRows.length} 个账号吗？`,
        "批量禁用",
        { type: "warning" },
      )
        .then(() => {
          this.selectedRows.forEach((row) => (row.status = 1));
          this.$message.success("批量禁用成功");
          this.selectedRows = []; // 清空选中
          this.fetchTableData();  // 刷新数据
        })
        .catch(() => {
        });
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
      // 构造请求参数
      const formatData = {
        ...this.filterForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
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
      getUserListIsWaiter(formatData)
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
          console.error("获取列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false; // 关闭加载状态
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
  },
};
</script>

<style scoped lang="scss">
.container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

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

// 列表卡片样式
.list-card {
  border-radius: 24px;
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

// 评价单元格样式
.evaluate-cell {
  display: flex;
  align-items: center;
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
  justify-content: space-between;
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
</style>
