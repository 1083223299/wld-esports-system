<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifyStore } from '../../../stores/notify';
import { TYPE_META } from '../../../api/notifySocket';
import { resolveNotifyTarget } from '../../../utils/notifyJump';
import { useToast } from '../../../composables/useToast';

/**
 * 系统通知（入口：右上角铃铛）
 * 数据源：GET /api/club/notifications（09-通知，后端真实接口，挂载时拉取）
 * - 顶部「仅看未读」开关（可选中 / 取消选中）+ 全部已读（逐个调用已读接口）
 * - 列表字段：类型标签（sceneLabel 优先）/ 标题 / 正文 / 相对时间（timeText 优先）/ 查看（点击=标记已读并跳转对应页面）
 * - 跳转规则（utils/notifyJump，2026-10-23 后端口径）：
 *   · jumpTarget=ORDER → 订单详情（详情页未建，暂跳订单列表并搜索 orderNo）
 *   · 本地 mock / 旧消息按类型：派单转单、订单交易关闭、卡单预警 → 订单列表并搜索（查不到报「订单不存在」）
 *   · 其余（抢单超时 / 钱包类）→ 图未标注跳转，仅标记已读
 * - 已读后 WebSocket 会推 type=UNREAD，铃铛角标（badge 字符串，超 99 为 99+）随之更新
 */
const notify = useNotifyStore();
const router = useRouter();
const { show } = useToast();

const onlyUnread = ref(false); // 仅看未读开关
const loading = ref(false); // 列表加载中

const filtered = computed(() =>
  onlyUnread.value ? notify.items.filter((i) => !i.read) : notify.items
);

/* ================= 时间显示（相对时间，如“2分钟前”） ================= */
function relativeTime(t) {
  if (!t) return '';
  const then = new Date(String(t).replace(/-/g, '/')).getTime();
  if (Number.isNaN(then)) return String(t);
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}天前`;
  return String(t).slice(0, 10);
}

/** 展示时间：后端已下发相对时间 timeText（刚刚/N分钟前/N小时前/N天前）时直接用，否则本地计算 */
function displayTime(item) {
  return item.timeText || relativeTime(item.time);
}

/* ================= 类型标签 ================= */
function typeLabel(item) {
  // 后端下发的场景名称优先（sceneLabel，如「订单超时提醒」），本地 mock 消息回退类型元信息
  return item.sceneLabel || TYPE_META[item.type]?.label || '系统通知';
}

/** 点击查看：未读 → 标记已读，并按需求图跳转规则跳转（无跳转仅标记已读） */
function handleView(item) {
  if (!item.read) notify.markRead(item.id);
  const target = resolveNotifyTarget(item);
  if (target) router.push(target);
}

function handleMarkAllRead() {
  if (!notify.unreadCount) return;
  notify.markAllRead();
  show('已全部标记为已读', 'success');
}

/** 拉取后端通知列表（失败时保留现有列表，错误已由 request.js toast） */
async function load() {
  loading.value = true;
  try {
    await notify.loadFromApi();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // 进入本页：清空气泡 + 拉取后端通知列表
  notify.clearBubbles();
  load();
});
</script>

<template>
  <div class="system-notify-page">
    <!-- 顶部工具条：仅看未读 + 全部已读 -->
    <div class="notify-toolbar">
      <el-checkbox v-model="onlyUnread" class="only-unread-check">仅看未读</el-checkbox>
      <div class="toolbar-right">
        <span v-if="notify.unreadCount" class="total-unread">未读 {{ notify.unreadCount }} 条</span>
        <!-- <button
          class="btn btn-plain btn-sm"
          type="button"
          :disabled="!notify.unreadCount"
          @click="handleMarkAllRead"
        >全部已读</button> -->
      </div>
    </div>

    <!-- 通知列表 -->
    <div v-loading="loading" class="notify-list">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="notify-item"
        :class="{ unread: !item.read }"
        @click="handleView(item)"
      >
        <div class="item-body">
          <div class="item-head">
            <span v-if="!item.read" class="unread-dot" title="未读" />
            <span class="type-chip" :class="TYPE_META[item.type]?.className">{{ typeLabel(item) }}</span>
            <strong class="item-title">{{ item.title }}</strong>
            <span class="item-time">{{ displayTime(item) }}</span>
          </div>
          <p class="item-content">{{ item.content }}</p>
        </div>

        <button
          class="btn btn-primary btn-sm view-btn"
          type="button"
          @click.stop="handleView(item)"
        >查看</button>
      </div>

      <el-empty v-if="!filtered.length" :description="onlyUnread ? '暂无未读通知' : '暂无通知'" />
    </div>
  </div>
</template>

<style scoped>
.system-notify-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 16px 20px 24px;
  box-sizing: border-box;
  /* 工具条固定：页面不整体滚动，列表区独立滚动 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 顶部工具条（固定，不随列表滚动） ===== */
.notify-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border-radius: 14px;
  padding: 12px 20px;
  margin-bottom: 14px;
  box-shadow: 0 6px 18px rgba(30, 41, 59, 0.05);
  z-index: 2;
}

.only-unread-check {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-unread {
  font-size: 12px;
  color: var(--status-danger);
  font-weight: 600;
}

/* ===== 通知列表（独立滚动区） ===== */
.notify-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notify-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid rgba(132, 146, 176, 0.12);
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(30, 41, 59, 0.05);
  cursor: pointer;
  transition: all 0.18s ease;
}

.notify-item:hover {
  border-color: var(--primary-glow-strong);
  box-shadow: 0 10px 24px var(--primary-faint);
}

.notify-item.unread {
  background: linear-gradient(180deg, var(--primary-tint), var(--bg-elevated));
  border-color: var(--primary-border-strong);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-size: 14px;
  color: var(--text-main);
}

/* ===== 类型标签 ===== */
.type-chip {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.8;
  color: var(--status-muted);
  background: var(--status-muted-bg);
}

.type-chip.is-stuck { color: var(--status-danger); background: var(--status-danger-bg); }
.type-chip.is-system { color: var(--status-muted); background: var(--status-muted-bg); }
.type-chip.is-order-timeout { color: var(--status-warning); background: var(--status-warning-bg); }
.type-chip.is-order-dispatch { color: var(--status-info); background: var(--status-info-bg); }
.type-chip.is-order-closed { color: var(--status-muted); background: var(--status-muted-bg); }
.type-chip.is-wallet-deduct { color: var(--status-warning); background: var(--status-warning-bg); }
.type-chip.is-withdraw-fail { color: var(--status-danger); background: var(--status-danger-bg); }

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-danger);
  flex-shrink: 0;
  box-shadow: 0 0 0 3px var(--status-danger-bg);
}

.item-time {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-sub);
}

.item-content {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main);
  word-break: break-all;
}

.view-btn {
  flex-shrink: 0;
}

/* ===== 按钮（沿用项目主按钮风格） ===== */
.btn {
  border: none;
  border-radius: 10px;
  padding: 9px 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: filter 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, opacity 0.18s ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  box-shadow: 0 10px 20px var(--primary-glow-strong);
}

.btn-primary:hover {
  filter: brightness(1.06);
}

.btn-plain {
  background: var(--bg-hover);
  color: var(--text-sub);
}

.btn-plain:hover:not(:disabled) {
  background: var(--border-faint);
}

.btn-plain:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 8px;
}
</style>
