import { request } from '../request';

const { mock } = request;

/**
 * 俱乐部配置
 * - orderMode    接单模式：'public' 可直接接公共订单；'club_first' 必须先由俱乐部接单，打手仅可接俱乐部接手的订单
 * - profitMode   分润模式：'percent' 百分比分润；'fixed' 按游戏规格进行固定值分润
 * - playerPercent 打手分润百分比（0~99 的整数），俱乐部分润 = 100 - playerPercent
 *
 * 固定值分润下，游戏规格列表由 listGameSkus 分页提供；
 * 未配置金额（amount 为 null）的数据优先展示。
 */

// ---------- 初始化配置 ----------
const store = {
  orderMode: 'public',
  profitMode: 'percent',
  playerPercent: 40,
};

// ---------- 生成游戏规格 mock 数据（共 658 条） ----------
const GAMES = [
  { gameName: '三角洲行动', specs: ['护航', '任务', '陪玩', '上分', '代肝'] },
  { gameName: '王者荣耀', specs: ['排位上分', '巅峰赛', '陪玩', '代练', '徽章'] },
  { gameName: '和平精英', specs: ['吃鸡', '陪玩', '上分', '代练'] },
  { gameName: '英雄联盟', specs: ['排位', '匹配陪玩', '云顶', '代练'] },
  { gameName: '原神', specs: ['日常', '深渊', '材料', '活动'] },
  { gameName: '无畏契约', specs: ['排位上分', '陪玩', '代练'] },
];

const skuList = [];
let skuId = 1;
// 共 6 个游戏 × 5 规格 ≈ 30 条/组，循环 ~22 组 = 660 条
for (let round = 1; round <= 22; round++) {
  for (const g of GAMES) {
    for (const s of g.specs) {
      if (skuId > 658) break;
      // 前 200 条故意留空（未配置），用于"未配置优先"展示
      const amount = skuId <= 200 ? null : Number((Math.random() * 100 + 10).toFixed(2));
      skuList.push({
        id: skuId,
        gameName: g.gameName,
        specName: `${s}${round > 1 ? `·档位${round}` : ''}`,
        amount,
      });
      skuId++;
    }
  }
}

// 未配置的排前面，已配置的按 id 排后
skuList.sort((a, b) => {
  const aUnset = a.amount === null ? 0 : 1;
  const bUnset = b.amount === null ? 0 : 1;
  if (aUnset !== bUnset) return aUnset - bUnset;
  return a.id - b.id;
});

export const clubConfigApi = {
  /** 获取俱乐部配置 */
  get: () => mock({ ...store }, 200),

  /** 保存接单模式 / 分润模式 / 百分比 */
  save: (data = {}) =>
    mock(null, 300).then(() => {
      store.orderMode = data.orderMode;
      store.profitMode = data.profitMode;
      store.playerPercent = Number(data.playerPercent);
      return { ...store };
    }),

  /**
   * 分页获取游戏规格列表（固定值分润用）
   * 优先返回未配置金额的数据；支持按游戏名称/规格关键词过滤
   */
  listGameSkus: ({ page = 1, pageSize = 10, keyword = '' } = {}) => {
    const kw = String(keyword || '').trim();
    const pool = kw
      ? skuList.filter((it) => it.gameName.includes(kw) || it.specName.includes(kw))
      : skuList;
    const start = (page - 1) * pageSize;
    const list = pool.slice(start, start + pageSize).map((it) => ({ ...it }));
    return mock({ total: pool.length, list }, 200);
  },

  /** 保存单条规格的打手到手金额 */
  saveSkuAmount: ({ id, amount } = {}) =>
    mock(null, 150).then(() => {
      const row = skuList.find((it) => it.id === id);
      if (row) row.amount = amount === '' || amount === null ? null : Number(amount);
      return { id, amount };
    }),
};
