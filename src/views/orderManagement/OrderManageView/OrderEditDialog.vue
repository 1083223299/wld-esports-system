<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '../../../composables/useToast';
import { TYPE_OPTIONS, slotSourceText, orderApi } from '../../../api/modules/order';
import { fileApi } from '../../../api/modules/file';
import { CLIENT_OPTIONS, STATUS_CLASS } from './mockData';
import OrderLogTimeline from './OrderLogTimeline.vue';

/**
 * 订单编辑弹窗内容（接口联调 + 原型 UI 恢复，依据最新 OpenAPI 2026-10-21）
 * 保存接口：POST /api/admin/orders/{id}/maintain 维护订单信息
 * 支持字段：gameId / specId / clients / orderType / roleName / teamCode / remark / systemRemark（人数只读）
 *          systemRemark 为平台内部备注，最多 200 字；空串清除，与派单备注 remark 分开保存
 *          / amount（订单金额，单位元；不传保持原值；已退款订单不能改）
 *          / insuranceSlots（保险格数，可选；不传保持原值）
 *          / clubNetPrice（特殊规格到手价，仅 requireClubNetPrice 时必填；不参与分润）
 *          / groupQrUrl（企业群二维码；先 fileApi.upload 拿 url 再提交；传空串清除，不传保持原值）
 * - 所属客服（领取人）：本弹窗只读展示，不在此修改；修改入口在列表「领取人」列行内铅笔，
 *   独立弹窗调 PUT /{id}/owner（仅管理员）
 * - 分润信息：POST /api/admin/orders/{id}/profit-details（未接单/分润未锁定时不展示数值）
 * - 打手信息来自 slots（后端已补齐 playerName/clubName/takenAt/transferredAt）；
 *   展示规则：transferredAt 空 → 接单时间，有值 → 转单时间，转出的打手排后面
 */
const props = defineProps({
  row: { type: Object, required: true },
  catalog: { type: Array, default: () => [] }, // [{ id, name, specs: [{ id, name }] }]
  logs: { type: Array, default: () => [] },
  editApproval: { type: Object, default: null },
  claimMode: { type: Boolean, default: false },
});
const emit = defineEmits(['save', 'request-edit']);

const { show } = useToast();
const editApprovalLabel = computed(() => ({
  PENDING: '编辑审批中',
  APPROVED: '已同意',
  REJECTED: '已驳回',
}[props.editApproval?.status] || ''));

const money = (value) => (Number(value) || 0).toFixed(2);
const proofPreviewList = computed(() => [
  props.row.proofFirst,
  props.row.proofLast,
  ...(props.row.proofProcess || []),
].filter(Boolean));
const proofLastPreviewIndex = computed(() => Number(Boolean(props.row.proofFirst)));
const proofProcessPreviewStartIndex = computed(
  () => Number(Boolean(props.row.proofFirst)) + Number(Boolean(props.row.proofLast))
);
const gameOptions = computed(() => props.catalog.map((g) => ({ label: g.name, value: g.id })));

const specOptions = computed(() => {
  const game = props.catalog.find((g) => Number(g.id) === Number(form.gameId));
  return game ? game.specs.map((s) => ({ label: s.name, value: s.id })) : [];
});

const orderStatus = computed(() => props.row.statusCode || props.row.status);
const isProgress = computed(() => ['进行中', 'IN_PROGRESS'].includes(orderStatus.value));
const isDispatchPending = computed(() => ['待派单', 'WAIT_DISPATCH'].includes(orderStatus.value));
const isStored = computed(() => Boolean(props.row.depositStored || props.row.hold?.stored));
const isHoldOnlyOrder = computed(() =>
  isStored.value || (!props.claimMode && ['待领取', 'WAIT_CLAIM'].includes(orderStatus.value))
);
const isOrderDetailsLocked = computed(() =>
  isHoldOnlyOrder.value || ['待接单', 'WAIT_TAKE', '进行中', 'IN_PROGRESS'].includes(orderStatus.value)
);
const isDelta = computed(() => props.row.hold?.form ? props.row.hold.form === 'WARRANTY' : props.row.gameName === '三角洲行动');
const canDisplayHold = computed(() => !props.claimMode && (isStored.value || (
    !props.row.afterSale &&
    !(props.row.tags || []).includes('售后中') &&
    !['已完成', '已关闭', '交易关闭', 'COMPLETED', 'CLOSED'].includes(orderStatus.value)
)));
const canManageHold = computed(() => props.row.hold?.editable === true && canDisplayHold.value);
const holdEditable = computed(() => canManageHold.value && !isStored.value);
const hasProof = computed(() => ['进行中', '已完成', '交易关闭'].includes(props.row.status));
const selectedSpecRequiresClubNetPrice = computed(() => {
  const game = props.catalog.find((item) => Number(item.id) === Number(form.gameId));
  const spec = game?.specs.find((item) => String(item.id) === String(form.specId));
  return spec?.requireClubNetPrice === true;
});
const requiresClubNetPrice = computed(() => {
  const selectedSpecId = String(form.specId ?? '');
  const originalSpecId = String(props.row.specId ?? '');
  return (
    selectedSpecRequiresClubNetPrice.value ||
    (props.row.requireClubNetPrice === true && selectedSpecId === originalSpecId)
  );
});

/* ===== 分润信息（POST /api/admin/orders/{id}/profit-details；未接单/未锁定时不展示数值） ===== */
const profitState = reactive({ loading: false, data: null, error: '' });
let profitLoadRevision = 0;

const split = computed(() => {
  const d = profitState.data;
  if (!d || d.available === false) return null;
  const playerAmount = (d.shares || [])
    .filter((s) => s.ownerType === 'PLAYER')
    .reduce((sum, s) => sum + (Number(s.amount) || 0) + (Number(s.tailAmount) || 0), 0);
  const clubAdjust = Number(d.clubAdjust) || 0;
  return {
    platform: money(d.platformAmount),
    club: money(d.clubRetain),
    player: money(playerAmount),
    playerBase: money(playerAmount - clubAdjust),
    playerExtra: clubAdjust > 0 ? money(clubAdjust) : null,
  };
});

async function loadProfit() {
  const revision = ++profitLoadRevision;
  const orderId = props.row.id;
  profitState.data = null;
  profitState.error = '';
  if (!orderId) {
    profitState.loading = false;
    return;
  }
  profitState.loading = true;
  try {
    const data = await orderApi.profitDetail(orderId);
    if (revision !== profitLoadRevision) return;
    profitState.data = data;
    if (data?.available === false) {
      profitState.error = '分润未锁定，暂无可展示明细';
    }
  } catch (e) {
    if (revision === profitLoadRevision) {
      profitState.error = e?.message || '分润明细加载失败';
    }
  } finally {
    if (revision === profitLoadRevision) profitState.loading = false;
  }
}

watch(() => props.row, loadProfit, { immediate: true });
/* 已退款订单不允许修改金额（接口约束） */
const isRefunded = computed(() => !!props.row.refunded || Number(props.row.refundedAmount) > 0);

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
  // 展示规则（后端口径）：当前在单的打手排前面（无转单时间），被转出的排后面并带转单时间
  return list
    .slice()
    .sort((a, b) => (a.transferredAt ? 1 : 0) - (b.transferredAt ? 1 : 0) || a.slotNo - b.slotNo);
});

/** 加减价净值展示：减价为负 */
const adjustText = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0.00元';
  return `${n > 0 ? '+' : '-'}${money(Math.abs(n))}元`;
};

const form = reactive({
  gameId: '',
  specId: '',
  clients: [],
  orderType: '',
  roleName: '',
  teamCode: '', // 组队码：maintain 已支持（新 OpenAPI），随保存提交
  remark: '',
  systemRemark: '',
  /* 订单金额（元）：maintain 支持 amount；不传保持原值，已退款不可改 */
  amount: '',
  clubNetPrice: '',
  insuranceSlots: '',
  /* 企业群二维码：maintain 支持 groupQrUrl；先 fileApi.upload 拿 url 再提交，传空串清除 */
  groupQrUrl: '',
  /* ---- 存单字段：后端详情已返回（hold.shots 等，经 mapOrderRow 映射）；maintain 不携带，提交不提交 ---- */
  depositTarget: '1000',
  depositReason: '',
  depositFirst: '500',
  depositSecond: '500',
  depositImages: [],
  depositRemark: '',
  depositStored: false,
});

watch(
  () => props.row,
  (row) => {
    if (!row) return;
    Object.assign(form, {
      gameId: row.gameId ?? '',
      specId: row.specId ?? '',
      clients: row.clients ? String(row.clients).split(/[,，]/).filter(Boolean) : [],
      orderType: row.orderTypeCode === 'SPECIAL' ? 'DISCOUNT' : (row.orderTypeCode || 'NORMAL'), // 历史 SPECIAL 归一化为规范码 DISCOUNT
      roleName: row.roleName || '',
      teamCode: row.teamCode || row.groupCode || '',
      remark: row.remark || '',
      systemRemark: row.systemRemark || '',
      amount: row.amount ?? '',
      clubNetPrice: row.clubNetPrice ?? '',
      insuranceSlots: row.insuranceSlots ?? '',
      groupQrUrl: row.groupQrUrl || '',
      depositTarget: row.depositTarget ?? '',
      depositReason: row.depositReason || '',
      depositFirst: row.depositFirst ?? '',
      depositSecond: row.depositSecond ?? '',
      depositImages: [...(row.depositImages || [])],
      depositRemark: row.depositRemark || '',
      depositStored: Boolean(row.depositStored || row.hold?.stored),
    });
  },
  { immediate: true, deep: true }
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

/* ===== 图片上传：企业群二维码和存单截图均先上传文件，再随对应接口提交 URL ===== */
const qrUploading = ref(false);

async function uploadQrImage(file) {
  if (!file || qrUploading.value || isHoldOnlyOrder.value) return;
  if (!file.type.startsWith('image/')) return show('请选择图片文件', 'warning');
  qrUploading.value = true;
  try {
    const res = await fileApi.upload(file);
    if (!res?.url) return show('二维码上传未返回图片地址，请重试', 'error');
    form.groupQrUrl = res.url;
    show('图片已上传', 'success');
  } catch {
    /* 错误提示由 request.js 统一弹出 */
  } finally {
    qrUploading.value = false;
  }
}

function uploadSingle(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  return uploadQrImage(file);
}

function pasteQrImage(event) {
  if (isHoldOnlyOrder.value) return;
  const item = Array.from(event.clipboardData?.items || []).find(
    (item) => item.kind === 'file' && item.type.startsWith('image/')
  );
  const file = item?.getAsFile();
  if (!file) return;
  event.preventDefault();
  return uploadQrImage(file);
}

function dropQrImage(event) {
  if (isHoldOnlyOrder.value) return;
  const files = Array.from(event.dataTransfer?.files || []);
  return uploadQrImage(files.find((file) => file.type.startsWith('image/')) || files[0]);
}

function removeQr() {
  if (qrUploading.value || isHoldOnlyOrder.value) return;
  form.groupQrUrl = '';
}

function handleGameChange() {
  form.specId = '';
  form.clubNetPrice = '';
}

function handleSpecChange() {
  form.clubNetPrice = '';
}

const depositUploading = ref(false);

async function uploadDeposit(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!holdEditable.value || depositUploading.value) return;
  if (files.length > 5 - form.depositImages.length) return show('剩余保底截图最多5张', 'warning');
  if (files.some((file) => !file.type.startsWith('image/'))) return show('请选择图片文件', 'warning');
  depositUploading.value = true;
  try {
    for (const file of files) {
      const result = await fileApi.upload(file);
      if (!result?.url) return show('截图上传未返回图片地址，请重试', 'error');
      form.depositImages.push(result.url);
    }
  } catch {
    // 请求层提示错误；已上传图片保留，便于重试。
  } finally {
    depositUploading.value = false;
  }
}

function submit() {
  if (depositUploading.value) return show('请等待存单截图上传完成', 'warning');
  if (qrUploading.value) return show('请等待二维码上传完成后再保存', 'warning');
  if (!isHoldOnlyOrder.value && !isProgress.value && !isDispatchPending.value && !form.gameId) return show('请选择游戏名称', 'warning');
  if (!isHoldOnlyOrder.value && !isProgress.value && !isDispatchPending.value && !form.specId) return show('请选择游戏规格', 'warning');
  let clubNetPrice;
  if (!isHoldOnlyOrder.value && requiresClubNetPrice.value) {
    const priceText = String(form.clubNetPrice).trim();
    const price = Number(priceText);
    if (!priceText || !Number.isFinite(price) || price <= 0 || !/^\d+(\.\d{1,2})?$/.test(priceText)) {
      return show('请输入大于0且最多两位小数的到手价', 'warning');
    }
    clubNetPrice = price;
  }
  let insuranceSlots;
  if (!isHoldOnlyOrder.value && String(form.insuranceSlots).trim() !== '') {
    const count = Number(form.insuranceSlots);
    if (!Number.isInteger(count) || count < 0) return show('保险格数需为大于或等于0的整数', 'warning');
    insuranceSlots = count;
  }
  // 金额：不传保持原值；已退款订单不能改（前端禁用输入兜底）
  let amount;
  if (!isHoldOnlyOrder.value && !isProgress.value && !isDispatchPending.value && !isRefunded.value && String(form.amount).trim() !== '') {
    const n = Number(form.amount);
    if (!Number.isFinite(n) || n < 0) return show('请输入正确的订单金额', 'warning');
    amount = n;
  }
  let holdUpdate;
  const hold = props.row.hold || {};
  const wasStored = Boolean(props.row.depositStored || hold.stored);
  const depositChanged = form.depositReason !== (props.row.depositReason || '') ||
    form.depositRemark !== (props.row.depositRemark || '') ||
    String(form.depositTarget) !== String(props.row.depositTarget ?? '') ||
    String(form.depositFirst) !== String(props.row.depositFirst ?? '') ||
    String(form.depositSecond) !== String(props.row.depositSecond ?? '') ||
    JSON.stringify(form.depositImages) !== JSON.stringify(props.row.depositImages || []);
  const storedChanged = form.depositStored !== wasStored;
  if (canManageHold.value && (storedChanged || (!wasStored && form.depositStored && depositChanged))) {
    if (!form.depositStored) {
      holdUpdate = { stored: false };
    } else {
      let warrantyFields = {};
      if (isDelta.value) {
        const targetLocked = hold.warrantyTargetLocked === true;
        const target = Number(form.depositTarget);
        if (!targetLocked && (String(form.depositTarget).trim() === '' || !Number.isFinite(target) || target <= 0)) {
          return show('请填写大于0的保底目标', 'warning');
        }
        const rounds = [form.depositFirst, form.depositSecond];
        if (String(rounds[0]).trim() === '' && String(rounds[1]).trim() !== '') return show('请先填写第一把金额', 'warning');
        const values = rounds.filter((value) => String(value).trim() !== '').map(Number);
        if (values.some((value) => !Number.isFinite(value) || value < 0)) return show('每把金额需为非负数', 'warning');
        warrantyFields = {
          ...(!targetLocked ? { warrantyTarget: target } : {}),
          rounds: [...values, ...(hold.rounds || []).slice(2)],
          shots: [...form.depositImages],
          reason: form.depositReason.trim(),
        };
      }
      holdUpdate = {
        stored: true,
        ...warrantyFields,
        ...(!isDelta.value ? { remark: form.depositRemark.trim() } : {}),
      };
    }
  }
  if (isHoldOnlyOrder.value && !holdUpdate) {
    return show(isStored.value ? '请取消勾选存单并保存以释放' : '请勾选存单后再保存', 'warning');
  }
  emit('save', {
    ...(!isProgress.value && !isDispatchPending.value ? {
      ...(form.gameId !== '' && form.gameId != null ? { gameId: Number(form.gameId) } : {}),
      ...(form.specId !== '' && form.specId != null ? { specId: Number(form.specId) } : {}),
      clients: form.clients.length ? form.clients.join(',') : '',
      ...(amount !== undefined ? { amount } : {}),
    } : {}),
    ...(clubNetPrice !== undefined ? { clubNetPrice } : {}),
    ...(insuranceSlots !== undefined ? { insuranceSlots } : {}),
    ...(isDispatchPending.value ? { clients: form.clients.length ? form.clients.join(',') : '' } : {}),
    orderType: form.orderType,
    roleName: String(form.roleName || '').trim(),
    teamCode: String(form.teamCode || '').trim(),
    remark: String(form.remark || '').trim(),
    systemRemark: String(form.systemRemark || '').trim(),
    groupQrUrl: form.groupQrUrl || '',
    ...(holdUpdate ? { holdUpdate } : {}),
  });
}

defineExpose({ submit });
</script>

<template>
  <div class="order-edit" @paste="pasteQrImage">
    <section v-if="row.payVoucherUrl" class="edit-section">
      <h4>支付凭证（仅平台内部可见）</h4>
      <el-image :src="row.payVoucherUrl" style="width: 120px; height: 120px" fit="contain" alt="支付凭证" :preview-src-list="[row.payVoucherUrl]" preview-teleported />
    </section>
    <!-- 所属客服（只读；修改入口在列表领取人列铅笔 → 独立弹窗 PUT /{id}/owner） -->
    <section class="edit-section">
      <h4>所属客服</h4>
      <div class="form-row">
        <label>所属客服</label>
        <strong>{{ row.claimerName || '—' }} ({{ row.claimerCorp || '—' }})</strong>
      </div>
    </section>

    <!-- 订单信息 -->
    <section class="edit-section">
      <h4>订单信息</h4>
      <div class="grid-2">
        <div class="form-row">
          <label>本平台订单号</label>
          <div class="copy-field">
            <span class="readonly">{{ row.orderNo }}</span>
            <button type="button" class="copy-btn" aria-label="复制本平台订单号" title="复制" @click="copyText(row.orderNo)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
            </button>
          </div>
        </div>
        <div class="form-row">
          <label>第三方订单号</label>
          <div class="copy-field">
            <span class="readonly">{{ row.thirdOrderNo }}</span>
            <span v-if="row.channel" class="channel-tag">{{ row.channel }}</span>
            <button type="button" class="copy-btn" aria-label="复制第三方订单号" title="复制" @click="copyText(row.thirdOrderNo)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
            </button>
          </div>
        </div>
        <div class="form-row">
          <label>游戏名称</label>
          <el-select v-model="form.gameId" :disabled="isOrderDetailsLocked || isDispatchPending" placeholder="请选择游戏" style="width: 100%" filterable @change="handleGameChange">
            <el-option v-for="item in gameOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label>购买项目</label>
          <span class="readonly">{{ row.product || '—' }}</span>
        </div>
        <div class="form-row">
          <label>订单状态</label>
          <div class="order-status-actions">
            <span class="status-badge" :class="STATUS_CLASS[row.status] || 'status-info'">{{ row.status }}</span>
            <button
              v-if="row.manualCreated && row.canApplyEdit && !editApproval && !isHoldOnlyOrder"
              type="button"
              class="edit-approval-trigger"
              @click="emit('request-edit', row)"
            >
              <!-- <span class="edit-approval-trigger__icon" aria-hidden="true">↗</span> -->
              申请编辑
            </button>
            <span v-else-if="editApproval" class="edit-approval-state" :class="`is-${editApproval.status?.toLowerCase?.() || 'unknown'}`">
              <span class="edit-approval-state__dot"></span>
              {{ editApprovalLabel }}
            </span>
          </div>
        </div>
        <div class="form-row">
          <label>角色名</label>
          <div class="copy-field">
            <input v-model="form.roleName" :disabled="isHoldOnlyOrder" placeholder="请输入角色名" />
            <button type="button" class="copy-btn" aria-label="复制角色名" title="复制" @click="copyText(form.roleName)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
            </button>
          </div>
        </div>
        <div class="form-row">
          <label>游戏规格</label>
          <el-select v-model="form.specId" :disabled="isOrderDetailsLocked || isDispatchPending" placeholder="请选择规格" style="width: 100%" filterable @change="handleSpecChange">
            <el-option v-for="item in specOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="form-row">
          <label>打手人数</label>
          <span class="readonly">{{ row.playerCount != null ? `${row.playerCount}人` : '—' }}</span>
        </div>
        <div class="form-row">
          <label>客户端</label>
          <el-select v-model="form.clients" :disabled="isOrderDetailsLocked" multiple placeholder="支持多选" style="width: 100%">
            <el-option v-for="item in CLIENT_OPTIONS" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div class="form-row">
          <label>组队码</label>
          <!-- 组队码 teamCode：maintain 已支持（新 OpenAPI），随保存提交 -->
          <div class="copy-field">
            <input v-model="form.teamCode" :disabled="isHoldOnlyOrder" placeholder="无则不填" />
            <button type="button" class="copy-btn" aria-label="复制组队码" title="复制" @click="copyText(form.teamCode)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>
            </button>
          </div>
        </div>
        <div class="form-row">
          <label>订单类型</label>
          <el-radio-group v-model="form.orderType" :disabled="isHoldOnlyOrder">
            <el-radio v-for="item in TYPE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </div>
        <div class="form-row">
          <label>创单时间</label>
          <span class="readonly">{{ row.createTime || '—' }}</span>
        </div>
        <div class="form-row">
          <label>订单金额(元)</label>
          <!-- maintain.amount：不传保持原值；已退款订单不能改（禁用） -->
          <input
            v-model="form.amount"
            type="number"
            step="0.01"
            min="0"
            :disabled="isRefunded || isOrderDetailsLocked || isDispatchPending"
            placeholder="仅支持正数，最多两位小数"
          />
        </div>
        <div v-if="requiresClubNetPrice" class="form-row">
          <label class="required">到手价(元)</label>
          <input
            v-model="form.clubNetPrice"
            type="number"
            min="0.01"
            step="0.01"
            :disabled="isHoldOnlyOrder"
            placeholder="请输入到手价"
          />
        </div>
        <div class="form-row">
          <label>保险格数</label>
          <input
            v-model="form.insuranceSlots"
            type="number"
            min="0"
            step="1"
            :disabled="isHoldOnlyOrder"
            placeholder="选填，请输入整数"
          />
        </div>
      </div>
      <div class="form-row">
        <label>企业群二维码</label>
        <!-- groupQrUrl：先 fileApi.upload 拿 url，随 maintain 提交；传空串清除 -->
        <div
          class="upload-box qr-drop-zone"
          tabindex="0"
          role="group"
          aria-label="企业群二维码上传，可粘贴图片或拖入图片，也可选择文件"
          :aria-busy="qrUploading"
          @dragover.prevent
          @drop.prevent.stop="dropQrImage"
        >
          <el-image
            v-if="form.groupQrUrl"
            :src="form.groupQrUrl"
            class="upload-thumb"
            alt="企业群二维码"
            fit="cover"
            :preview-src-list="[form.groupQrUrl]"
            preview-teleported
          />
          <span v-else class="upload-empty">未上传</span>
          <label class="upload-btn" :class="{ disabled: qrUploading || isHoldOnlyOrder }">
            {{ qrUploading ? '上传中…' : '上传图片' }}
            <input type="file" accept="image/*" hidden :disabled="qrUploading || isHoldOnlyOrder" @change="uploadSingle" />
          </label>
          <button v-if="form.groupQrUrl" type="button" class="upload-remove" :disabled="qrUploading || isHoldOnlyOrder" @click="removeQr">删除</button>
          <span class="qr-upload-tip">可直接 Ctrl+V 粘贴图片，或将图片拖到此处上传</span>
        </div>
      </div>
    </section>

    <section v-if="canDisplayHold" class="edit-section">
      <h4>存单</h4>
      <div class="form-row">
        <label>是否存单</label>
        <el-checkbox v-model="form.depositStored" :disabled="!canManageHold">存单</el-checkbox>
      </div>
      <template v-if="isDelta">
        <div class="grid-2">
          <div class="form-row">
            <label>保底目标(W)</label>
            <input v-model="form.depositTarget" :readonly="!holdEditable || row.hold?.warrantyTargetLocked === true" type="number" min="0" />
          </div>
          <div class="form-row">
            <label>存单原因</label>
            <input v-model="form.depositReason" :readonly="!holdEditable" maxlength="200" placeholder="上限200字" />
          </div>
          <div class="form-row">
            <label>第一把(W)</label>
            <input v-model="form.depositFirst" :readonly="!holdEditable" type="number" min="0" />
          </div>
          <div class="form-row">
            <label>第二把(W)</label>
            <input v-model="form.depositSecond" :readonly="!holdEditable" type="number" min="0" />
          </div>
        </div>
        <div class="form-row">
          <label>剩余保底截图</label>
          <div class="upload-box">
            <div class="upload-list">
              <div v-for="(img, i) in form.depositImages" :key="i" class="upload-item">
                <el-image
                  :src="img"
                  alt="剩余保底截图"
                  fit="cover"
                  :preview-src-list="form.depositImages"
                  :initial-index="i"
                  preview-teleported
                />
                <button v-if="holdEditable" type="button" class="upload-item-remove" :disabled="depositUploading" @click="form.depositImages.splice(i, 1)">✕</button>
              </div>
            </div>
            <label v-if="holdEditable && form.depositImages.length < 5" class="upload-btn">
              {{ depositUploading ? '上传中…' : '上传截图（最多5张）' }}
              <input type="file" accept="image/*" multiple hidden :disabled="depositUploading" @change="uploadDeposit" />
            </label>
          </div>
        </div>
      </template>
      <div v-if="!isDelta" class="form-row">
        <label>存单备注</label>
        <textarea v-model="form.depositRemark" :readonly="!holdEditable" class="remark-area" rows="3" maxlength="200" placeholder="存单备注，上限200字"></textarea>
      </div>
    </section>

    <!-- 打手信息（slots：playerName/clubName/takenAt/transferredAt 已由后端补齐；
         展示规则：transferredAt 空 → 接单时间，有值 → 转单时间，转出的排后面） -->
    <section v-if="players.length" class="edit-section">
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

    <!-- 分润信息（POST /api/admin/orders/{id}/profit-details；未接单/未锁定时不展示数值） -->
    <section class="edit-section">
      <h4>分润信息</h4>
      <div class="grid-2">
        <div class="kv"><span>平台加价/减价</span><strong>{{ adjustText(row.platformAdjust) }}</strong></div>
        <div class="kv"><span>俱乐部加价/减价</span><strong>{{ adjustText(row.clubAdjust) }}</strong></div>
        <template v-if="profitState.loading">
          <div class="kv"><span>平台分润(元)</span><strong class="muted-text">—</strong></div>
          <div class="kv"><span>工作室分润(元)</span><strong class="muted-text">—</strong></div>
          <div class="kv"><span>打手分润(元)</span><strong class="muted-text">—</strong></div>
        </template>
        <template v-else-if="split">
          <div class="kv"><span>平台分润(元)</span><strong>{{ split.platform }}</strong></div>
          <div class="kv"><span>工作室分润(元)</span><strong>{{ split.club }}</strong></div>
          <div class="kv"><span>打手分润(元)</span><strong>{{ split.playerExtra ? `${split.player}元=${split.playerBase}元+${split.playerExtra}元` : split.player }}</strong></div>
        </template>
        <template v-else>
          <div class="kv"><span>平台分润(元)</span><strong class="muted-text">—</strong></div>
          <div class="kv"><span>工作室分润(元)</span><strong class="muted-text">—</strong></div>
          <div class="kv"><span>打手分润(元)</span><strong class="muted-text">—</strong></div>
        </template>
      </div>
      <p v-if="profitState.error" class="muted-text">{{ profitState.error }}</p>
    </section>

    <!-- 订单日志（接口：logs） -->
    <section class="edit-section">
      <h4>订单日志</h4>
      <OrderLogTimeline :logs="logs" />
    </section>

    <!-- 完成凭证（coverUrl 首图 / endUrl 尾图 / progressUrls 进程图，接口已返回；只读展示） -->
    <section class="edit-section">
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

    <!-- 订单备注 -->
    <section class="edit-section">
      <h4>派单备注</h4>
      <textarea v-model="form.remark" :readonly="isHoldOnlyOrder" class="remark-area" rows="3" maxlength="200" placeholder="请输入订单备注"></textarea>
      <div class="char-count">{{ form.remark.length }}/200</div>
    </section>

    <section class="edit-section">
      <h4>系统备注</h4>
      <textarea v-model="form.systemRemark" :readonly="isHoldOnlyOrder" class="remark-area" rows="3" maxlength="200" placeholder="请输入系统备注"></textarea>
      <div class="char-count">{{ form.systemRemark.length }}/200</div>
    </section>
  </div>
</template>

<style scoped>
.order-edit {
  display: grid;
  gap: 16px;
  max-height: 62vh;
  overflow: auto;
  padding-right: 4px;
}

.edit-section {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
}

.edit-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  padding-left: 8px;
  border-left: 3px solid var(--primary);
  line-height: 1.2;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.form-row > label {
  flex: 0 0 84px;
  color: var(--text-sub);
  font-size: 12px;
}

.order-status-actions {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.edit-approval-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 32%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 8%, var(--bg-card));
  color: var(--primary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.edit-approval-trigger:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 14%, var(--bg-card));
}

.edit-approval-trigger:active {
  transform: translateY(1px);
}

.edit-approval-trigger__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--text-invert, #fff);
  font-size: 11px;
  line-height: 1;
}

.edit-approval-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.edit-approval-state__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.edit-approval-state.is-pending {
  background: rgba(217, 119, 6, 0.1);
  color: #b45309;
}

.edit-approval-state.is-approved {
  background: rgba(5, 150, 105, 0.1);
  color: #047857;
}

.edit-approval-state.is-rejected {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.grid-2 :deep(.el-select),
.form-row :deep(.el-select) {
  width: 100%;
  min-width: 0;
}

.grid-2 :deep(.el-select__wrapper),
.form-row :deep(.el-select__wrapper) {
  height: 34px !important;
  min-height: 34px;
  border-radius: 8px !important;
  padding: 2px 12px;
}

.grid-2 :deep(.el-select.is-multiple .el-select__wrapper),
.form-row :deep(.el-select.is-multiple .el-select__wrapper) {
  height: auto !important;
  min-height: 34px;
}

.grid-2 :deep(.el-radio-group),
.form-row :deep(.el-radio-group) {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.form-row input[type='number'],
.form-row > input {
  flex: 1;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-main);
  box-sizing: border-box;
  background: var(--input-bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.form-row input[type='number']:focus,
.form-row > input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.form-row input[type='number']:disabled,
.form-row > input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: var(--input-bg);
}

.form-row textarea,
.remark-area {
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

.form-row textarea:focus,
.remark-area:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.form-row textarea::placeholder,
.remark-area::placeholder {
  color: var(--input-placeholder);
}

.readonly {
  font-size: 13px;
  color: var(--text-main);
  word-break: break-all;
}

.copy-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/* 渠道首字标签（原型：第三方订单号旁展示渠道首拼，如「抖」） */
.channel-tag {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 4px;
  padding: 1px 6px;
}

.copy-field input {
  flex: 1;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-main);
  box-sizing: border-box;
  background: var(--input-bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.copy-field input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--input-bg-focus);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.copy-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.copy-btn:hover {
  border-color: var(--primary-border-strong);
  background: var(--primary-soft);
}

.kv {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.kv span {
  color: var(--text-sub);
  font-size: 12px;
}

.kv strong {
  color: var(--text-main);
  font-size: 12.5px;
  font-weight: 500;
}

.qr-drop-zone {
  padding: 12px;
  border: 1px dashed var(--primary-border-strong);
  border-radius: 8px;
  background: var(--primary-soft);
}

.qr-drop-zone:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.qr-upload-tip {
  flex-basis: 100%;
  color: var(--text-faint);
  font-size: 12px;
}

.upload-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.upload-empty {
  font-size: 12.5px;
  color: var(--text-faint);
}

.upload-thumb {
  width: 96px;
  height: 72px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  border: 1px dashed var(--primary-border-strong);
  border-radius: 8px;
  padding: 6px 14px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12.5px;
  cursor: pointer;
}

.upload-btn:hover {
  background: var(--primary-faint);
}

.upload-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-remove {
  border: none;
  background: transparent;
  color: #d92d20;
  font-size: 12px;
  cursor: pointer;
}

.upload-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-item {
  position: relative;
  width: 72px;
  height: 54px;
}

.upload-item .el-image {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.upload-item-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #d92d20;
  color: var(--text-invert);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.muted-text {
  color: var(--text-faint);
  font-size: 12.5px;
  margin: 0;
}

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

.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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

.player-card strong {
  color: var(--text-main);
  font-size: 13px;
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

.char-count {
  text-align: right;
  color: var(--text-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
