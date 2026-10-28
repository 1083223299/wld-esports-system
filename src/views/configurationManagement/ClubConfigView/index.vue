<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from '../../../composables/useToast';
import { clubConfigApi } from '../../../api/modules/clubConfig';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';

/**
 * 配置管理 > 俱乐部配置（对齐原型 + 后端 2026-10-23 字段定义）
 * 页面结构（以原型为准）：
 *   1. 打手接单设置 —— 可直接接公共订单 / 必须先由俱乐部接单
 *   2. 打手分润设置 —— 百分比分润 / 按游戏规格固定值分润
 *
 * 接口口径（后端定义）：
 * - GET/PUT /api/club/settings：publicGrab(1/0)、profitMode(PERCENT|FIXED 仅响应)、
 *   playerRate(打手分润，≥0、<100 的整数，允许 0，保存时传)、clubShareRate(100-playerRate 仅展示)
 *   → 接单设置 + 百分比分润共用本接口
 * - GET /api/club/settings/player-profits?keyword&page&pageSize → {total,page,pageSize,list}
 *   list：gameId、gameName、specId、specName、playerFixed、configured(0未填/1已填)
 * - PUT /api/club/settings/player-profits：{ items:[{specId, playerFixed}] }，空行跳过，0及正数、最多两位小数
 *
 * 保存交互（对齐原型）：点击选项/修改数值仅标记未保存，由分润区「提交/保存」统一提交；
 * 顶部徽标提示「有未保存的修改」。
 * 差异记录：原型批注「打手分润 0≤值<100」；后端曾要求「大于0、小于100的整数」，2026-10-26 已确认放开 0 —— 前端按 0-99 校验（与原型一致）。
 */
const { show } = useToast();

/* ================= 俱乐部配置（接单设置 + 百分比分润，共用 /api/club/settings） ================= */
const loading = ref(false);
const saving = ref(false);
const orderDirty = ref(false); // 接单设置是否有未保存修改
const profitDirty = ref(false); // 分润设置是否有未保存修改
const form = reactive({
  orderMode: 'public', // public=公开抢单(publicGrab:1) | club_first=俱乐部先接单(publicGrab:0)
});

const orderModeOptions = [
  { value: 'public', label: '可直接接公共订单', desc: '所有满足条件的订单打手都可以查看' },
  { value: 'club_first', label: '必须先由俱乐部接单，打手仅可接俱乐部接手的订单', desc: '订单先流转至俱乐部，再由俱乐部指派' },
];

function mapPublicGrab(v) {
  return Number(v) === 1 ? 'public' : 'club_first';
}

/* ================= 打手分润设置 ================= */
const profitMode = ref('PERCENT'); // PERCENT | FIXED（来自 settings.profitMode，仅响应）
const playerRate = ref(50); // 打手分润（整数 0-99；settings.playerRate）
const clubShareRate = computed(() => 100 - (Number(playerRate.value) || 0));
const profitLoading = ref(false);
const profitSaving = ref(false);

// 固定值分润：服务端分页（keyword/page/pageSize）
const fixedRows = ref([]); // [{ gameId, gameName, specId, specName, playerFixed, configured }]
const fixedKeyword = ref('');
const fixedPage = ref(1);
const fixedPageSize = 10;
const fixedTotal = ref(0);
let searchTimer = null;

/** 拉取固定分润列表（服务端分页 + 搜索） */
async function fetchFixedProfits() {
  profitLoading.value = true;
  try {
    const r = await clubConfigApi.getPlayerProfits({
      keyword: fixedKeyword.value.trim(),
      page: fixedPage.value,
      pageSize: fixedPageSize,
    });
    fixedRows.value = Array.isArray(r?.list) ? r.list : [];
    fixedTotal.value = Number(r?.total) || 0;
  } catch {
    fixedRows.value = [];
    fixedTotal.value = 0;
  } finally {
    profitLoading.value = false;
  }
}

// 搜索防抖 300ms 后重新拉取（服务端搜索）
watch(fixedKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fixedPage.value = 1;
    fetchFixedProfits();
  }, 300);
});

function handleFixedPageChange(p) {
  fixedPage.value = p;
  fetchFixedProfits();
}

/** 未配置金额（configured=0）优先展示（当前页内排序；原型：优先展示未配置金额的数据） */
const fixedPageRows = computed(() => {
  return [...fixedRows.value].sort((a, b) => Number(a.configured) - Number(b.configured));
});

const fixedEmptyText = computed(() => {
  if (profitLoading.value && !fixedRows.value.length) return '加载中…';
  if (fixedKeyword.value.trim()) return '未搜索到匹配的游戏规格';
  return '暂无游戏规格数据';
});

/* ================= 加载与回填 ================= */
async function fetchConfig() {
  loading.value = true;
  try {
    const res = await clubConfigApi.get();
    if (!res || typeof res !== 'object') return;
    form.orderMode = mapPublicGrab(res.publicGrab);
    if (res.profitMode === 'PERCENT' || res.profitMode === 'FIXED') {
      profitMode.value = res.profitMode;
    }
    if (Number.isFinite(Number(res.playerRate))) playerRate.value = Number(res.playerRate);
    orderDirty.value = false;
    profitDirty.value = false;
    if (profitMode.value === 'FIXED') await fetchFixedProfits();
  } catch {
    // 错误提示已由 request.js 统一 toast
  } finally {
    loading.value = false;
  }
}

function onModeChange() {
  orderDirty.value = true;
}

function onProfitModeChange() {
  profitDirty.value = true;
  if (profitMode.value === 'FIXED') fetchFixedProfits();
}

function onProfitValueChange() {
  profitDirty.value = true;
}

/** 是否有未保存的修改（接单设置或分润设置） */
const hasUnsaved = computed(() => orderDirty.value || profitDirty.value);

/* ================= 保存（统一由「提交/保存」按钮触发） ================= */
function twoDecimal(str) {
  const m = String(str).match(/^-?\d+(\.\d{1,2})?$/);
  return !!m;
}

async function saveAll() {
  if (profitSaving.value) return;

  // 无任何未保存修改 → 直接提示
  if (!orderDirty.value && !profitDirty.value) {
    show('当前没有需要保存的修改', 'warning');
    return;
  }

  // 校验
  if (profitMode.value === 'PERCENT') {
    const p = Number(playerRate.value);
    // 后端口径（2026-10-26 确认）：打手分润 ≥0 且 <100 的整数，允许 0
    if (!Number.isInteger(p) || p < 0 || p > 99) {
      show('打手分润须为 0-99 的整数', 'warning');
      return;
    }
  } else if (profitDirty.value) {
    for (const row of fixedRows.value) {
      if (row.playerFixed === '' || row.playerFixed === undefined || row.playerFixed === null) continue; // 空行跳过
      const v = String(row.playerFixed);
      const a = Number(v);
      if (!twoDecimal(v) || !Number.isFinite(a) || a < 0) {
        show('固定分润金额仅支持输入 0 及正数，最多两位小数', 'warning');
        return;
      }
    }
  }

  profitSaving.value = true;
  try {
    const tasks = [];

    // 接单设置 + 百分比分润 共用 PUT /api/club/settings
    const settingsDirty = orderDirty.value || (profitDirty.value && profitMode.value === 'PERCENT');
    if (settingsDirty) {
      const body = { publicGrab: form.orderMode === 'public' ? 1 : 0 };
      if (profitMode.value === 'PERCENT') body.playerRate = Number(playerRate.value);
      tasks.push(clubConfigApi.save(body));
    }

    // 固定分润 PUT /api/club/settings/player-profits：{items:[{specId, playerFixed}]}，空行跳过
    if (profitDirty.value && profitMode.value === 'FIXED') {
      const items = fixedRows.value
        .filter((r) => r.playerFixed !== '' && r.playerFixed !== undefined && r.playerFixed !== null)
        .map((r) => ({ specId: r.specId, playerFixed: Number(r.playerFixed) }));
      tasks.push(clubConfigApi.savePlayerProfits({ items }));
    }

    await Promise.all(tasks);
    orderDirty.value = false;
    profitDirty.value = false;
    show('配置已保存', 'success');
    if (profitMode.value === 'FIXED') fetchFixedProfits(); // 保存后刷新 configured 状态
  } catch {
    // 后端错误已由 request.js toast；脏标记保留，可重试
  } finally {
    profitSaving.value = false;
  }
}

/* ================= 展示辅助 ================= */
function gameText(row) {
  return row.gameName || `#${row.gameId}`;
}
function specText(row) {
  return row.specName || `#${row.specId}`;
}

onMounted(() => {
  fetchConfig();
});
</script>

<template>
  <div class="club-config-page">
    <div class="config-card">
      <div v-if="loading" class="loading-tip">加载中...</div>

      <template v-else>
        <!-- ============ 页面头部 ============ -->
        <div class="page-header">
          <div class="header-text">
            <h2 class="page-title">俱乐部配置</h2>
            <p class="page-sub">打手接单方式与分润规则配置，保存后即时生效</p>
          </div>
          <span class="header-badge" :class="{ unsaved: hasUnsaved }">
            <span class="dot"></span>
            {{ hasUnsaved ? '有未保存的修改' : '配置已保存' }}
          </span>
        </div>

        <div class="config-body">
          <!-- ============ 打手接单设置 ============ -->
          <div class="config-block">
            <div class="block-head">
              <div class="section-title">
                <span class="title-bar"></span>
                打手接单设置
              </div>
              <span class="block-tag">接单规则</span>
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
                <span class="option-radio-dot" :class="{ on: form.orderMode === opt.value }"></span>
                <div class="option-body">
                  <div class="option-label">{{ opt.label }}</div>
                  <div class="option-desc">{{ opt.desc }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- ============ 打手分润设置 ============ -->
          <div class="config-block">
            <div class="block-head">
              <div class="section-title">
                <span class="title-bar"></span>
                打手分润设置
              </div>
              <span class="block-tag">分润规则</span>
            </div>

            <div class="profit-mode-row">
              <label
                class="option-card profit-mode-card"
                :class="{ active: profitMode === 'PERCENT' }"
              >
                <input
                  v-model="profitMode"
                  type="radio"
                  name="profitMode"
                  value="PERCENT"
                  class="option-radio"
                  @change="onProfitModeChange"
                />
                <span class="mode-icon" :class="{ on: profitMode === 'PERCENT' }">%</span>
                <div class="option-body">
                  <div class="option-label">百分比分润</div>
                  <div class="option-desc">按订单金额百分比分配打手与俱乐部收益</div>
                </div>
                <span class="mode-check" :class="{ on: profitMode === 'PERCENT' }">
                  <svg v-if="profitMode === 'PERCENT'" viewBox="0 0 16 16" width="12" height="12">
                    <path
                      d="M13.5 4.5L6.5 11.5L3 8"
                      stroke="currentColor"
                      stroke-width="2.4"
                      fill="none"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </label>

              <label
                class="option-card profit-mode-card"
                :class="{ active: profitMode === 'FIXED' }"
              >
                <input
                  v-model="profitMode"
                  type="radio"
                  name="profitMode"
                  value="FIXED"
                  class="option-radio"
                  @change="onProfitModeChange"
                />
                <span class="mode-icon" :class="{ on: profitMode === 'FIXED' }">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                    <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.4" />
                    <path d="M5.5 6.5h5M5.5 9.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                  </svg>
                </span>
                <div class="option-body">
                  <div class="option-label">按游戏规格固定值</div>
                  <div class="option-desc">按游戏规格分别设置打手到手金额</div>
                </div>
                <span class="mode-check" :class="{ on: profitMode === 'FIXED' }">
                  <svg v-if="profitMode === 'FIXED'" viewBox="0 0 16 16" width="12" height="12">
                    <path
                      d="M13.5 4.5L6.5 11.5L3 8"
                      stroke="currentColor"
                      stroke-width="2.4"
                      fill="none"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </label>
            </div>

            <!-- 百分比分润 -->
            <div v-if="profitMode === 'PERCENT'" class="percent-config">
              <div class="percent-inner">
                <div class="percent-field">
                  <span class="percent-label">打手分润</span>
                  <div class="percent-input-wrap">
                    <input
                      v-model.number="playerRate"
                      type="number"
                      min="0"
                      max="99"
                      step="1"
                      class="num-input"
                      @input="onProfitValueChange"
                    />
                    <span class="percent-unit">%</span>
                  </div>
                  <span class="percent-hint">仅支持输入整数，0≤值&lt;100</span>
                </div>
                <div class="percent-result">
                  <span class="result-label">俱乐部分润</span>
                  <span class="result-value">{{ clubShareRate }}%</span>
                </div>
                <button
                  class="btn-submit"
                  type="button"
                  :disabled="profitSaving"
                  @click="saveAll"
                >
                  {{ profitSaving ? '提交中…' : '提交' }}
                </button>
              </div>
            </div>

            <!-- 按游戏规格固定值分润 -->
            <div v-else class="spec-profit-config">
              <div class="spec-profit-toolbar">
                <div class="sp-toolbar-left">
                  <span class="sp-search">
                    <svg class="sp-search-icon" viewBox="0 0 16 16" width="13" height="13" fill="none">
                      <circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.4" />
                      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                    </svg>
                    <input
                      v-model="fixedKeyword"
                      type="text"
                      class="search-input"
                      placeholder="游戏规格搜索"
                    />
                  </span>
                  <span class="toolbar-hint">仅展示该俱乐部所拥有的游戏及规格，优先展示未配置金额的数据</span>
                </div>
                <div class="sp-toolbar-right">
                  <button
                    class="btn-save"
                    type="button"
                    :disabled="profitSaving"
                    @click="saveAll"
                  >
                    {{ profitSaving ? '保存中…' : '保存' }}
                  </button>
                </div>
              </div>

              <div v-if="fixedPageRows.length" class="spec-profit-table">
                <div class="spec-profit-head">
                  <span class="sp-col-game">游戏名称</span>
                  <span class="sp-col-spec">游戏规格</span>
                  <span class="sp-col-amount">打手到手金额(元)</span>
                </div>
                <div v-for="(row, idx) in fixedPageRows" :key="`${row.gameId}-${row.specId}-${idx}`" class="spec-profit-row">
                  <span class="sp-col-game">{{ gameText(row) }}</span>
                  <span class="sp-col-spec">{{ specText(row) }}</span>
                  <span class="sp-col-amount">
                    <input
                      v-model="row.playerFixed"
                      type="number"
                      min="0"
                      step="0.01"
                      class="amount-input"
                      @input="onProfitValueChange"
                      :class="{ empty: row.playerFixed === '' }"
                      :placeholder="row.playerFixed === '' ? '未配置' : ''"
                    />
                  </span>
                </div>
              </div>
              <div v-else class="sp-empty">
                <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 4" opacity="0.4" />
                  <path d="M18 20h12M18 26h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.5" />
                </svg>
                <span>{{ fixedEmptyText }}</span>
              </div>
              <div v-if="fixedTotal > fixedPageSize" class="sp-pagination">
                <PaginationSimple
                  :current-page="fixedPage"
                  :page-size="fixedPageSize"
                  :total="fixedTotal"
                  :show-batch-actions="false"
                  @current-change="handleFixedPageChange"
                />
              </div>
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
  border-radius: 20px;
  padding: 28px 32px;
  box-shadow: var(--panel-shadow);
  border: 1px solid var(--border-soft);
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* 卡片顶部柔光装饰线 */
.config-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 32px;
  right: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-border), transparent);
  opacity: 0.7;
}

/* ============ 页面头部 ============ */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}

.page-title {
  margin: 0 0 6px;
  font-size: 19px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: 0.3px;
}

.page-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-faint);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--primary-border);
  letter-spacing: 0.3px;
  transition: all 0.25s ease;
}

/* 有未保存修改：warning 色 */
.header-badge.unsaved {
  background: var(--warning-soft, rgba(230, 162, 60, 0.12));
  color: var(--warning, #e6a23c);
  border-color: var(--warning-border, rgba(230, 162, 60, 0.35));
}

.header-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.header-badge:not(.unsaved) .dot {
  background: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
  animation: badge-pulse 2.4s ease-in-out infinite;
}

.header-badge.unsaved .dot {
  background: currentColor;
  animation: badge-pulse 1.6s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--primary-ring); }
  50% { box-shadow: 0 0 0 5px var(--primary-ring); }
}

/* ============ 配置主体 ============ */
.config-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.config-block {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 20px 22px 22px;
  margin-bottom: 18px;
  transition: border-color 0.25s ease;
}

.config-block:last-child {
  margin-bottom: 0;
}

.config-block:hover {
  border-color: var(--border);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-main);
}

.title-bar {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--primary), var(--primary-deep));
  box-shadow: 0 0 8px 0 var(--primary-glow-strong);
}

.block-tag {
  font-size: 11.5px;
  color: var(--text-faint);
  background: var(--bg-toolbar);
  border: 1px solid var(--border-soft);
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

/* ============ 选项卡片（接单设置 / 分润模式） ============ */
.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profit-mode-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.option-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1.5px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.22s ease;
  overflow: hidden;
}

/* 选中态左侧高亮条 */
.option-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary), var(--primary-deep));
  opacity: 0;
  transition: opacity 0.22s ease;
}

.option-card:hover {
  border-color: var(--primary-border-strong);
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -10px var(--primary-glow);
}

.option-card.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  box-shadow: 0 10px 26px -12px var(--primary-glow-strong);
}

.option-card.active::before {
  opacity: 1;
}

.option-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

/* 接单设置自定义圆形单选 */
.option-radio-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-card);
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.option-radio-dot.on {
  border-color: var(--primary);
  background: radial-gradient(circle at center, var(--primary) 0 42%, transparent 46%);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.option-body {
  flex: 1;
  min-width: 0;
}

.option-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
  line-height: 1.4;
}

.option-desc {
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.55;
}

/* 分润模式图标 */
.mode-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-sub);
  background: var(--bg-toolbar);
  border: 1px solid var(--border-soft);
  flex-shrink: 0;
  transition: all 0.22s ease;
}

.mode-icon.on {
  color: var(--text-invert);
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-color: transparent;
  box-shadow: 0 6px 14px -6px var(--primary-glow-strong);
}

.mode-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-toolbar);
  border: 1px solid var(--border-soft);
  color: var(--text-invert);
  flex-shrink: 0;
  transition: all 0.22s ease;
}

.mode-check.on {
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-color: transparent;
  box-shadow: 0 4px 10px -3px var(--primary-glow-strong);
}

/* ============ 百分比分润 ============ */
.percent-config {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: inset 0 1px 0 0 var(--border-faint);
}

.percent-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.percent-field {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.percent-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
}

.percent-input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 10px;
  height: 38px;
  transition: all 0.2s ease;
}

.percent-input-wrap:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.num-input {
  width: 64px;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 600;
  outline: none;
  font-variant-numeric: tabular-nums;
}

.percent-unit {
  font-size: 13px;
  color: var(--text-sub);
  font-weight: 600;
}

.percent-hint {
  font-size: 12px;
  color: var(--text-faint);
}

/* 俱乐部分润结果块 */
.percent-result {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: var(--primary-tint);
  border: 1px solid var(--primary-border);
  border-radius: 10px;
  padding: 7px 14px;
}

.result-label {
  font-size: 12px;
  color: var(--primary);
}

.result-value {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

/* 提交 / 保存按钮 */
.btn-submit,
.btn-save {
  border: none;
  cursor: pointer;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-invert);
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  box-shadow: 0 6px 16px -6px var(--primary-glow-strong);
  transition: all 0.2s ease;
}

.btn-submit {
  padding: 9px 22px;
}

.btn-save {
  padding: 8px 22px;
}

.btn-submit:hover:not(:disabled),
.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -8px var(--primary-glow-strong);
}

.btn-submit:disabled,
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============ 固定值分润 ============ */
.spec-profit-config {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 0 var(--border-faint);
}

.spec-profit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border-soft);
}

.sp-toolbar-left,
.sp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sp-toolbar-right {
  flex-shrink: 0;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--text-faint);
}

.sp-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 0 10px;
  height: 32px;
  color: var(--text-faint);
  transition: all 0.2s ease;
}

.sp-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
  color: var(--primary);
}

.sp-search-icon {
  flex-shrink: 0;
}

.search-input {
  width: 150px;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 12.5px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-faint);
}

/* 规格表格 */
.spec-profit-table {
  max-height: 300px;
  overflow: auto;
}

.spec-profit-head,
.spec-profit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  font-size: 13px;
  color: var(--text-main);
}

.spec-profit-head {
  position: sticky;
  top: 0;
  background: var(--bg-thead);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  border-bottom: 1px solid var(--border-soft);
  z-index: 1;
  letter-spacing: 0.3px;
}

.spec-profit-row {
  border-bottom: 1px solid var(--border-faint);
  transition: background 0.15s ease;
}

.spec-profit-row:hover {
  background: var(--row-hover);
}

.sp-col-game {
  width: 130px;
  flex-shrink: 0;
  font-weight: 500;
}

.sp-col-spec {
  flex: 1;
  min-width: 0;
  color: var(--text-sub);
}

.sp-col-amount {
  width: 170px;
  flex-shrink: 0;
}

/* 金额输入框 */
.amount-input {
  width: 132px;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s ease;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.amount-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.amount-input.empty {
  color: var(--text-faint);
  font-weight: 400;
}

/* 空态 */
.sp-empty {
  padding: 36px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-faint);
  font-size: 13px;
}

/* 分页 */
.sp-pagination {
  padding: 10px 16px;
  background: var(--bg-toolbar);
  border-top: 1px solid var(--border-soft);
  display: flex;
  justify-content: flex-end;
}

/* 滚动条美化 */
.config-body::-webkit-scrollbar,
.spec-profit-table::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.config-body::-webkit-scrollbar-thumb,
.spec-profit-table::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.config-body::-webkit-scrollbar-thumb:hover,
.spec-profit-table::-webkit-scrollbar-thumb:hover {
  background: var(--text-faint);
}

.loading-tip {
  padding: 60px 0;
  text-align: center;
  color: var(--text-faint);
  font-size: 13px;
}
</style>
