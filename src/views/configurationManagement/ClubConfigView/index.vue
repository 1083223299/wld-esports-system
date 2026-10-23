<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from '../../../composables/useToast';
import { clubConfigApi } from '../../../api/modules/clubConfig';
import PaginationSimple from '../../../components/PaginationSimple/index.vue';

/**
 * 配置管理 > 俱乐部配置（真实接口联调）
 * - GET  /api/club/settings   俱乐部配置 → { publicGrab }
 * - PUT  /api/club/settings   保存俱乐部配置 → { publicGrab }
 * - GET  /api/club/specs/mine 本俱乐部规格 → { specs, clubSpecs }
 *
 * 字段映射：
 * - publicGrab=1（公开抢单）  ↔ orderMode='public'（可直接接公共订单）
 * - publicGrab=0（俱乐部先接）↔ orderMode='club_first'（必须先由俱乐部接单）
 * - 切换接单模式即自动保存（配置实时生效），失败由 request.js 统一 toast
 *
 * 规格名称预留：接口仅返回 gameId / specIds，暂无游戏·规格目录接口，
 * 表格暂以原始 ID 展示；接入目录接口后可在 specText 补充名称解析。
 */
const { show } = useToast();

// ============ 俱乐部配置 ============
const loading = ref(false);
const saving = ref(false);
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

async function fetchConfig() {
  loading.value = true;
  try {
    const res = await clubConfigApi.get();
    form.orderMode = mapPublicGrab(res?.publicGrab);
  } catch {
    // 错误提示已由 request.js 统一 toast
  } finally {
    loading.value = false;
  }
}

// 切换接单模式即保存（配置实时生效）
async function onModeChange() {
  if (saving.value) return;
  saving.value = true;
  try {
    await clubConfigApi.save({ publicGrab: form.orderMode === 'public' ? 1 : 0 });
    show('配置已保存', 'success');
  } catch {
    // 后端错误已由 request.js toast
  } finally {
    saving.value = false;
  }
}

// ============ 本俱乐部可接规格 ============
const specsLoading = ref(false);
const specGroups = ref([]); // [{ source: '本账号'|'所属俱乐部', gameId, all, specIds }]
const page = ref(1);
const pageSize = ref(10);

async function fetchMySpecs() {
  specsLoading.value = true;
  try {
    const res = await clubConfigApi.getMySpecs();
    const rows = [];
    (Array.isArray(res?.specs) ? res.specs : []).forEach((it) =>
      rows.push({ ...it, source: '本账号' })
    );
    (Array.isArray(res?.clubSpecs) ? res.clubSpecs : []).forEach((it) =>
      rows.push({ ...it, source: '所属俱乐部' })
    );
    specGroups.value = rows;
    page.value = 1;
  } catch {
    specGroups.value = [];
  } finally {
    specsLoading.value = false;
  }
}

// all=true 或 specIds 为空均表示该游戏全部规格可接
function specText(row) {
  if (row.all || !Array.isArray(row.specIds) || !row.specIds.length) return '全部规格';
  return row.specIds.join(' / ');
}

const rows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return specGroups.value.slice(start, start + pageSize.value);
});
const total = computed(() => specGroups.value.length);

function handlePageChange(p) {
  page.value = p;
}

onMounted(() => {
  fetchConfig();
  fetchMySpecs();
});
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
              </div>
              <div class="header-actions">
                <span class="header-badge">
                  <span class="dot"></span>
                  配置实时生效
                </span>
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

            <!-- 本俱乐部可接规格 -->
            <div class="section section-flex">
              <div class="section-title">
                <span class="title-bar"></span>
                本俱乐部可接规格
              </div>

              <div class="fixed-panel">
                <div class="table-toolbar">
                  <span class="toolbar-title">游戏规格</span>
                  <span class="toolbar-hint">来源：本俱乐部规格接口</span>
                </div>

                <div class="table-wrap">
                  <table class="sku-table">
                    <thead>
                      <tr>
                        <th class="col-index">#</th>
                        <th class="col-source">来源</th>
                        <th class="col-game">游戏 ID</th>
                        <th class="col-spec">可接规格</th>
                      </tr>
                    </thead>
                    <tbody v-if="specsLoading">
                      <tr>
                        <td colspan="4" class="empty-cell">加载中...</td>
                      </tr>
                    </tbody>
                    <tbody v-else>
                      <tr v-for="(row, idx) in rows" :key="`${row.source}-${row.gameId}`">
                        <td class="col-index">{{ (page - 1) * pageSize + idx + 1 }}</td>
                        <td class="col-source">
                          <span class="game-tag" :class="{ 'club-tag': row.source === '所属俱乐部' }">
                            {{ row.source }}
                          </span>
                        </td>
                        <td class="col-game">
                          <span class="game-id">#{{ row.gameId }}</span>
                        </td>
                        <td class="col-spec">{{ specText(row) }}</td>
                      </tr>
                      <tr v-if="!rows.length">
                        <td colspan="4" class="empty-cell">暂无规格数据</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="pagination-bar">
                  <PaginationSimple
                    :current-page="page"
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

/* 可接规格面板 */
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

.toolbar-hint {
  font-size: 12px;
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

.col-index {
  width: 56px;
  color: var(--text-faint);
  font-size: 12px;
}

.col-source {
  width: 110px;
}

.col-game {
  width: 120px;
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

/* 所属俱乐部来源：描边样式与「本账号」区分 */
.club-tag {
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary-border-strong);
}

.game-id {
  font-size: 12px;
  color: var(--text-sub);
  font-variant-numeric: tabular-nums;
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
