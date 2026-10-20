<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifyStore } from '../../../stores/notify';
import { TYPE_META } from '../../../api/notifySocket';
import { resolveNotifyTarget } from '../../../utils/notifyJump';
import { useToast } from '../../../composables/useToast';

/**
 * 系统通知（入口：右上角铃铛）
 * 按消息通知列表需求图实现：
 * - 顶部「仅看未读」开关（可选中 / 取消选中）+ 全部已读
 * - 列表字段：类型标签 / 标题 / 正文 / 时间 / 查看（点击=标记已读并跳转对应页面）
 * - 跳转规则（utils/notifyJump）：
 *   · 派单转单、订单交易关闭 → 订单列表并搜索该订单（查不到报「订单不存在」）
 *   · 抢单超时回流、钱包类（转单扣款/提现失败）→ 图未标注跳转，仅标记已读
 */
const notify = useNotifyStore();
const router = useRouter();
const { show } = useToast();

const onlyUnread = ref(false); // 仅看未读开关

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

/* ================= 类型标签 ================= */
function typeLabel(item) {
  return TYPE_META[item.type]?.label || '系统通知';
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

onMounted(() => {
  // 进入本页：清空气泡
  notify.clearBubbles();
});
</script>

<template>
  <div class="system-notify-page">
    <!-- 顶部工具条：仅看未读 + 全部已读 -->
    <div class="notify-toolbar">
      <el-checkbox v-model="onlyUnread" class="only-unread-check">仅看未读</el-checkbox>
      <div class="toolbar-right">
        <span v-if="notify.unreadCount" class="total-unread">未读 {{ notify.unreadCount }} 条</span>
        <button
          class="btn btn-plain btn-sm"
          type="button"
          :disabled="!notify.unreadCount"
          @click="handleMarkAllRead"
        >全部已读</button>
      </div>
    </div>

    <!-- 通知列表 -->
    <div class="notify-list">
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
            <span class="item-time">{{ relativeTime(item.time) }}</span>
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
