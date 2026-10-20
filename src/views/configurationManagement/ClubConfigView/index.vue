<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from '../../../composables/useToast';
import { clubConfigApi } from '../../../api/modules/clubConfig';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';

const { show } = useToast();

// ============ 配置数据 ============
const loading = ref(false);
const submitting = ref(false);
const form = reactive({
  orderMode: 'public', // public | club_first
  profitMode: 'percent', // percent | fixed
  playerPercent: 40, // 0<=值<100 整数
});

const orderModeOptions = [
  { value: 'public', label: '可直接接公共订单', desc: '所有满足条件的订单打手都可以查看' },
  { value: 'club_first', label: '必须先由俱乐部接单，打手仅可接俱乐部接手的订单', desc: '订单先流转至俱乐部，再由俱乐部指派' },
];

// 俱乐部分润 = 100 - 打手分润
const clubPercent = computed(() => {
  const v = Number(form.playerPercent);
  if (form.playerPercent === '' || Number.isNaN(v)) return '--';
  return Math.max(0, 100 - v);
});

// ============ 游戏规格列表（固定值分润） ============
const skuLoading = ref(false);
const saveAllLoading = ref(false);
const skuList = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const keyword = ref('');
let searchTimer = null;

async function fetchConfig() {
  loading.value = true;
  try {
    const res = await clubConfigApi.get();
    form.orderMode = res.orderMode;
    form.profitMode = res.profitMode;
    form.playerPercent = res.playerPercent;
  } finally {
    loading.value = false;
  }
}

async function fetchSkuList() {
  skuLoading.value = true;
  try {
    const res = await clubConfigApi.listGameSkus({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
    });
    total.value = res.total;
    skuList.value = res.list;
  } finally {
    skuLoading.value = false;
  }
}

// 搜索：防抖 300ms，命中后回到第 1 页
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchSkuList();
  }, 300);
}

watch(
  () => form.profitMode,
  (val) => {
    if (val === 'fixed' && skuList.value.length === 0) {
      fetchSkuList();
    }
  }
);

// ============ 百分比输入 ============
function onPercentInput(e) {
  let v = e.target.value;
  v = v.replace(/\D/g, '');
  v = v.replace(/^0+(\d)/, '$1');
  if (v !== '' && Number(v) >= 100) v = '99';
  form.playerPercent = v === '' ? '' : Number(v);
}

// ============ 固定值输入 ============
function onAmountInput(row, e) {
  let v = e.target.value;
  v = v.replace(/[^\d.]/g, '');
  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  }
  if (v.includes('.')) {
    const [int, dec] = v.split('.');
    v = `${int}.${dec.slice(0, 2)}`;
  }
  row.amount = v;
}

async function onAmountBlur(row) {
  const raw = row.amount;
  if (raw === '' || raw === null || raw === undefined) {
    row.amount = null;
    try {
      await clubConfigApi.saveSkuAmount({ id: row.id, amount: null });
    } catch (e) {
      show(e?.message || '保存失败', 'error');
    }
    return;
  }
  const v = Number(raw);
  if (Number.isNaN(v) || v < 0) {
    show('仅支持输入 0 及正数', 'warning');
    return;
  }
  try {
    await clubConfigApi.saveSkuAmount({ id: row.id, amount: v });
    show('已保存', 'success');
  } catch (e) {
    show(e?.message || '保存失败', 'error');
  }
}

// 右上角保存：批量保存当前页全部规格金额
async function handleSaveAll() {
  saveAllLoading.value = true;
  try {
    await Promise.all(
      skuList.value.map((row) => {
        const amount =
          row.amount === '' || row.amount === null || row.amount === undefined
            ? null
            : Number(row.amount);
        if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
          return Promise.reject(new Error(`「${row.gameName}·${row.specName}」金额仅支持 0 及正数`));
        }
        return clubConfigApi.saveSkuAmount({ id: row.id, amount });
      })
    );
    show('保存成功', 'success');
  } catch (e) {
    show(e?.message || '保存失败', 'error');
  } finally {
    saveAllLoading.value = false;
  }
}

// ============ 提交（百分比模式） ============
function validatePercent() {
  const v = Number(form.playerPercent);
  if (form.playerPercent === '' || Number.isNaN(v)) return '请输入打手分润比例';
  if (!Number.isInteger(v)) return '打手分润仅支持整数';
  if (v < 0 || v >= 100) return '打手分润需满足 0 ≤ 值 < 100';
  return null;
}

async function handleSubmit() {
  const err = validatePercent();
  if (err) {
    show(err, 'warning');
    return;
  }
  submitting.value = true;
  try {
    await clubConfigApi.save({
      orderMode: form.orderMode,
      profitMode: form.profitMode,
      playerPercent: Number(form.playerPercent),
    });
    show('保存成功', 'success');
  } catch (e) {
    show(e?.message || '保存失败', 'error');
  } finally {
    submitting.value = false;
  }
}

async function onModeChange() {
  if (form.profitMode === 'percent') {
    const err = validatePercent();
    if (err) return;
  }
  try {
    await clubConfigApi.save({
      orderMode: form.orderMode,
      profitMode: form.profitMode,
      playerPercent: Number(form.playerPercent) || 0,
    });
  } catch (e) {
    // 静默
  }
}

function handlePageChange(p) {
  currentPage.value = p;
  fetchSkuList();
}

onMounted(fetchConfig);
</script>

<template>
  <div class="club-config-page">
    <div class="config-card">
      <div v-if="loading" class="loading-tip">加载中...</div>

      <template v-else>
          <!-- ============ 主配置区 ============ -->
          <div class="card-header">
              <div class="header-text">
                <h2>俱乐部配置</h2>
                <!-- <p>统一管理打手接单规则与分润策略</p> -->
              </div>
              <div class="header-actions">
                <span class="header-badge">
                  <span class="dot"></span>
                  配置实时生效
                </span>
                <button
                  v-if="form.profitMode === 'fixed'"
                  class="btn btn-primary btn-save"
                  :disabled="saveAllLoading"
                  @click="handleSaveAll"
                >
                  {{ saveAllLoading ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>

            <!-- 打手接单设置 -->
            <div class="section">
              <div class="section-title">
                <span class="title-bar"></span>
                打手接单设置
              </div>
              <div class="option-grid">
                <label
                  v-for="opt in orderModeOptions"
                  :key="opt.value"
                  class="option-card"
                  :class="{ active: form.orderMode === opt.value }"
                >
                  <input
                    v-model="form.orderMode"
                    type="radio"
                    name="orderMode"
                    :value="opt.value"
                    class="option-radio"
                    @change="onModeChange"
                  />
                  <div class="option-body">
                    <div class="option-label">{{ opt.label }}</div>
                    <!-- <div class="option-desc">{{ opt.desc }}</div> -->
                  </div>
                  <div class="option-check">
                    <svg v-if="form.orderMode === opt.value" viewBox="0 0 16 16" width="14" height="14">
                      <path
                        d="M13.5 4.5L6.5 11.5L3 8"
                        stroke="currentColor"
                        stroke-width="2"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                </label>
              </div>
            </div>

            <!-- 打手分润设置 -->
            <div class="section section-flex">
              <div class="section-title">
                <span class="title-bar"></span>
                打手分润设置
              </div>

              <div class="profit-options">
                <label class="profit-radio" :class="{ active: form.profitMode === 'percent' }">
                  <input v-model="form.profitMode" type="radio" name="profitMode" value="percent" @change="onModeChange" />
                  <span>百分比分润</span>
                </label>
                <label class="profit-radio" :class="{ active: form.profitMode === 'fixed' }">
                  <input v-model="form.profitMode" type="radio" name="profitMode" value="fixed" @change="onModeChange" />
                  <span>按游戏规格进行固定值分润</span>
                </label>
              </div>

              <!-- 百分比分润 -->
              <div v-if="form.profitMode === 'percent'" class="percent-panel">
                <div class="percent-row">
                  <label class="percent-label">打手分润</label>
                  <div class="percent-field">
                    <input
                      :value="form.playerPercent"
                      type="text"
                      inputmode="numeric"
                      placeholder="请输入整数"
                      @input="onPercentInput"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="percent-row">
                  <label class="percent-label">俱乐部分润</label>
                  <div class="percent-field">
                    <span class="readonly-value">{{ clubPercent }}%</span>
                  </div>
                </div>
                <div class="percent-footer">
                  <button class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
                    {{ submitting ? '提交中...' : '提交配置' }}
                  </button>
                </div>
              </div>

              <!-- 固定值分润 -->
              <div v-else class="fixed-panel">
                <div class="table-toolbar">
                  <span class="toolbar-title">游戏规格</span>
                  <div class="toolbar-search">
                    <svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm10 16l-4.3-4.3"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        fill="none"
                      />
                    </svg>
                    <input
                      v-model="keyword"
                      type="text"
                      placeholder="搜索游戏名称 / 游戏规格"
                      @input="onSearchInput"
                    />
                  </div>
                </div>

                <div class="table-wrap">
                  <table class="sku-table">
                    <thead>
                      <tr>
                        <th class="col-index">#</th>
                        <th class="col-game">游戏名称</th>
                        <th class="col-spec">游戏规格</th>
                        <th class="col-amount">打手到手金额 (元)</th>
                      </tr>
                    </thead>
                    <tbody v-if="skuLoading">
                      <tr>
                        <td colspan="4" class="empty-cell">加载中...</td>
                      </tr>
                    </tbody>
                    <tbody v-else>
                      <tr v-for="(row, idx) in skuList" :key="row.id" :class="{ unset: row.amount === null }">
                        <td class="col-index">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                        <td class="col-game">
                          <span class="game-tag">{{ row.gameName }}</span>
                        </td>
                        <td class="col-spec">{{ row.specName }}</td>
                        <td class="col-amount">
                          <div class="amount-wrap">
                            <input
                              :value="row.amount ?? ''"
                              type="text"
                              inputmode="decimal"
                              placeholder="未配置"
                              @input="onAmountInput(row, $event)"
                              @blur="onAmountBlur(row)"
                            />
                            <span v-if="row.amount === null" class="unset-badge">待配置</span>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="!skuList.length">
                        <td colspan="4" class="empty-cell">未找到相关游戏规格</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="pagination-bar">
                  <PaginationSimple
                    :current-page="currentPage"
                    :page-size="pageSize"
                    :total="total"
                    :show-batch-actions="false"
                    @current-change="handlePageChange"
                  />
                </div>
              </div>
            </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
 * 全部使用主题 CSS 变量，自动跟随 紫夜星云/深海蓝/翡翠/绯红/暗夜黑金
 * ============================================================ */
.club-config-page {
  height: 100%;
  padding: 24px;
  overflow: hidden;
  background: var(--bg-page);
  box-sizing: border-box;
}

.config-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: 18px;
  padding: 28px 32px;
  box-shadow: var(--panel-shadow);
  border: 1px solid var(--border-soft);
  box-sizing: border-box;
  overflow: hidden;
}

/* 头部 */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-soft);
}

.header-text h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: 0.2px;
}

.header-text p {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--primary-border);
}

.header-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

/* 区块 */
.section {
  margin-bottom: 28px;
}

.section-flex {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 16px;
}

.title-bar {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--primary), var(--primary-deep));
}

/* 接单方式卡片 */
.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.option-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1.5px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elevated);
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-card:hover {
  border-color: var(--primary-border-strong);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px -8px var(--primary-glow);
}

.option-card.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  box-shadow: 0 8px 20px -10px var(--primary-glow-strong);
}

.option-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.option-body {
  flex: 1;
  min-width: 0;
}

.option-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: var(--text-sub);
}

.option-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-invert);
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  box-shadow: 0 4px 10px -3px var(--primary-glow-strong);
}

/* 分润方式 radio */
.profit-options {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.profit-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.18s ease;
}

.profit-radio input {
  accent-color: var(--primary);
  cursor: pointer;
}

.profit-radio.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}

/* 百分比分润面板 */
.percent-panel {
  background: var(--primary-soft);
  border: 1px solid var(--primary-border);
  border-radius: 14px;
  padding: 22px 24px;
  max-width: 460px;
}

.percent-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.percent-label {
  width: 90px;
  font-size: 13px;
  color: var(--text-sub);
  text-align: right;
  margin-right: 18px;
}

.percent-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.percent-field input {
  width: 130px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  background: var(--bg-elevated);
  box-sizing: border-box;
  transition: all 0.18s ease;
}

.percent-field input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-ring);
}

.percent-field input::placeholder {
  color: var(--text-faint);
}

.percent-field .unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-sub);
}

.readonly-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.percent-footer {
  margin-top: 18px;
  padding-left: 108px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 28px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.18s ease;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  color: var(--text-invert);
  box-shadow: 0 8px 20px -6px var(--primary-glow-strong);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-save {
  padding: 8px 20px;
  font-size: 12px;
}

/* 固定值分润 */
.fixed-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border-soft);
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  background: var(--bg-elevated);
  transition: all 0.18s ease;
}

.toolbar-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.toolbar-search .search-icon {
  flex-shrink: 0;
  color: var(--text-faint);
}

.toolbar-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
}

.toolbar-search input::placeholder {
  color: var(--text-faint);
}

.table-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.sku-table {
  width: 100%;
  border-collapse: collapse;
}

.sku-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-thead);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  text-align: left;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-soft);
  white-space: nowrap;
}

.sku-table tbody td {
  padding: 12px 18px;
  font-size: 13px;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-faint);
}

.sku-table tbody tr {
  transition: background 0.15s ease;
}

.sku-table tbody tr:hover {
  background: var(--row-hover);
}

.sku-table tbody tr.unset td {
  background: var(--primary-faint);
}

.col-index {
  width: 56px;
  color: var(--text-faint);
  font-size: 12px;
}

.game-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  background: var(--primary-tint);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
}

.amount-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.amount-wrap input {
  width: 180px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--text-main);
  background: var(--bg-elevated);
  box-sizing: border-box;
  transition: all 0.18s ease;
}

.amount-wrap input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.amount-wrap input::placeholder {
  color: var(--text-faint);
}

.unset-badge {
  font-size: 11px;
  color: var(--primary);
  background: var(--primary-tint);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.empty-cell {
  text-align: center !important;
  color: var(--text-faint);
  padding: 40px 0 !important;
}

/* 分页条 */
.pagination-bar {
  padding: 12px 18px;
  background: var(--bg-toolbar);
  border-top: 1px solid var(--border-soft);
  flex-shrink: 0;
}

.loading-tip {
  padding: 60px 0;
  text-align: center;
  color: var(--text-faint);
  font-size: 13px;
}
</style>
