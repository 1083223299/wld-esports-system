<template>
  <div class="voice-room-page">
    <!-- <div class="page-header">
      <h2>语音房管理</h2>
    </div> -->

    <div ref="responsiveModule" class="search-module">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          v-loading="loading"
          :border="false"
          height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :header-cell-style="{ textAlign: 'center' }"
          :cell-style="{ textAlign: 'center' }"
          row-key="roomId"
          ref="table"
        >
          <el-table-column prop="roomId" label="房间ID" width="140" />

          <el-table-column label="房主信息" min-width="220">
            <template slot-scope="scope">
              <div class="owner-info">
                <div class="owner-avatar" @click="previewAvatar(scope.row.ownerAvatarUrl)">
                  <img :src="scope.row.ownerAvatarUrl || defaultAvatar" alt="头像" />
                </div>
                <div class="owner-text">
                  <div class="owner-name">{{ scope.row.ownerNickname || "—" }}</div>
                  <div class="owner-meta">ID: {{ scope.row.ownerUserId || "—" }}</div>
                  <div class="owner-meta">{{ scope.row.ownerPhone || "—" }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="关联订单" min-width="170">
            <template slot-scope="scope">
              <span>{{ scope.row.orderId || "—" }}</span>
            </template>
          </el-table-column>

          <el-table-column label="在线人数" width="160">
            <template slot-scope="scope">
              <div class="online-count-cell">
                <span class="online-count-badge">{{ scope.row.onlineCount || 0 }}</span>
                <span class="online-count-text">人</span>
                <el-button
                  v-permission="'voice-room:room:member'"
                  v-if="scope.row.onlineCount > 0"
                  type="text"
                  size="small"
                  class="count-view-btn"
                  @click="showRoomMembers(scope.row)"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="累计时长" width="140">
            <template slot-scope="scope">
              <span>{{ formatDuration(scope.row.totalDurationSeconds) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="创建时间" min-width="170" />

          <el-table-column label="状态" width="110">
            <template slot-scope="scope">
              <el-tag :type="statusTagType(scope.row.status)" size="small">
                {{ scope.row.statusName || statusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" fixed="right" width="200">
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  v-permission="'voice-room:room:patrol'"
                  v-if="scope.row.canPatrol"
                  type="text"
                  size="small"
                  class="action-btn inspection"
                  @click="inspectRoom(scope.row)"
                >
                  巡查
                </el-button>

                <el-button
                  v-permission="'voice-room:room:invite-code'"
                  v-if="scope.row.canCopyInvite && isRoomActive(scope.row)"
                  type="text"
                  size="small"
                  class="action-btn copy"
                  @click="copyShareCode(scope.row)"
                >
                  复制分享口令
                </el-button>

                <span v-if="!hasAction(scope.row)" class="action-empty">-</span>
              </div>
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

    <el-dialog
      :visible.sync="memberDialogVisible"
      width="760px"
      custom-class="voice-member-dialog"
      :close-on-click-modal="false"
      @close="closeMemberDialog"
    >
      <template slot="title">
        <div class="member-dialog-title">
          <span class="member-dialog-title-icon"><i class="el-icon-headset"></i></span>
          <div class="member-dialog-title-text">
            <span class="member-dialog-title-main">在线成员</span>
            <span class="member-dialog-title-sub">房间 {{ currentRoomId || "—" }}</span>
          </div>
          <span class="member-dialog-count">
            {{ currentMemberList.length }}
            <em>人</em>
          </span>
        </div>
      </template>

      <div v-loading="memberLoading" class="member-panel">
        <div class="member-panel-head">
          <span class="member-panel-tip">
            <i class="el-icon-user"></i>
            实时成员
          </span>
          <!-- <span class="member-panel-hint">最多展示 8 位在线成员</span> -->
        </div>

        <div v-if="currentMemberList.length" class="member-panel-grid">
          <div v-for="member in currentMemberList" :key="member.userId" class="member-card">
            <span class="member-card-dot"></span>
            <div class="member-card-avatar" @click="previewAvatar(member.avatarUrl)">
              <img :src="member.avatarUrl || defaultAvatar" alt="头像" />
            </div>
            <div class="member-card-info">
              <div class="member-card-name-row">
                <span class="member-card-name" :title="member.nickname">{{ member.nickname || "—" }}</span>
                <span class="member-card-role">{{ member.memberRoleName || member.memberRole || "成员" }}</span>
              </div>
              <div class="member-card-meta">ID：{{ member.userId || "—" }}</div>
              <div class="member-card-meta">
                <i class="el-icon-mobile-phone"></i>
                {{ member.phone || "—" }}
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!memberLoading" class="member-dialog-empty">暂无成员信息</div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button round @click="memberDialogVisible = false">关 闭</el-button>
      </div>
    </el-dialog>

    <ImgZoom v-model="avatarDialogVisible" :img-list="[previewAvatarUrl]" />
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import ImgZoom from "@/components/ImgZoom/index.vue";
import { openVoiceRoomPatrol, onVoiceRoomRefresh } from "@/components/VoiceRoomPatrolFloat/bus";
import {
  getVoiceRoomInviteCode,
  getVoiceRoomMemberList,
  pageVoiceRoom,
} from "@/api/voiceRoom";

const ROOM_STATUS_MAP = {
  0: { text: "进行中", type: "success" },
  1: { text: "已解散", type: "warning" },
  2: { text: "已结束", type: "info" },
  // 3: { text: "已封禁", type: "danger" },
};

/** 列表无感轮询间隔，与 NotificationCenter 的 POLL_INTERVAL 对齐 */
const POLL_INTERVAL = 20000;

export default {
  name: "VoiceRoomList",
  components: {
    SearchForm,
    PaginationSimple,
    ImgZoom,
  },
  data() {
    return {
      loading: false,
      pollTimer: null,
      // 请求序号 + 在飞计数：防轮询与翻页/搜索回包乱序，静默轮询跳过并发
      fetchSeq: 0,
      pendingFetches: 0,
      defaultAvatar: require("@/assets/defaulIcon.png"),
      filterForm: {
        roomId: "",
        ownerUserId: "",
        ownerKeyword: "",
        orderId: "",
        status: "",
        createTimeRange: [],
      },
      searchItems: [
        {
          type: "input",
          prop: "roomId",
          label: "房间ID",
          placeholder: "请输入",
          inputType: "integer",
          clearable: true,
        },
        {
          type: "input",
          prop: "ownerUserId",
          label: "房主ID",
          placeholder: "请输入",
          inputType: "integer",
          clearable: true,
        },
        {
          type: "input",
          prop: "ownerKeyword",
          label: "房主名称",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "input",
          prop: "orderId",
          label: "关联订单ID",
          placeholder: "请输入",
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "请选择",
          clearable: true,
          options: [
            { label: "进行中", value: "0" },
            { label: "已解散", value: "1" },
            { label: "已结束", value: "2" },
            // { label: "已封禁", value: "3" },
          ],
        },
        {
          type: "daterange",
          prop: "createTimeRange",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          maxRangeDays: 31,
          pickerOptions: {
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
      tableData: [],
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
      memberDialogVisible: false,
      memberLoading: false,
      currentMemberList: [],
      currentRoomId: "",
      avatarDialogVisible: false,
      previewAvatarUrl: "",
    };
  },
  created() {
    this.fetchTableData();
    // 巡查浮窗里「禁用并踢出」成功后通知这里刷新列表（在线人数/状态会变）
    this.unregisterRoomRefresh = onVoiceRoomRefresh(() => this.fetchTableData());
    // 标签页切回前台时补一次静默刷新，把隐藏期间落下的变化补齐
    this.handleVisibilityChange = () => {
      if (!document.hidden) this.fetchTableData({ silent: true });
    };
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.startPolling();
  },
  beforeDestroy() {
    if (this.unregisterRoomRefresh) this.unregisterRoomRefresh();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.stopPolling();
  },
  methods: {
    statusText(status) {
      return ROOM_STATUS_MAP[status]?.text || "未知";
    },
    statusTagType(status) {
      return ROOM_STATUS_MAP[status]?.type || "info";
    },
    /** 进行中的房间才允许分享口令；status 0=进行中 1=已解散 2=已结束 3=已封禁 */
    isRoomActive(row) {
      return !!row && Number(row.status) === 0;
    },
    hasAction(row) {
      if (!this.isRoomActive(row)) return false;
      return !!(row.canPatrol || row.canCopyInvite);
    },
    formatDuration(seconds) {
      const total = Number(seconds);
      if (!Number.isFinite(total) || total <= 0) {
        return "00:00:00";
      }
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = Math.floor(total % 60);
      return [hours, minutes, secs]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
    },
    getResponseData(res) {
      if (res && typeof res === "object") {
        if (res.data && typeof res.data === "object") {
          return res.data;
        }
        return res;
      }
      return {};
    },
    buildQueryParams() {
      const form = this.filterForm || {};
      const range = Array.isArray(form.createTimeRange) ? form.createTimeRange : [];
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
        roomId: form.roomId || undefined,
        ownerUserId: form.ownerUserId || undefined,
        ownerKeyword: form.ownerKeyword ? String(form.ownerKeyword).trim() : undefined,
        orderId: form.orderId || undefined,
        status: form.status === "" || form.status === null ? undefined : form.status,
        createTimeBegin: range.length === 2 ? range[0] : undefined,
        createTimeEnd: range.length === 2 ? range[1] : undefined,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      return params;
    },
    startPolling() {
      this.stopPolling();
      this.pollTimer = window.setInterval(() => {
        // 后台标签页不打扰，切回前台时由 visibilitychange 补一次
        if (document.hidden) return;
        this.fetchTableData({ silent: true });
      }, POLL_INTERVAL);
    },
    stopPolling() {
      if (this.pollTimer) {
        window.clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    /**
     * @param {{ silent?: boolean }} [options]
     * silent=true 为无感轮询专用：不置 loading、失败不弹错不清表、
     * 数据没变不重赋值、有并发请求或成员弹窗开着时直接跳过本轮。
     */
    async fetchTableData({ silent = false } = {}) {
      if (silent && (this.pendingFetches > 0 || this.memberDialogVisible)) return;

      const seq = ++this.fetchSeq;
      this.pendingFetches += 1;
      if (!silent) this.loading = true;
      try {
        // silentError：轮询失败由业务静默处理，避免每轮弹一次拦截器 toast
        const res = await pageVoiceRoom(
          this.buildQueryParams(),
          silent ? { silentError: true } : undefined
        );
        // 期间用户翻页/搜索发出了新请求，这个回包已过期，丢弃
        if (seq !== this.fetchSeq) return;
        const data = this.getResponseData(res);
        const rows = Array.isArray(data.rows) ? data.rows : [];
        const total = Number(data.total) || 0;
        // 无感轮询：数据没变就不动 tableData，避免整表无谓重渲染
        if (
          silent &&
          total === this.pagination.total &&
          JSON.stringify(rows) === JSON.stringify(this.tableData)
        ) {
          return;
        }
        this.tableData = rows;
        this.pagination.total = total;
      } catch (error) {
        if (seq !== this.fetchSeq) return;
        // 静默失败不打断使用，等下一轮轮询自愈
        if (silent) return;
        console.error("获取语音房列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.$message.error("获取语音房列表失败");
      } finally {
        this.pendingFetches -= 1;
        if (!silent && seq === this.fetchSeq) this.loading = false;
      }
    },
    handleSearch(formData) {
      this.filterForm = {
        roomId: formData.roomId || "",
        ownerUserId: formData.ownerUserId || "",
        ownerKeyword: formData.ownerKeyword || "",
        orderId: formData.orderId || "",
        status: formData.status || "",
        createTimeRange: Array.isArray(formData.createTimeRange)
          ? formData.createTimeRange
          : [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = {
        roomId: "",
        ownerUserId: "",
        ownerKeyword: "",
        orderId: "",
        status: "",
        createTimeRange: [],
      };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(pageNum) {
      this.pagination.pageNum = pageNum;
      this.fetchTableData();
    },
    previewAvatar(url) {
      if (!url) {
        this.$message.warning("头像不存在");
        return;
      }
      this.previewAvatarUrl = url;
      this.avatarDialogVisible = true;
    },
    async showRoomMembers(row) {
      this.currentMemberList = [];
      this.currentRoomId = row.roomId || "";
      this.memberDialogVisible = true;
      this.memberLoading = true;
      try {
        const res = await getVoiceRoomMemberList({ roomId: row.roomId });
        const data = this.getResponseData(res);
        this.currentMemberList = Array.isArray(data.members)
          ? data.members.slice(0, 8)
          : [];
      } catch (error) {
        console.error("获取语音房在线成员失败:", error);
        this.currentMemberList = [];
        this.$message.error("获取在线成员失败");
      } finally {
        this.memberLoading = false;
      }
    },
    closeMemberDialog() {
      this.memberDialogVisible = false;
      this.currentMemberList = [];
      this.currentRoomId = "";
    },
    /**
     * 巡查浮窗由 AppMain 上的常驻组件承载，页面只负责发出打开指令，
     * 这样切换路由时浮窗和 TRTC 连接都不会断。
     */
    inspectRoom(row) {
      openVoiceRoomPatrol(row);
    },
    async copyShareCode(row) {
      try {
        const res = await getVoiceRoomInviteCode({ roomId: row.roomId });
        const data = this.getResponseData(res);
        // 后端返回的真正口令字段是 inviteCode，shareText 可能只是展示文案，不能直接拿来复制。
        // 这里优先复制真实口令，兜底使用 shareText，避免复制成纯数字/无效文案。
        const text = String(data.shareText).trim();
        if (!text) {
          this.$message.warning("暂无可复制的分享口令");
          return;
        }
        await this.copyText(text);
        this.$message.success(data.shareText);
      } catch (error) {
        console.error("获取分享口令失败:", error);
        this.$message.error("获取分享口令失败");
      }
    },
    async copyText(text) {
      // 分享口令是先请求接口、再复制，中间隔着网络等待，会耗掉点击的用户手势。
      // Chrome 在这时候调 navigator.clipboard.writeText 会以 NotAllowedError 拒绝，
      // 剪贴板里只会留下空内容。所以这里两步走：
      // 1) 优先现代剪贴板 API，失败不抛错、直接降级；
      // 2) 降级到隐藏 textarea + document.execCommand("copy") 的兼容路径。
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (error) {
          console.warn("[voice-room] 剪贴板 API 写入失败，降级 execCommand 复制:", error && error.message);
        }
      }
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      input.style.top = "0";
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, text.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(input);
      if (!copied) {
        throw new Error("copy failed");
      }
    },
  },
};
</script>

<style scoped lang="scss">
.voice-room-page {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  background: #f4f5f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 28px;
    color: #1f2430;
    font-weight: 700;
  }
}

.search-module {
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border: 1px solid #ebeef5;
  border-radius: 16px;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0;
  box-sizing: border-box;
}

.table-wrapper {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.online-count-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.online-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  // min-width: 30px;
  // height: 30px;
  // padding: 0 10px;
  border-radius: 999px;
  // color: #2e7ef2;
  font-weight: 700;
  font-size: 15px;
  line-height: 1;
  box-sizing: border-box;
}

.online-count-text {
  color: #606266;
  font-size: 13px;
}

.count-view-btn {
  color: #3b82f6;
  font-weight: 600;
  padding: 0;
}

/* ===== 成员查看弹窗（高级样式） ===== */
::v-deep .voice-member-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);

  .el-dialog__header {
    padding: 18px 44px 18px 24px;
    background: linear-gradient(120deg, #4f46e5 0%, #7c3aed 55%, #2563eb 100%);
    border-bottom: none;
  }

  .el-dialog__title {
    line-height: 1;
  }

  .el-dialog__headerbtn .el-dialog__close {
    color: rgba(255, 255, 255, 0.85);
    font-size: 20px;

    &:hover {
      color: #fff;
    }
  }

  .el-dialog__body {
    padding: 20px 24px;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .el-dialog__footer {
    padding: 14px 24px 20px;
    background: #f8fafc;
    border-top: 1px solid #eef2f7;
  }
}

.member-dialog-title {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.member-dialog-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 20px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.member-dialog-title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.member-dialog-title-main {
  font-size: 17px;
  font-weight: 700;
}

.member-dialog-title-sub {
  font-size: 12px;
  opacity: 0.75;
}

.member-dialog-count {
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);

  em {
    font-size: 12px;
    font-style: normal;
    font-weight: 500;
    opacity: 0.8;
  }
}

.member-panel {
  min-height: 120px;
}

.member-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.member-panel-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2430;

  i {
    color: #4f46e5;
  }
}

.member-panel-hint {
  font-size: 12px;
  color: #94a3b8;
}

.member-panel-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    opacity: 0;
    transition: opacity 0.25s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(79, 70, 229, 0.12);
    border-color: #c7d2fe;

    &::before {
      opacity: 1;
    }
  }
}

.member-card-dot {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.member-card-avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  padding: 2px;
  // border: 2px solid transparent;
  background: linear-gradient(135deg, #6366f1, #a855f7) border-box;
  // -webkit-mask:
  //   linear-gradient(#fff 0 0) padding-box,
  //   linear-gradient(#fff 0 0);
  // -webkit-mask-composite: xor;
  mask-composite: exclude;
  cursor: pointer;
  transition: transform 0.25s;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: #f1f5f9;
  }

  &:hover {
    transform: scale(1.06);
  }
}

.member-card-info {
  min-width: 0;
  flex: 1;
}

.member-card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.member-card-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2430;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-card-role {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.1);
}

.member-card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.6;

  i {
    font-size: 13px;
  }
}

.member-dialog-empty {
  padding: 56px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.owner-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.owner-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #6a35ff;
    transform: scale(1.05);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.owner-text {
  text-align: left;
}

.owner-name {
  font-size: 14px;
  color: #222;
  font-weight: 600;
}

.owner-meta {
  font-size: 12px;
  color: #8b909a;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0;
  font-size: 12px;
}

.action-btn.inspection {
  color: #3b82f6;
}

.action-btn.copy {
  color: #7c3aed;
}

.action-empty {
  color: #c0c4cc;
}

.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
