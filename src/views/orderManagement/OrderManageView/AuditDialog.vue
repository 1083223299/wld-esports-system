<script setup>
import { computed, onMounted, reactive, watch } from 'vue';
import { useToast } from '../../../composables/useToast';
import { orderApi, slotSourceText } from '../../../api/modules/order';
import { STATUS_CLASS } from './mockData';
import OrderLogTimeline from './OrderLogTimeline.vue';

/**
 * 订单审核弹窗内容（接口联调 + 原型 UI 恢复）
 * 提交接口：POST /api/admin/orders/{id}/audit（pass 必填，驳回必填 reason 最多50字）
 * - 数据来源：订单详情（platformAdjust/clubAdjust/settleDueAt 等）+ 订单日志（logs）
 *   + POST /api/admin/orders/{id}/profit-details（订单分润明细）
 * - 完成凭证：coverUrl 首图 / endUrl 尾图 / progressUrls 进程图（接口已返回）
 */
const props = defineProps({
  row: { type: Object, required: true },
  logs: { type: Array, default: () => [] },
});
const emit = defineEmits(['submit']);

const { show } = useToast();

const money = (value) => (Number(value) || 0).toFixed(2);

const form = reactive({ result: '通过', reason: '' });

watch(
  () => props.row,
  () => {
    form.result = '通过';
    form.reason = '';
  },
  { immediate: true }
);

/** 加减价净值展示：减价为负 */
const adjustText = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0.00元';
  return `${n > 0 ? '+' : '-'}${money(Math.abs(n))}元`;
};

/* ===== 分润明细（POST /api/admin/orders/{id}/profit-details） ===== */
const profitState = reactive({ loading: false, data: null, error: '' });

const split = computed(() => {
  const d = profitState.data;
  if (!d || d.available === false) return null;
  const profit = d.profit || d;
  const sharesPlayerAmount = (d.shares || [])
    .filter((s) => s.ownerType === 'PLAYER')
    .reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tailAmount) || 0), 0);
  const playerAmount = profit.playerAmount ?? d.playerAmount ?? sharesPlayerAmount;
  const dispatchAmount =
    props.row.dispatchAmount ?? d.dispatchAmount ?? profit.clubAmount ?? d.clubAmount;
  return {
    platform: profit.platformAmount ?? d.platformAmount,
    club: profit.clubRetain ?? d.clubRetain,
    player: playerAmount,
    dispatch: dispatchAmount,
  };
});

const splitMoney = (value) =>
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? '—'
    : money(value);

async function loadProfit() {
  if (!props.row.id) return;
  profitState.loading = true;
  try {
    profitState.data = await orderApi.profitDetail(props.row.id);
    if (profitState.data && profitState.data.available === false) {
      profitState.error = '分润未锁定，暂无可展示明细';
    }
  } catch (e) {
    profitState.error = e?.message || '分润明细加载失败';
  } finally {
    profitState.loading = false;
  }
}

onMounted(loadProfit);

/** 完成凭证：进行中/已完成/交易关闭 展示（coverUrl/endUrl/progressUrls，接口已返回） */
const hasProof = computed(() => ['进行中', '已完成', '交易关闭'].includes(props.row.status));
const proofPreviewList = computed(() => [
  props.row.proofFirst,
  props.row.proofLast,
  ...(props.row.proofProcess || []),
].filter(Boolean));
const proofLastPreviewIndex = computed(() => Number(Boolean(props.row.proofFirst)));
const proofProcessPreviewStartIndex = computed(
  () => Number(Boolean(props.row.proofFirst)) + Number(Boolean(props.row.proofLast))
);

/* 打手信息（slots：playerName/clubName/takenAt/transferredAt 后端已补齐；
   展示规则：transferredAt 空 → 接单时间，有值 → 转单时间，转出的排后面） */
const players = computed(() => {
  const list = (props.row.slots || []).map((s) => ({
    slotNo: s.slotNo,
    playerId: s.playerId,
    playerName: s.playerName || '',
    clubName: s.clubName || '',
    clubId: s.clubId,
    source: slotSourceText(s.source),
    takenAt: s.takenAt || '',
    transferredAt: s.transferredAt || '',
  }));
  return list
    .slice()
    .sort((a, b) => (a.transferredAt ? 1 : 0) - (b.transferredAt ? 1 : 0) || a.slotNo - b.slotNo);
});

/** 客户端文案：多端按逗号拆分后顿号拼接 */
const clientsText = computed(() =>
  props.row.clients ? String(props.row.clients).split(/[,，]/).filter(Boolean).join('、') : '—'
);

/** 用户自定义下单：不展示游戏规格字段（与查看弹窗口径一致） */
const isCustomOrder = computed(
  () => props.row.orderModeCode === 'CUSTOM' || props.row.orderMode === '用户自定义下单'
);

/* ===== 复制 ===== */
async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(String(text));
  } catch {
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  show('已复制', 'success');
}

function submit() {
  if (form.result === '驳回' && !form.reason.trim()) {
    return show('请填写驳回原因', 'warning');
  }
  emit('submit', { pass: form.result === '通过', reason: form.result === '驳回' ? form.reason.trim() : '' });
}

defineExpose({ submit });
</script>

<template>
  <div class="audit-dialog">
    <!-- 支付凭证（仅平台内部可见） -->
    <section v-if="row.payVoucherUrl" class="au-section">
      <h4>支付凭证（仅平台内部可见）</h4>
      <el-image
        :src="row.payVoucherUrl"
        style="width: 120px; height: 120px"
        fit="contain"
        alt="支付凭证"
        :preview-src-list="[row.payVoucherUrl]"
        preview-teleported
      />
    </section>

    <div class="au-owner">所属客服：{{ row.claimerName || '—' }} ({{ row.claimerCorp || '—' }})</div>

    <!-- 订单信息 -->
    <section class="au-section">
      <h4>订单信息</h4>
      <div class="kv-grid">
        <div class="kv">
          <span>订单号</span>
          <strong class="copyable" role="button" tabindex="0" aria-label="复制订单号" title="复制" @click="copyText(row.orderNo)" @keydown.enter="copyText(row.orderNo)">
            {{ row.orderNo }}<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
          </strong>
        </div>
        <div class="kv">
          <span>第三方订单号</span>
          <strong class="copyable" role="button" tabindex="0" aria-label="复制第三方订单号" title="复制" @click="copyText(row.thirdOrderNo)" @keydown.enter="copyText(row.thirdOrderNo)">
            {{ row.thirdOrderNo }}<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
          </strong>
        </div>
        <div class="kv"><span>渠道</span><strong>{{ row.channel || '—' }}</strong></div>
        <div class="kv"><span>游戏名称</span><strong>{{ row.gameName || '—' }}</strong></div>
        <div class="kv"><span>购买项目</span><strong>{{ row.product || '—' }}</strong></div>
        <!-- 原型：自定义下单时不展示游戏规格字段 -->
        <div v-if="!isCustomOrder" class="kv"><span>游戏规格</span><strong>{{ row.spec || '—' }}</strong></div>
        <div class="kv"><span>订单类型</span><strong>{{ row.orderType || '—' }}</strong></div>
        <div class="kv"><span>下单方式</span><strong>{{ row.orderMode || '—' }}</strong></div>
        <div v-if="row.dispatchKefuName" class="kv"><span>派单客服</span><strong>{{ row.dispatchKefuName }}</strong></div>
        <div class="kv"><span>客户端</span><strong>{{ clientsText }}</strong></div>
        <div class="kv"><span>打手人数</span><strong>{{ row.playerCount != null ? row.playerCount : '—' }}</strong></div>
        <div class="kv">
          <span>订单状态</span>
          <strong><span class="status-badge" :class="STATUS_CLASS[row.status] || 'status-info'">{{ row.status }}</span></strong>
        </div>
        <div class="kv">
          <span>组队码</span>
          <strong v-if="row.groupCode" class="copyable" role="button" tabindex="0" aria-label="复制组队码" title="复制" @click="copyText(row.groupCode)" @keydown.enter="copyText(row.groupCode)">
            {{ row.groupCode }}<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
          </strong>
          <strong v-else>—</strong>
        </div>
        <div class="kv">
          <span>角色名</span>
          <strong v-if="row.roleName" class="copyable" role="button" tabindex="0" aria-label="复制角色名" title="复制" @click="copyText(row.roleName)" @keydown.enter="copyText(row.roleName)">
            {{ row.roleName }}<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
          </strong>
          <strong v-else>—</strong>
        </div>
        <div class="kv"><span>创单时间</span><strong>{{ row.createTime || '—' }}</strong></div>
        <div class="kv">
          <span>订单金额(元)</span>
          <strong>
            {{ money(row.amount) }}
            <small v-if="row.originalAmount != null">（标价 {{ money(row.originalAmount) }}）</small>
          </strong>
        </div>
        <template v-if="row.dispatchTypeCode === 'DAILIANTONG'">
          <div class="kv"><span>派单方式</span><strong>代练通</strong></div>
          <div class="kv"><span>订单号（代练通）</span><strong>{{ row.dltOrderNo || '—' }}</strong></div>
          <div class="kv"><span>派单价格（代练通）</span><strong>{{ row.dltDispatchPrice != null ? money(row.dltDispatchPrice) : '—' }}</strong></div>
          <div class="kv"><span>代练通确认时间</span><strong>{{ row.dltConfirmedAt || '—' }}</strong></div>
        </template>
      </div>
      <div class="kv-line">
        <span>企微群二维码</span>
        <el-image
          v-if="row.groupQrUrl"
          :src="row.groupQrUrl"
          class="qr-img"
          alt="企微群二维码"
          fit="cover"
          :preview-src-list="[row.groupQrUrl]"
          preview-teleported
        />
        <strong v-else class="muted-text">暂无上传</strong>
      </div>
    </section>

    <!-- 打手信息（slots：playerName/clubName/takenAt/transferredAt，后端已补齐） -->
    <section v-if="players.length" class="au-section">
      <h4>打手信息</h4>
      <div class="player-grid">
        <div v-for="p in players" :key="`${p.slotNo}-${p.playerId}`" class="player-card">
          <div class="player-line">
            <strong>{{ p.playerName || '未命名打手' }}（{{ p.playerId }}）</strong>
            <span>{{ p.clubName || '—' }}{{ p.clubId ? `（${p.clubId}）` : '' }}</span>
            <span class="player-time">{{ p.transferredAt ? `转单时间：${p.transferredAt}` : `接单时间：${p.takenAt || '—'}` }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 分润信息（POST /api/admin/orders/{id}/profit-details，未锁定分润时 available=false） -->
    <section class="au-section">
      <h4>分润信息</h4>
      <div class="kv-grid">
        <div class="kv"><span>平台加价/减价</span><strong>{{ adjustText(row.platformAdjust) }}</strong></div>
        <div class="kv"><span>俱乐部加价/减价</span><strong>{{ adjustText(row.clubAdjust) }}</strong></div>
        <div class="kv"><span>结算到期时间</span><strong>{{ row.settleDueAt || '—' }}</strong></div>
        <div class="kv"><span>账期天数</span><strong>{{ row.settleDaysSnapshot != null ? `${row.settleDaysSnapshot}天` : '—' }}</strong></div>
        <template v-if="profitState.loading">
          <div class="kv"><span>分润明细</span><strong class="muted-text">加载中…</strong></div>
        </template>
        <template v-else-if="split">
          <div class="kv"><span>平台分润(元)</span><strong>{{ splitMoney(split.platform) }}</strong></div>
          <div class="kv"><span>俱乐部分润(元)</span><strong>{{ splitMoney(split.club) }}</strong></div>
          <div class="kv"><span>打手分润(元)</span><strong>{{ splitMoney(split.player) }}</strong></div>
          <div class="kv"><span>派单价(元)</span><strong>{{ splitMoney(split.dispatch) }}</strong></div>
        </template>
        <template v-else>
          <div class="kv"><span>分润明细</span><strong class="muted-text">{{ profitState.error || '分润未锁定' }}</strong></div>
        </template>
      </div>
    </section>

    <!-- 订单日志 -->
    <section class="au-section">
      <h4>订单日志</h4>
      <OrderLogTimeline :logs="logs" />
    </section>

    <!-- 完成凭证（coverUrl 首图 / endUrl 尾图 / progressUrls 进程图，接口已返回） -->
    <section class="au-section">
      <h4>完成凭证</h4>
      <div v-if="hasProof" class="proof-grid">
        <div class="proof-box">
          <span>首图</span>
          <el-image
            v-if="row.proofFirst"
            :src="row.proofFirst"
            alt="首图"
            fit="contain"
            :preview-src-list="proofPreviewList"
            :initial-index="0"
            preview-teleported
          />
          <em v-else>未上传</em>
          <em v-if="row.proofFirst">{{ row.proofUploadTime }} 上传</em>
        </div>
        <div class="proof-box">
          <span>尾图</span>
          <el-image
            v-if="row.proofLast"
            :src="row.proofLast"
            alt="尾图"
            fit="contain"
            :preview-src-list="proofPreviewList"
            :initial-index="proofLastPreviewIndex"
            preview-teleported
          />
          <em v-else>未上传</em>
          <em v-if="row.proofLast">{{ row.proofUploadTime }} 上传</em>
        </div>
        <div class="proof-box">
          <span>进程图</span>
          <div v-if="row.proofProcess && row.proofProcess.length" class="proof-imgs">
            <el-image
              v-for="(img, i) in row.proofProcess"
              :key="i"
              :src="img"
              alt="进程图"
              fit="cover"
              :preview-src-list="proofPreviewList"
              :initial-index="proofProcessPreviewStartIndex + i"
              preview-teleported
            />
          </div>
          <em v-else>未上传</em>
          <em v-if="row.proofProcess && row.proofProcess.length">{{ row.proofUploadTime }} 上传</em>
        </div>
      </div>
      <p v-else class="muted-text">暂无数据</p>
    </section>

    <!-- 打单备注（字段接口未提供，兜底展示） -->
    <section class="au-section">
      <h4>打单备注</h4>
      <div class="kv-line"><span>打手备注</span><strong>{{ row.playerRemark || '暂无' }}</strong></div>
      <div v-if="row.lastRejectReason || row.rejectCount" class="kv-line">
        <span>上次驳回原因</span><strong class="reject-text">{{ row.lastRejectReason || '—' }}</strong>
      </div>
    </section>

    <!-- 审核结果 -->
    <section class="au-section">
      <h4>审核结果</h4>
      <div class="form-row">
        <label class="required">审核结果</label>
        <el-radio-group v-model="form.result">
          <el-radio value="通过">通过</el-radio>
          <el-radio value="驳回">驳回</el-radio>
        </el-radio-group>
      </div>
      <div class="form-row">
        <label :class="{ required: form.result === '驳回' }">驳回原因</label>
        <textarea
          v-model="form.reason"
          rows="3"
          maxlength="50"
          :disabled="form.result === '通过'"
          placeholder="驳回时必填，0/50字"
        ></textarea>
        <div class="char-count">{{ form.reason.length }}/50</div>
      </div>
    </section>

    <!-- 订单备注 -->
    <section class="au-section">
      <h4>订单备注</h4>
      <p class="muted-text">{{ row.remark || '暂无备注' }}</p>
    </section>
  </div>
</template>

<style scoped>
.audit-dialog {
  display: grid;
  gap: 16px;
  max-height: 62vh;
  overflow: auto;
  padding-right: 4px;
}

.au-section {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
}

.au-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  padding-left: 8px;
  border-left: 3px solid var(--primary);
  line-height: 1.2;
}

.au-owner {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
}

.kv,
.kv-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.kv span,
.kv-line span {
  flex: 0 0 auto;
  color: var(--text-sub);
  font-size: 12px;
}

.kv strong,
.kv-line strong {
  min-width: 0;
  color: var(--text-main);
  font-size: 12.5px;
  font-weight: 500;
  word-break: break-all;
}

/* 可复制字段 */
.copyable {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-bottom: 1px dashed transparent;
  transition: border-color 0.15s ease;
}

.copyable:hover {
  border-bottom-color: var(--primary);
}

.copyable svg {
  width: 15px;
  height: 15px;
  color: var(--primary);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: 0 0 auto;
}

/* 订单状态徽章 */
.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-success { color: #0f9f6e; background: rgba(15, 159, 110, 0.08); }
.status-warning { color: #b45309; background: rgba(180, 83, 9, 0.08); }
.status-info { color: #1d4ed8; background: rgba(29, 78, 216, 0.08); }
.status-progress { color: #6d28d9; background: rgba(139, 92, 246, 0.12); }
.status-danger { color: #d92d20; background: rgba(217, 45, 32, 0.08); }
.status-muted { color: #475467; background: rgba(71, 84, 103, 0.08); }

/* 企微群二维码缩略图 */
.qr-img {
  width: 96px;
  height: 72px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.reject-text {
  color: #d92d20 !important;
}

/* 打手信息卡片 */
.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.player-card {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-sub);
}

.player-card strong {
  color: var(--text-main);
  font-size: 13px;
}

/* 打手卡片一行三段：姓名（ID）｜俱乐部（ID）｜接单/转单时间 */
.player-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.player-line strong::after {
  content: '｜';
  margin-left: 8px;
  color: var(--text-faint);
  font-weight: 400;
}

.player-time {
  color: var(--text-faint);
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.form-row label {
  flex: 0 0 72px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 32px;
}

.form-row label.required::before {
  content: '*';
  color: #d92d20;
  margin-right: 2px;
}

.form-row textarea {
  flex: 1;
  width: 100%;
  min-height: 88px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main);
  box-sizing: border-box;
  background: var(--input-bg);
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.form-row textarea:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.form-row textarea::placeholder {
  color: var(--input-placeholder);
}

.char-count {
  text-align: right;
  color: var(--text-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.muted-text {
  color: var(--text-faint);
  font-size: 12.5px;
  margin: 0;
}

.form-tip {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.28);
  color: var(--warning-text);
  font-size: 12px;
  line-height: 1.8;
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.proof-box {
  display: grid;
  gap: 6px;
  padding: 12px 10px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  text-align: center;
  background: var(--bg-card);
}

.proof-box span {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.proof-box .el-image {
  max-width: 100%;
  max-height: 90px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.proof-box em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-faint);
}

.proof-imgs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.proof-imgs .el-image {
  width: 64px;
  height: 48px;
}
</style>
