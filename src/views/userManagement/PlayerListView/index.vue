<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AppModal from '../../../components/AppModal.vue';
import DataTable from '../../../components/DataTable.vue';
import SearchComponent from '../../../components/SearchComponent/index.vue';
import { useConfirm } from '../../../composables/useConfirm';
import { useToast } from '../../../composables/useToast';
import { gameApi } from '../../../api/modules/game';

const { confirm } = useConfirm();
const { show } = useToast();

const filter = reactive({
  playerId: '',
  playerName: '',
  phone: '',
  status: '',
  createTime: [],
});

const page = ref(1);
const pageSize = ref(10);
const editDialogVisible = ref(false);
const currentRow = ref(null);
const editingId = ref(null); // null = 新增

// ===== 可接单规格：游戏及规格选项（数据源：游戏管理 mock DB） =====
const gameOptions = ref([]);

const specOptionsOf = (game) => {
  if (!game) return [];
  const found = gameOptions.value.find((g) => g.name === game);
  const specs = found ? found.specs : [];
  // 「全部」表示该游戏不限制规格，与其他规格互斥
  return ['全部', ...specs];
};

// ===== 编辑 / 新增表单 =====
const editForm = reactive({
  name: '',
  phone: '',
  password: '',
  specRows: [], // [{ game: '', specs: [] }]
});

const rows = ref([
  { id: '2455415', phone: '13800000001', name: '张三', clubName: '未来电商', clubId: '10001', income: 0, deposit: 0, finished: 0, failed: 0, freezeCount: 0, status: '可接单', isFrozen: false, isInStore: true, password: '123456', gameSpecs: [{ game: '三角洲', specs: ['护航'] }] },
  { id: '2455416', phone: '13800000002', name: '李四', clubName: '未来电竞', clubId: '10002', income: 0, deposit: 0, finished: 1, failed: 2, freezeCount: 0, status: '禁止接单', isFrozen: false, isInStore: true, password: '123456', gameSpecs: [{ game: '王者荣耀', specs: ['段位上分'] }] },
  { id: '2455417', phone: '13800000003', name: '王五', clubName: '未来娱乐', clubId: '10003', income: 3000, deposit: 5000, finished: 5, failed: 1, freezeCount: 1, status: '冻结', isFrozen: true, isInStore: true, password: '123456', gameSpecs: [{ game: '和平精英', specs: ['全部'] }] },
  { id: '2455418', phone: '13800000004', name: '赵六', clubName: '未来文化', clubId: '10004', income: 6600, deposit: 1200, finished: 2, failed: 0, freezeCount: 0, status: '退店', isFrozen: false, isInStore: false, password: '123456', gameSpecs: [{ game: '英雄联盟', specs: ['排位上分'] }] },
  { id: '2455419', phone: '13800000005', name: '周七', clubName: '未来俱乐部', clubId: '10005', income: 1100, deposit: 500, finished: 9, failed: 3, freezeCount: 0, status: '未冻结', isFrozen: false, isInStore: true, password: '123456', gameSpecs: [{ game: '三角洲', specs: ['全部'] }] },
  { id: '2455420', phone: '13800000006', name: '吴八', clubName: '未来共享', clubId: '10006', income: 2300, deposit: 800, finished: 4, failed: 0, freezeCount: 0, status: '可接单', isFrozen: false, isInStore: true, password: '123456', gameSpecs: [{ game: '永劫无间', specs: ['排位赛'] }] },
  { id: '2455421', phone: '13800000007', name: '郑九', clubName: '未来渠道', clubId: '10007', income: 900, deposit: 200, finished: 3, failed: 1, freezeCount: 0, status: '冻结', isFrozen: true, isInStore: true, password: '123456', gameSpecs: [{ game: '王者荣耀', specs: ['陪玩'] }] },
  { id: '2455422', phone: '13800000008', name: '孙十', clubName: '未来科技', clubId: '10008', income: 5000, deposit: 3000, finished: 8, failed: 2, freezeCount: 0, status: '在店', isFrozen: false, isInStore: true, password: '123456', gameSpecs: [{ game: '三角洲', specs: ['陪玩'] }] },
  { id: '2455423', phone: '13800000009', name: '黄十一', clubName: '未来联盟', clubId: '10009', income: 200, deposit: 100, finished: 1, failed: 0, freezeCount: 0, status: '可接单', isFrozen: false, isInStore: true, password: '123456', gameSpecs: [{ game: '和平精英', specs: ['单排上分'] }] },
  { id: '2455424', phone: '13800000010', name: '陈十二', clubName: '未来工作室', clubId: '10010', income: 1000, deposit: 300, finished: 7, failed: 2, freezeCount: 0, status: '退店', isFrozen: false, isInStore: false, password: '123456', gameSpecs: [{ game: '英雄联盟', specs: ['云顶之弈'] }] },
]);

// 列表状态（含：可接单、禁止接单、未冻结、冻结、在店、退店）
const statusOptions = ['可接单', '禁止接单', '未冻结', '冻结', '在店', '退店'];
// 筛选状态：在店 / 离店
const statusFilterOptions = ['在店', '离店'];

const columns = [
  { key: 'id', title: '打手ID' },
  { key: 'name', title: '打手名称' },
  { key: 'clubName', title: '俱乐部名称' },
  { key: 'income', title: '收益余额（元）' },
  { key: 'deposit', title: '押金余额（元）' },
  { key: 'finished', title: '已完成' },
  { key: 'failed', title: '未通过' },
  { key: 'freezeCount', title: '冻结' },
  { key: 'status', title: '状态' },
  { key: 'op', title: '操作' },
];

const searchFields = [
  { prop: 'playerId', label: '打手ID', type: 'input', placeholder: '请输入打手ID', span: 5 },
  { prop: 'playerName', label: '打手名称', type: 'input', placeholder: '请输入打手名称', span: 5 },
  { prop: 'phone', label: '打手手机号', type: 'input', placeholder: '请输入打手手机号', span: 5 },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '全部',
    span: 4,
    options: [{ label: '全部', value: '' }, ...statusFilterOptions.map((item) => ({ label: item, value: item }))],
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

const filteredRows = computed(() => {
  const matches = (value, matcher) => {
    if (!value) return true;
    return String(matcher).toLowerCase().includes(String(value).toLowerCase());
  };

  return rows.value.filter((row) => {
    const playerIdMatch = !filter.playerId || row.id === String(filter.playerId).trim(); // 完全匹配
    const playerNameMatch = !filter.playerName || matches(filter.playerName, row.name); // 模糊匹配
    const phoneMatch = !filter.phone || row.phone === String(filter.phone).trim(); // 完全匹配
    const statusMatch = !filter.status || (filter.status === '在店' ? row.isInStore === true : row.isInStore === false);
    return playerIdMatch && playerNameMatch && phoneMatch && statusMatch;
  });
});

const total = computed(() => filteredRows.value.length);

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

function handleSearch(values) {
  Object.assign(filter, values);
  page.value = 1;
}

function handleReset() {
  Object.keys(filter).forEach((key) => {
    if (Array.isArray(filter[key])) filter[key] = [];
    else filter[key] = '';
  });
  page.value = 1;
}

function pageChange(nextPage) {
  page.value = nextPage;
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

// ===== 新增 / 编辑 =====
function openCreate() {
  editingId.value = null;
  currentRow.value = null;
  Object.assign(editForm, {
    name: '',
    phone: '',
    password: '',
    specRows: [{ game: '', specs: ['全部'] }],
  });
  editDialogVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  currentRow.value = row;
  Object.assign(editForm, {
    name: row.name,
    phone: row.phone || '',
    password: row.password || '',
    specRows:
      row.gameSpecs && row.gameSpecs.length
        ? row.gameSpecs.map((item) => ({ game: item.game, specs: [...(item.specs || [])] }))
        : [{ game: '', specs: ['全部'] }],
  });
  editDialogVisible.value = true;
}

function addSpecRow() {
  editForm.specRows.push({ game: '', specs: ['全部'] });
}

function removeSpecRow(idx) {
  if (editForm.specRows.length <= 1) {
    show('至少保留一行可接单规格', 'warning');
    return;
  }
  editForm.specRows.splice(idx, 1);
}

function handleSpecRowGameChange(row) {
  row.specs = ['全部']; // 切换游戏后重置规格为「全部」
}

function handleSpecChange(row) {
  // 「全部」与其他规格互斥
  if (row.specs && row.specs.includes('全部') && row.specs.length > 1) {
    row.specs = ['全部'];
  }
}

function submitEdit() {
  const name = editForm.name.trim();
  const phone = editForm.phone.trim();
  const password = editForm.password;

  // 打手名称：必填，平台维护唯一性校验
  if (!name) {
    show('请输入打手名称', 'warning');
    return;
  }
  const nameDup = rows.value.find((r) => r.name === name && r.id !== editingId.value);
  if (nameDup) {
    show('打手名称已存在，请更换', 'warning');
    return;
  }

  // 手机号：必填，平台维护唯一性校验
  if (!phone) {
    show('请输入手机号', 'warning');
    return;
  }
  const phoneDup = rows.value.find((r) => r.phone === phone && r.id !== editingId.value);
  if (phoneDup) {
    show('手机号已存在，请更换', 'warning');
    return;
  }

  // 密码：6位以上数字
  if (!password) {
    show('请输入密码', 'warning');
    return;
  }
  if (!/^\d{6,}$/.test(password)) {
    show('密码需为6位以上数字', 'warning');
    return;
  }

  // 可接单规格：至少一行、游戏必选、所选游戏不允许重复、每个游戏至少选一个规格
  const validRows = editForm.specRows.filter((r) => r.game);
  if (!validRows.length) {
    show('请至少配置一行可接单规格', 'warning');
    return;
  }
  const games = validRows.map((r) => r.game);
  const dupGame = games.find((g, i) => games.indexOf(g) !== i);
  if (dupGame) {
    show(`游戏「${dupGame}」重复，所选的游戏不允许重复`, 'warning');
    return;
  }
  if (validRows.some((r) => !r.specs || !r.specs.length)) {
    show('请为每个游戏选择至少一个规格', 'warning');
    return;
  }

  const gameSpecs = validRows.map((r) => ({ game: r.game, specs: [...r.specs] }));

  if (editingId.value) {
    Object.assign(currentRow.value, {
      name,
      phone,
      password,
      gameSpecs,
    });
    show('编辑成功', 'success');
  } else {
    // 新增：新数据默认 可接单 / 未冻结 / 在店
    const nextId = String(Math.max(...rows.value.map((r) => Number(r.id))) + 1);
    rows.value.unshift({
      id: nextId,
      name,
      phone,
      password,
      clubName: '—',
      clubId: '',
      income: 0,
      deposit: 0,
      finished: 0,
      failed: 0,
      freezeCount: 0,
      status: '可接单',
      isFrozen: false,
      isInStore: true,
      gameSpecs,
    });
    show('新增成功', 'success');
  }
  editDialogVisible.value = false;
}

// ===== 退店：仅在「在店」下展示，需二次确认 =====
async function triggerLeaveStore(row) {
  const ok = await confirm({
    title: '退店确认',
    message: `确认将打手「${row.name}」退店吗？退店后将无法接单。`,
    okText: '确认退店',
  });
  if (!ok) return;
  row.isInStore = false;
  row.status = '退店';
  show('退店成功', 'success');
}

onMounted(async () => {
  try {
    const games = await gameApi.all();
    gameOptions.value = games || [];
  } catch (e) {
    show(e?.message || '游戏列表加载失败', 'error');
  }
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
      />
    </div>

    <DataTable
      :columns="columns"
      :data="pagedRows"
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

      <template #cell-income="{ row }">{{ row.income.toFixed(2) }}</template>
      <template #cell-deposit="{ row }">{{ row.deposit.toFixed(2) }}</template>

      <template #cell-status="{ row }">
        <span :class="['status-badge', getStatusClass(row.status)]">{{ row.status }}</span>
      </template>

      <template #cell-op="{ row }">
        <div class="action-group">
          <button class="link-btn" @click="openEdit(row)">编辑</button>
          <button v-if="row.isInStore" class="link-btn muted" @click="triggerLeaveStore(row)">退店</button>
        </div>
      </template>
    </DataTable>

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
          <label class="required">密码</label>
          <input v-model="editForm.password" type="password" maxlength="20" placeholder="请输入密码（6位以上数字）" />
        </div>

        <div class="form-row spec-section">
          <label class="required">可接单规格</label>
          <div v-for="(row, idx) in editForm.specRows" :key="idx" class="spec-row">
            <el-select
              v-model="row.game"
              class="spec-game"
              placeholder="请选择游戏"
              filterable
              @change="handleSpecRowGameChange(row)"
            >
              <el-option v-for="g in gameOptions" :key="g.name" :label="g.name" :value="g.name" />
            </el-select>
            <el-select
              v-model="row.specs"
              class="spec-multi"
              placeholder="请选择规格（可多选）"
              multiple
              collapse-tags
              @change="handleSpecChange(row)"
            >
              <el-option v-for="s in specOptionsOf(row.game)" :key="s" :label="s" :value="s" />
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
        <button class="btn btn-primary" @click="submitEdit">确定</button>
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
  /* background: linear-gradient(180deg, rgba(248, 250, 255, 0.7), rgba(243, 240, 255, 0.95)); */
  border-top: 1px solid var(--primary-faint);
}
</style>
