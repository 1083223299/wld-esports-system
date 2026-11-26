import { request } from '../request';

// =====================================================================
// 游戏货架 / 规格管理：已按 OpenAPI 联调真实后端（鉴权走 request.js 自动附加 Bearer token）
//   GET    /api/admin/games                  游戏列表（服务端分页/筛选：id/name/createdFrom/createdTo/page/pageSize，
//                                                 返回分页对象，list 项含内联 specs[{id,gameId,name}]）
//   POST   /api/admin/games                  新增游戏   body: { name, settleDays, specs }
//   PUT    /api/admin/games/{id}             编辑游戏   body: { name, settleDays, specs? }
//   DELETE /api/admin/games/{id}             删除游戏（软删）
//   GET    /api/admin/games/{gameId}/specs   规格列表
//   POST   /api/admin/games/{gameId}/specs   新增规格   body: { name }
//   PUT    /api/admin/games/{gameId}/specs/{id}  编辑规格   body: { name }
//   DELETE /api/admin/games/{gameId}/specs/{id}  删除规格（软删）
//
// 说明（接口文档 2026-10 更新，测试服已验证）：
//   - 新增/编辑游戏时规格随主表单内联提交：specs 为数组，元素可为 { name } 对象或字符串，
//     后端亦兼容 specNames 旧字段；前端统一转为 [{ name }]；
//   - 编辑为“补齐”语义：PUT 只会新增缺失的规格、保持已有规格，不会删除表单中移除的行；
//     表单中删除的规格由前端显式调用 DELETE /games/{gameId}/specs/{id}；
//   - 同游戏下规格名称唯一：游戏保存接口静默跳过同名规格不报错；
//     单独新增/改名规格接口才返回 code 409「规格名称已存在」；
//   - 存单表单（holdForm）不再由表单提交，后端按游戏名称自动判定：
//     名称含「三角洲」（包含匹配，如「三角洲行动」）记保底 WARRANTY，其余记备注 REMARK；
//     编辑时不传 holdForm，保持原值，不会因改名重新判定；
//   - 校验口径（新增/编辑一致，HTTP 均为 200、看响应体 code；仅禁止操作才是 HTTP 403）：
//     游戏名重复 → code 409「游戏名称已存在」（编辑时改成自己原来的名字可通过）；
//     游戏名超 15 字 → code 400「游戏名称最多15字」；
//     settleDays 不传/0/负数/小数/非数字 → code 400「请填写账期天数」（编辑时不传则保持原天数）；
//   - 规格独立接口保留，供规格列表/下拉与 SKU 映射等场景使用；
//   - SKU 映射已接入商品聚合、SKU 明细、同步及编辑接口，见文件尾部。
// =====================================================================

/**
 * 兼容后端返回结构差异，归一化为数组：
 * 数组原样返回；对象则尝试提取 list / records / items / data 数组字段；其余返回空数组
 * @param {any} value
 * @returns {Array}
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.list)) return value.list;
    if (Array.isArray(value.records)) return value.records;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
  }
  return [];
}

/** 规格归一化：字符串或 { name } 对象统一转为 { name }（与接口文档示例一致） */
function normalizeSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs.map((s) => (typeof s === 'string' ? { name: s } : s));
}

function normalizeSkuMatchedFilter(value) {
  const matched = String(value ?? '').trim();
  if (matched === 'matched' || matched === '已匹配' || matched === 'true') return '1';
  if (matched === 'unmatched' || matched === '未匹配' || matched === 'false') return '0';
  return matched;
}

export const gameApi = {
  // ============ 游戏主表 ============

  /**
   * 游戏列表（服务端分页/筛选，GET /api/admin/games）
   * 接口支持 specNo（货架编号，完全匹配）/id（完全匹配）/name（模糊）/createdFrom/createdTo/page/pageSize；
   * 返回分页对象 data{total,page,pageSize,list}，list 项含内联 specs[{id,gameId,name}]
   * @param {{page?:number,pageSize?:number,specNo?:string,id?:number|string,name?:string,createdFrom?:string,createdTo?:string}} params
   * @returns {Promise<{total:number,list:Array<{id:number,name:string,settleDays?:number,holdForm?:string,createdAt?:string,specs?:Array}>}>}
   */
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    const { page = 1, pageSize = 20, specNo = '', id = '', name = '', createdFrom = '', createdTo = '' } = params;
    if (specNo) qs.set('specNo', String(specNo).trim());
    if (id !== '') qs.set('id', String(id).trim());
    if (name) qs.set('name', String(name).trim());
    if (createdFrom) qs.set('createdFrom', String(createdFrom).trim());
    if (createdTo) qs.set('createdTo', String(createdTo).trim());
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    const query = qs.toString();
    const res = await request.get(`/api/admin/games${query ? `?${query}` : ''}`);
    const data = res?.data ?? res;
    if (Array.isArray(data)) {
      // 兼容旧结构：data 直接为数组
      return { total: data.length, list: data };
    }
    return { total: data?.total ?? 0, list: toArray(data) };
  },

  /**
   * 游戏全量（循环拉取供下拉选择：SKU 映射/玩家/俱乐部），每页 100 条直至取完
   * @returns {Promise<Array>} 与 list 返回的 list 项结构一致
   */
  listAll: async () => {
    const pageSize = 100;
    let page = 1;
    const all = [];
    for (;;) {
      const { total, list } = await gameApi.list({ page, pageSize });
      all.push(...list);
      if (!list.length || all.length >= total || list.length < pageSize) break;
      page += 1;
    }
    return all;
  },

  /**
   * 新增游戏（规格内联提交，specs 元素可为字符串或 { name }）
   * 额外透传原型新增字段：logo（游戏logo）、customOrderEnabled（用户自定义下单开关，字段名待后端确认）
   * @param {{name:string, settleDays:number, specs:Array<string|{name:string}>, logo?:string, customOrderEnabled?:number|boolean}} data
   */
  create: ({ name, settleDays, specs, ...extra }) =>
    request.post('/api/admin/games', { name, settleDays, specs: normalizeSpecs(specs), ...extra }),

  /**
   * 编辑游戏；提供 specs 时补齐规格，不提供时只更新游戏字段
   * 额外透传 logo / customOrderEnabled（字段名待后端确认）
   * @param {number} id
   * @param {{name:string, settleDays:number, specs?:Array<string|{name:string}>, logo?:string, customOrderEnabled?:number|boolean}} data
   */
  update: (id, { name, settleDays, specs, ...extra }) => {
    const data = { name, settleDays, ...extra };
    if (specs !== undefined) data.specs = normalizeSpecs(specs);
    return request.put(`/api/admin/games/${id}`, data);
  },

  /** 删除游戏（软删） @param {number} id */
  remove: (id) => request.del(`/api/admin/games/${id}`),

  // ============ 游戏规格 ============

  /** 为指定游戏追加规格 */
  importSpecs: (gameId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.upload(`/api/admin/games/${encodeURIComponent(gameId)}/specs/import`, formData, { notifyErrors: false });
  },

  /** 规格列表（返回已归一化数组）@param {number} gameId */
  specs: async (gameId, { includeId } = {}) => {
    const query = includeId != null ? `?includeId=${encodeURIComponent(includeId)}` : '';
    return toArray(await request.get(`/api/admin/games/${gameId}/specs${query}`));
  },

  /**
   * 跨游戏规格文案联想（GET /api/admin/games/specs/search）
   * @param {{keyword:string,page?:number,pageSize?:number}} params
   */
  searchSpecs: async ({ keyword, page = 1, pageSize = 20 } = {}) => {
    const qs = new URLSearchParams({
      keyword: String(keyword || '').trim(),
      page: String(page),
      pageSize: String(pageSize),
    });
    const data = await request.get(`/api/admin/games/specs/search?${qs.toString()}`);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.specs)) return data.specs;
    return toArray(data);
  },

  /**
   * 规格分页列表，keyword 支持按规格名称或货架编号模糊搜索
   * @param {number} gameId
   * @param {{keyword?:string,page?:number,pageSize?:number}} params
   */
  listSpecs: async (gameId, { keyword = '', page = 1, pageSize = 20 } = {}) => {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const normalizedKeyword = String(keyword || '').trim();
    if (normalizedKeyword) qs.set('keyword', normalizedKeyword);
    const response = await request.get(`/api/admin/games/${gameId}/specs?${qs.toString()}`);
    const data = response?.data ?? response;
    if (Array.isArray(data)) {
      return { total: data.length, page, pageSize, list: data };
    }
    const list = toArray(data);
    return {
      total: Number(data?.total) || list.length,
      page: Number(data?.page) || page,
      pageSize: Number(data?.pageSize) || pageSize,
      list,
    };
  },

  /** 新增规格 @param {number} gameId @param {string} name */
  createSpec: (gameId, name) => request.post(`/api/admin/games/${gameId}/specs`, { name }),

  /** 编辑规格 @param {number} gameId @param {number} id @param {string} name */
  updateSpec: (gameId, id, name) =>
    request.put(`/api/admin/games/${gameId}/specs/${id}`, { name }),

  /** 删除规格（软删） @param {number} gameId @param {number} id */
  removeSpec: (gameId, id) => request.del(`/api/admin/games/${gameId}/specs/${id}`),

  /** 全部游戏（供 SKU 映射 / 玩家 / 俱乐部下拉选择），附带各游戏规格名 */
  all: async () => {
    const games = await gameApi.listAll();
    return Promise.all(
      games.map(async (g) => {
        let specs = [];
        try {
          specs = toArray(await gameApi.specs(g.id));
        } catch {
          // 单个游戏规格拉取失败不阻塞整个下拉列表
        }
        return { id: g.id, name: g.name, specs: specs.map((s) => s.name ?? s) };
      })
    );
  },

  // =====================================================================
  // SKU 映射：商品聚合、SKU 明细、商品同步和映射编辑均使用真实接口
  //   GET /api/admin/sku-mappings/products 商品聚合列表
  //   GET /api/admin/sku-mappings   列表（含 specNo、skuCode、shelfNo）：
  //                                  Query 支持 shopId/productId/skuId(完全匹配)/itemName(模糊)/
  //                                  gameId/gameName(模糊)/matched(已匹配/未匹配，或1/0)/page/pageSize；
  //                                  返回分页对象 {total,page,pageSize,list}（兼容旧数组返回）
  //   PUT /api/admin/sku-mappings   保存  body: { id?, shopId, productId, skuId, gameId, specId, clients?, itemName? }
  // 列表行字段（spec）：{ id, shopId, productId, skuId, gameId, specId, specNo, skuCode, shelfNo, clients, itemName }
  //   - clients 枚举 PC / MOBILE（也允许自由字符串）；
  //   - 行内不返回 shopName，店铺名由页面用 shopId 对照渠道表反查。
  // =====================================================================

  /** 客户端枚举：后端 PC/MOBILE → 页面中文 */
  _CLIENT_EN: { PC: '端游', MOBILE: '手游' },
  /** 页面中文 → 后端枚举（多选时逗号分隔） */
  _CLIENT_CN: { 端游: 'PC', 手游: 'MOBILE' },

  /**
   * 商品聚合列表（GET /api/admin/sku-mappings/products）
   * @param {{page?:number,pageSize?:number,shopId?:string,productId?:string,skuId?:string,skuName?:string,matched?:string}} params
   * @returns {Promise<{total:number,list:Array<{shopId:string,shopName:string,productId:string,productName:string,skuCount:number,matchedCount:number}>}>}
   */
  skuProducts: async (params = {}) => {
    const {
      page = 1,
      pageSize = 20,
      shopId = '',
      productId = '',
      skuId = '',
      skuName = '',
      matched = '',
    } = params;
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (shopId) qs.set('shopId', String(shopId).trim());
    if (productId) qs.set('productId', String(productId).trim());
    if (skuId) qs.set('skuId', String(skuId).trim());
    if (skuName) qs.set('itemName', String(skuName).trim());
    const matchedParam = normalizeSkuMatchedFilter(matched);
    if (matchedParam) qs.set('matched', matchedParam);

    const response = await request.get(`/api/admin/sku-mappings/products?${qs.toString()}`);
    const data = response?.data ?? response;
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.items)
          ? data.items
          : [];
    return {
      total: Array.isArray(data) ? list.length : Number(data?.total) || list.length,
      list,
    };
  },

  /** 删除指定店铺下的商品配置及其 SKU 关联 */
  deleteSkuProduct: ({ shopId, productId }) => {
    const query = new URLSearchParams({
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
    });
    return request.del(`/api/admin/sku-mappings/products?${query.toString()}`);
  },

  /**
   * 只读预览商品及其 SKU，不写入目录或映射。
   * GET /api/admin/sku-mappings/sync/preview
   * 返回商品信息及 list，每个 SKU 通过 diffStatus 标记新增、更新或无变动，并包含 shelfNo。
   */
  previewSkuProduct: ({ shopId, productId }) => {
    const query = new URLSearchParams({
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
    });
    return request.get(`/api/admin/sku-mappings/sync/preview?${query.toString()}`);
  },

  /**
   * SKU 映射列表（GET /api/admin/sku-mappings）
   * 服务端筛选/分页：skuId 完全匹配、itemName 模糊（页面 skuName 字段映射）、matched 已匹配/未匹配
   * @param {{page?:number,pageSize?:number,shopId?:string,productId?:string,skuId?:string,skuName?:string,matched?:string,gameId?:number}} params
   * @returns {Promise<{total:number,list:Array}>}
   *   list 项还包含 {specNo, skuCode, shelfNo} 货架相关字段。
   */
  skuList: async (params = {}) => {
    const { page = 1, pageSize = 10, shopId = '', productId = '', skuId = '', skuName = '', matched = '', gameId = '' } = params;
    const qs = new URLSearchParams();
    if (page) qs.set('page', String(page));
    if (pageSize) qs.set('pageSize', String(pageSize));
    if (shopId) qs.set('shopId', String(shopId).trim());
    if (productId) qs.set('productId', String(productId).trim());
    if (skuId) qs.set('skuId', String(skuId).trim()); // 完全匹配
    const kwSkuName = String(skuName || '').trim();
    if (kwSkuName) qs.set('itemName', kwSkuName); // 模糊匹配（后端参数名 itemName）
    const gid = gameId ? Number(gameId) : '';
    if (gid !== '') qs.set('gameId', String(gid));
    const matchedParam = normalizeSkuMatchedFilter(matched);
    if (matchedParam) qs.set('matched', matchedParam);
    const query = qs.toString();
    const res = await request.get(`/api/admin/sku-mappings${query ? `?${query}` : ''}`);
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.list)
        ? res.list
        : Array.isArray(res?.items)
          ? res.items
          : [];
    const total = Array.isArray(res) ? list.length : (res && res.total) || list.length;
    return { total, list };
  },

  /** 商品维度 SKU 列表，支持 SKU ID 和名称模糊筛选 */
  skuListByProduct: async ({ shopId, productId, skuId = '', itemName = '', page = 1, pageSize = 200 }) => {
    const qs = new URLSearchParams({
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
      page: String(page),
      pageSize: String(pageSize),
    });
    const skuIdKeyword = String(skuId || '').trim();
    const itemNameKeyword = String(itemName || '').trim();
    if (skuIdKeyword) qs.set('skuId', skuIdKeyword);
    if (itemNameKeyword) qs.set('itemName', itemNameKeyword);

    const res = await request.get(`/api/admin/sku-mappings/by-product?${qs.toString()}`);
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.list)
        ? res.list
        : Array.isArray(res?.items)
          ? res.items
          : [];
    const total = Array.isArray(res) ? list.length : (Number(res?.total) || list.length);
    return { total, list };
  },

  /**
   * 同步指定店铺的商品及 SKU，可同时保存 SKU 客户端设置。
   * list: [{ skuId, clients }]，clients 支持字符串或数组。
   */
  syncSkuProduct: ({ shopId, productId, list }) => {
    const body = {
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
    };
    if (Array.isArray(list)) {
      body.list = list.map(({ skuId, clients }) => ({
        skuId: String(skuId || '').trim(),
        clients: Array.isArray(clients)
          ? clients.map((client) => String(client).trim()).filter(Boolean)
          : String(clients || ''),
      }));
    }
    return request.post('/api/admin/sku-mappings/sync', body);
  },

  /** 批量保存商品下 SKU 客户端设置 */
  updateSkuClients: ({ shopId, productId, list }) =>
    request.put('/api/admin/sku-mappings/clients', {
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
      list: (Array.isArray(list) ? list : []).map(({ skuId, clients }) => ({
        skuId: String(skuId || '').trim(),
        clients: Array.isArray(clients)
          ? clients.map((client) => String(client).trim()).filter(Boolean)
          : String(clients || ''),
      })),
    }),

  /** 预览 SKU 规则补全，不落库 */
  suggestSkuMappings: (data) => request.post('/api/admin/sku-mappings/suggest', data),

  /** 落库已确认的 SKU 规则补全建议 */
  applySkuMappingSuggestions: (data) =>
    request.post('/api/admin/sku-mappings/suggest/apply', data),

  /** 导出指定店铺下单个商品的 SKU 映射 */
  exportSkuProduct: ({ shopId, productId }) => {
    const query = new URLSearchParams({
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
    });
    return request.download(`/api/admin/sku-mappings/products/export?${query.toString()}`, { notifyErrors: false });
  },

  /** 导入指定店铺下单个商品的 SKU 客户端映射 */
  importSkuProduct: ({ shopId, productId, file }) => {
    const query = new URLSearchParams({
      shopId: String(shopId || '').trim(),
      productId: String(productId || '').trim(),
    });
    const formData = new FormData();
    formData.append('file', file);
    return request.upload(`/api/admin/sku-mappings/products/import?${query.toString()}`, formData, { notifyErrors: false });
  },
};
