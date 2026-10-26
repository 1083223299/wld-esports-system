<script setup>
import { onMounted, reactive, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useToast } from '../../../composables/useToast';
import { useUserStore } from '../../../stores/user';
import { playerApi } from '../../../api/modules/player';
import { gameApi } from '../../../api/modules/game';

const { show } = useToast();
const userStore = useUserStore();

/* ================= 列表筛选（对齐接口 Query：id/name/phone/clubId/clubName/createdFrom/createdTo/accountStatus） ================= */
const filter = reactive({
  playerId: '',
  playerName: '',
  phone: '',
  accountStatus: '',
  createTime: [],
});

const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const rows = ref([]);
const loading = ref(false);
const editDialogVisible = ref(false);
const editingId = ref(null); // null = 新增
/** 弹窗提交中（防重复提交） */
const submitting = ref(false);

// ===== 可接单规格：游戏及规格选项（数据源：游戏管理 mock DB） =====
const gameOptions = ref([]);

/**
 * 规格 ID 派生（占位）：当前游戏/规格下拉仍来自游戏管理 mock（gameApi.all），
 * 后端规格表接口就绪前，按 gameId*100+序号 派生稳定整数 ID；
 * 接入真实「游戏规格列表」接口后，仅需替换 gameOptions 数据源即可。
 */
const ALL_SPEC_ID = 0; // 「全部」哨兵值：all=true 的 UI 表示
const specIdOf = (game, idx) => Number(game.id) * 100 + (idx + 1);

const specOptionsOf = (gameId) => {
  const game = gameOptions.value.find((g) => Number(g.id) === Number(gameId));
  if (!game) return [{ label: '全部', value: ALL_SPEC_ID }];
  return [
    { label: '全部', value: ALL_SPEC_ID },
    ...game.specs.map((s, idx) => ({ label: s, value: specIdOf(game, idx) })),
  ];
};

// ===== 后端打手字段 → 页面字段映射 =====
// 后端口径（2026-10-26 确认，Apifox 526572935 已补全）：
//   列表无单独 accountStatus 返回字段，accountStatus 只用于筛选（CAN_TAKE/BLOCK_TAKE/UNFROZEN/FROZEN/IN_STORE/QUIT）；
//   列表状态用 canTake / inStore / walletFrozen；统计列用 incomeBalance / depositBalance /
//   completedCount / rejectedCount / frozenCount（勿用 income/deposit/finished/failed/freezeCount）。
const KNOWN_STATUS = ['可接单', '禁止接单', '未冻结', '冻结', '在店', '退店'];

/** 状态文案：优先取后端 status 中文文案；为枚举码/未返回时按 walletFrozen/inStore/canTake 推导 */
function mapStatus(o = {}) {
  const raw = String(o.status ?? '').trim();
  if (KNOWN_STATUS.includes(raw)) return raw;
  if (Number(o.walletFrozen) === 1) return '冻结';
  const inStore = Number(o.inStore) === 1;
  if (!inStore) return '退店';
  return Number(o.canTake) === 1 ? '可接单' : '禁止接单';
}

function mapPlayer(o = {}) {
  const inStore = Number(o.inStore) === 1;
  return {
    id: o.id,
    clubId: o.clubId,
    name: o.name || '',
    phone: o.phone || '',
    status: mapStatus(o),
    isInStore: inStore,
    clubName: o.clubName || '—', // 本俱乐部打手列表，接口未返回俱乐部名时占位
    // 统计字段：按后端字段名透传（缺失回退 0）
    incomeBalance: Number(o.incomeBalance) || 0,
    depositBalance: Number(o.depositBalance) || 0,
    completedCount: Number(o.completedCount) || 0,
    rejectedCount: Number(o.rejectedCount) || 0,
    frozenCount: Number(o.frozenCount) || 0,
  };
}

// ===== 编辑 / 新增表单 =====
const editForm = reactive({
  name: '',
  phone: '',
  password: '',
  specRows: [], // [{ gameId, specIds: number[] }]，specIds 含 ALL_SPEC_ID 表示「全部」
});

/* ================= 列表加载（服务端分页） ================= */
function buildListParams() {
  const params = { page: page.value, pageSize: pageSize.value };
  // 接口筛选参数：id 完全匹配、name 模糊、phone 完全匹配、accountStatus 状态、createdFrom/createdTo 创建时间
  const id = filter.playerId?.trim();
  const name = filter.playerName?.trim();
  const phone = filter.phone?.trim();
  if (id) params.id = id;
  if (name) params.name = name;
  if (phone) params.phone = phone;
  if (filter.accountStatus) params.accountStatus = filter.accountStatus;
  if (Array.isArray(filter.createTime) && filter.createTime.length === 2) {
    if (filter.createTime[0]) params.createdFrom = filter.createTime[0];
    if (filter.createTime[1]) params.createdTo = filter.createTime[1];
  }
  return params;
}

async function loadPlayers() {
  loading.value = true;
  try {
    const res = await playerApi.list(buildListParams());
    const list = res && Array.isArray(res.list) ? res.list : [];
    rows.value = list.map(mapPlayer);
    total.value = Number(res?.total) || 0;
  } catch {
    // 错误提示已由 request.js 统一 toast
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
  loadPlayers();
}

// 字段被清除/选择时同步查询条件（SearchComponent @change；仅同步、不触发查询，见组件注释）
function handleFilterChange(values) {
  Object.assign(filter, values);
}

function handleReset() {
  Object.keys(filter).forEach((key) => {
    if (Array.isArray(filter[key])) filter[key] = [];
    else filter[key] = '';
  });
  page.value = 1;
  loadPlayers();
}
function pageChange(nextPage) {
  page.value = nextPage;
  loadPlayers();
}

function getStatusClass(status) {
  switch (status) {
    case '可接单':
      return 'status-success';
    case '禁止接单':
      return 'status-danger';
    case '冻结':
      return 'status-warn';
    case '退店':
      return 'status-muted';
    default:
      return 'status-info';
  }
}

// ===== 列表列 / 搜索字段配置 =====
// 筛选状态：在店 / 退店（原型状态=在店、退店；接口枚举 IN_STORE / QUIT）
const statusFilterOptions = [
  { label: '在店', value: 'IN_STORE' },
  { label: '退店', value: 'QUIT' },
];

const columns = [
  { key: 'id', title: '打手ID' },
  { key: 'name', title: '打手名称' },
  { key: 'clubName', title: '俱乐部名称' },
  { key: 'incomeBalance', title: '收益余额（元）' },
  { key: 'depositBalance', title: '押金余额（元）' },
  { key: 'completedCount', title: '已完成' },
  { key: 'rejectedCount', title: '未通过' },
  { key: 'frozenCount', title: '冻结' },
  { key: 'status', title: '状态' },
  { key: 'op', title: '操作' },
];

const searchFields = [
  { prop: 'playerId', label: '打手ID', type: 'input', placeholder: '请输入打手ID', span: 5 },
  { prop: 'playerName', label: '打手名称', type: 'input', placeholder: '请输入打手名称', span: 5 },
  { prop: 'phone', label: '打手手机号', type: 'input', placeholder: '请输入打手手机号', span: 5 },
  {
    prop: 'accountStatus',
    label: '状态',
    type: 'select',
    placeholder: '全部',
    span: 4,
    options: [{ label: '全部', value: '' }, ...statusFilterOptions],
  },
  {
    prop: 'createTime',
    label: '创建时间',
    type: 'daterange',
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
    shortcuts: [
      { text: '今天', value: () => { const d = new Date(); return [d, d]; } },
      { text: '最近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
      { text: '最近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
    ],
  },
];

// ===== 规格数据 ↔ 接口数据转换 =====
/** 表单行 → 接口规格项（filter 掉未选游戏的空行） */
function toApiSpecs(specRows) {
  return specRows
    .filter((r) => r.gameId !== null && r.gameId !== undefined && r.gameId !== '')
    .map((r) => {
      const ids = Array.isArray(r.specIds) ? r.specIds : [];
      const hasAll = ids.includes(ALL_SPEC_ID);
      return {
        gameId: Number(r.gameId),
        all: hasAll,
        // all=true 或为空表示该游戏全部规格
        specIds: hasAll ? [] : ids.filter((id) => id !== ALL_SPEC_ID),
      };
    });
}

/** 接口规格项 → 表单行 */
function fromApiSpecs(list) {
  return (Array.isArray(list) ? list : [])
    .filter((s) => s && s.gameId !== null && s.gameId !== undefined)
    .map((s) => ({
      gameId: Number(s.gameId),
      specIds: s.all ? [ALL_SPEC_ID] : [...(s.specIds || [])],
    }));
}

// ===== 新增 / 编辑 =====
function openCreate() {
  editingId.value = null;
  Object.assign(editForm, {
    name: '',
    phone: '',
    password: '',
    specRows: [{ gameId: null, specIds: [ALL_SPEC_ID] }],
  });
  editDialogVisible.value = true;
}

async function openEdit(row) {
  editingId.value = row.id;
  Object.assign(editForm, {
    name: row.name,
    phone: row.phone || '',
    password: '', // 编辑时留空表示不修改密码
    specRows: [{ gameId: null, specIds: [ALL_SPEC_ID] }],
  });
  editDialogVisible.value = true;
  // 拉取该打手已配置规格（按游戏分组），失败不阻塞弹窗
  try {
    const specs = await playerApi.getSpecs(row.id);
    const rowsFromApi = fromApiSpecs(specs);
    editForm.specRows =
      rowsFromApi.length > 0 ? rowsFromApi : [{ gameId: null, specIds: [ALL_SPEC_ID] }];
  } catch {
    // 错误提示已由 request.js 统一 toast，保留默认空行
  }
}

function addSpecRow() {
  editForm.specRows.push({ gameId: null, specIds: [ALL_SPEC_ID] });
}

function removeSpecRow(idx) {
  if (editForm.specRows.length <= 1) {
    show('至少保留一行可接单规格', 'warning');
    return;
  }
  editForm.specRows.splice(idx, 1);
}

function handleSpecRowGameChange(row) {
  row.specIds = [ALL_SPEC_ID]; // 切换游戏后重置规格为「全部」
}

function handleSpecChange(row) {
  // 「全部」与其他规格互斥
  if (row.specIds && row.specIds.includes(ALL_SPEC_ID) && row.specIds.length > 1) {
    row.specIds = [ALL_SPEC_ID];
  }
}

async function submitEdit() {
  const name = editForm.name.trim();
  const phone = editForm.phone.trim();
  const password = editForm.password;
  const isEdit = !!editingId.value;

  // 打手名称：必填（唯一性由后端校验，失败时 request.js 统一 toast 后端 message）
  if (!name) {
    show('请输入打手名称', 'warning');
    return;
  }
  // 手机号：必填
  if (!phone) {
    show('请输入手机号', 'warning');
    return;
  }
  // 密码：新增必填；编辑留空表示不修改，填写时需为 6 位以上数字
  if (!isEdit && !password) {
    show('请输入密码', 'warning');
    return;
  }
  if (password && !/^\d{6,}$/.test(password)) {
    show('密码需为6位以上数字', 'warning');
    return;
  }

  // 可接单规格：至少一行、游戏必选、所选游戏不允许重复、每个游戏至少选一个规格
  const validRows = editForm.specRows.filter(
    (r) => r.gameId !== null && r.gameId !== undefined && r.gameId !== ''
  );
  if (!validRows.length) {
    show('请至少配置一行可接单规格', 'warning');
    return;
  }
  const dupGame = validRows.find((r, i, arr) =>
    arr.findIndex((x) => Number(x.gameId) === Number(r.gameId)) !== i ? r : null
  );
  if (dupGame) {
    show('所选游戏不允许重复', 'warning');
    return;
  }
  if (validRows.some((r) => !Array.isArray(r.specIds) || !r.specIds.length)) {
    show('请为每个游戏选择至少一个规格', 'warning');
    return;
  }

  // 组装请求体：name/phone 必填，password 编辑留空则不提交，clubId 取登录会话
  const payload = { name, phone };
  if (password) payload.password = password;
  if (userStore.user?.clubId) payload.clubId = Number(userStore.user.clubId);

  const specs = toApiSpecs(editForm.specRows);
  submitting.value = true;
  try {
    let id = editingId.value;
    if (isEdit) {
      await playerApi.update(id, payload);
    } else {
      const created = await playerApi.create(payload);
      id = created?.id;
      if (id === null || id === undefined) {
        throw new Error('新增成功但未返回打手 ID，无法配置规格');
      }
    }
    // 规格配置（specs 空数组表示清空）
    await playerApi.setSpecs(id, specs);
    show(isEdit ? '编辑成功' : '新增成功', 'success');
    editDialogVisible.value = false;
    await loadPlayers();
  } catch {
    // 后端错误已由 request.js 统一 toast，这里不重复提示
  } finally {
    submitting.value = false;
  }
}

// ===== 退店：PUT /api/club/players/{id}/flags，请求体只传 {"inStore":0}（后端 2026-10-23 提供） =====
// 仅"在店"展示退店按钮，二次确认后调用
const leaveVisible = ref(false);
const leaveRow = ref(null);
const quittingId = ref(null);

function openLeave(row) {
  leaveRow.value = row;
  leaveVisible.value = true;
}

async function confirmLeave() {
  const row = leaveRow.value;
  if (!row || quittingId.value) return;
  quittingId.value = row.id;
  try {
    await playerApi.quitStore(row.id);
    leaveVisible.value = false;
    show('已退店', 'success');
    await loadPlayers();
  } catch {
    // 后端错误已由 request.js 统一 toast，弹窗保持打开可重试
  } finally {
    quittingId.value = null;
  }
}

onMounted(async () => {
  // 游戏/规格选项（当前为 mock，规格 ID 为占位派生值）
  try {
    const games = await gameApi.all();
    gameOptions.value = games || [];
  } catch (e) {
    show(e?.message || '游戏列表加载失败', 'error');
  }
  loadPlayers();
});
</script>

<template>
  <div class="list-page">
    <div class="list-page__search">
      <SearchComponent
        :fields="searchFields"
        :initial-values="filter"
        :labelWidth="90"
        @search="handleSearch"
        @reset="handleReset"
        @change="handleFilterChange"
      />
    </div>

    <div v-loading="loading" class="list-page__table-wrap">
      <DataTable
        :columns="columns"
        :data="rows"
        :total="total"
        :page="page"
        :page-size="pageSize"
        @page-change="pageChange"
      >
        <template #toolbar>
          <div class="toolbar-row">
            <button class="btn btn-primary" @click="openCreate">新增</button>
          </div>
        </template>

        <template #cell-incomeBalance="{ row }">{{ row.incomeBalance.toFixed(2) }}</template>
        <template #cell-depositBalance="{ row }">{{ row.depositBalance.toFixed(2) }}</template>

        <template #cell-status="{ row }">
          <span :class="['status-badge', getStatusClass(row.status)]">{{ row.status }}</span>
        </template>

        <template #cell-op="{ row }">
          <div class="action-group">
            <button class="link-btn" @click="openEdit(row)">编辑</button>
            <button v-if="row.isInStore" class="link-btn muted" @click="openLeave(row)">退店</button>
          </div>
        </template>
      </DataTable>
    </div>

    <AppModal v-model="editDialogVisible" title="编辑/新增" width="640px">
      <div class="dialog-form player-modal-content">
        <div class="form-row">
          <label class="required">打手名称</label>
          <input v-model="editForm.name" maxlength="20" placeholder="请输入打手名称" />
        </div>
        <div class="form-row">
          <label class="required">手机号</label>
          <input v-model="editForm.phone" maxlength="11" placeholder="请输入手机号" />
        </div>
        <div class="form-row">
          <label :class="{ required: !editingId }">密码</label>
          <input
            v-model="editForm.password"
            type="password"
            maxlength="20"
            :placeholder="editingId ? '留空则不修改（6位以上数字）' : '请输入密码（6位以上数字）'"
          />
        </div>

        <div class="form-row spec-section">
          <label class="required">可接单规格</label>
          <div v-for="(row, idx) in editForm.specRows" :key="idx" class="spec-row">
            <el-select
              v-model="row.gameId"
              class="spec-game"
              placeholder="请选择游戏"
              filterable
              @change="handleSpecRowGameChange(row)"
            >
              <el-option v-for="g in gameOptions" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
            <el-select
              v-model="row.specIds"
              class="spec-multi"
              placeholder="请选择规格（可多选）"
              multiple
              collapse-tags
              @change="handleSpecChange(row)"
            >
              <el-option
                v-for="opt in specOptionsOf(row.gameId)"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <button
              v-if="editForm.specRows.length > 1"
              type="button"
              class="icon-btn"
              @click="removeSpecRow(idx)"
              title="删除该行"
            >
              −
            </button>
            <button
              v-if="idx === editForm.specRows.length - 1"
              type="button"
              class="icon-btn"
              @click="addSpecRow"
              title="新增一行"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="editDialogVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="submitting" @click="submitEdit">
          {{ submitting ? '提交中…' : '确定' }}
        </button>
      </template>
    </AppModal>

    <!-- ===== 退店二次确认弹窗 ===== -->
    <AppModal v-model="leaveVisible" title="退店确认" width="380px">
      <div v-if="leaveRow" class="leave-confirm">
        <p class="leave-text">
          确认将打手「{{ leaveRow.name }}」（ID:{{ leaveRow.id }}）退店？退店后该打手将不再接单，押金提现须在退店满 14 天后进行。
        </p>
      </div>
      <template #footer>
        <button class="btn btn-plain" @click="leaveVisible = false">取消</button>
        <button class="btn btn-primary" :disabled="quittingId === leaveRow?.id" @click="confirmLeave">
          {{ quittingId === leaveRow?.id ? '退店中…' : '确认退店' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-page__table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.list-page__table-wrap .data-table {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.list-page__table-wrap .list-page__body {
  flex: 1;
}

.action-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px 8px;
  min-width: max-content;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  flex: 0 0 auto;
  transition: background 0.15s ease, color 0.15s ease;
}

.link-btn:hover {
  background: var(--primary-soft);
}

.link-btn.muted {
  color: var(--status-muted);
}

.link-btn.muted:hover {
  background: var(--status-muted-bg);
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.status-success {
  color: var(--status-success);
  background: var(--status-success-bg);
}

.status-danger {
  color: var(--status-danger);
  background: var(--status-danger-bg);
}

.status-warn {
  color: var(--status-warning);
  background: var(--status-warning-bg);
}

.status-muted {
  color: var(--status-muted);
  background: var(--status-muted-bg);
}

.status-info {
  color: var(--status-info);
  background: var(--status-info-bg);
}

/* ===== 新增 / 编辑弹窗 ===== */
.dialog-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.form-row {
  display: grid;
  gap: 8px;
}

.form-row label {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.form-row label.required::before {
  content: '*';
  color: var(--status-danger);
  margin-right: 4px;
}

.form-row input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  color: var(--text-main);
  box-sizing: border-box;
  background: var(--bg-elevated);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.form-row input:focus {
  border-color: var(--primary);
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-border);
}

/* 可接单规格：游戏 + 多选规格 + 增减行 */
.spec-section {
  grid-column: 1 / -1;
}

.spec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.spec-game {
  width: 180px;
  flex: 0 0 180px;
}

.spec-multi {
  flex: 1;
  min-width: 0;
}

.icon-btn {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-sub);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.icon-btn:hover {
  border-color: var(--primary-border-strong);
  color: var(--primary);
  background: var(--primary-faint);
}

/* ===== 弹窗底部按钮 ===== */
.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 22px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: background 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, transform 0.18s ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-plain {
  background: var(--bg-hover);
  color: var(--text-sub);
}

.btn-plain:hover {
  background: var(--border-faint);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: var(--text-invert);
  box-shadow: 0 12px 24px var(--primary-glow-strong);
}

.btn-primary:hover {
  filter: brightness(1.06);
  box-shadow: 0 16px 30px var(--primary-border-strong);
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ===== 退店二次确认 ===== */
.leave-confirm {
  padding: 4px 0;
}

.leave-text {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-main);
  line-height: 1.8;
}
</style>

<!-- 仅本页「编辑/新增」弹窗外壳外观，通过内容容器 :has 命中 -->
<style>
.modal-overlay:has(.player-modal-content) {
  background: rgba(17, 12, 46, 0.55);
  backdrop-filter: blur(6px);
}

.modal-box:has(.player-modal-content) {
  border-radius: 22px;
  border: 1px solid var(--primary-border);
  box-shadow: 0 40px 90px rgba(46, 16, 101, 0.35), 0 6px 20px rgba(46, 16, 101, 0.16);
}

.modal-box:has(.player-modal-content) .modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  border-bottom: none;
}

.modal-box:has(.player-modal-content) .modal-header strong {
  color: var(--text-invert);
  font-size: 18px;
  letter-spacing: 0.02em;
}

.modal-box:has(.player-modal-content) .modal-title-dot {
  background: var(--bg-card);
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.22);
}

.modal-box:has(.player-modal-content) .modal-header .btn-link {
  color: rgba(255, 255, 255, 0.9);
}

.modal-box:has(.player-modal-content) .modal-header .btn-link:hover {
  background: rgba(255, 255, 255, 0.18);
  color: var(--text-invert);
}

.modal-box:has(.player-modal-content) .modal-body {
  padding: 24px;
  background: var(--bg-card);
}

.modal-box:has(.player-modal-content) .modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--primary-faint);
}
</style>
