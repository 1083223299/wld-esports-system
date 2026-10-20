/**
 * 抢单大厅 mock 数据
 * - 所有规格匹配的订单在此展示，分为待抢 / 已抢
 * - 售后中、冻结订单隐藏（前端过滤）
 * - 排序：待抢 > 已抢；待抢中「多人且已有人接单但未满」优先，同级按派单时间倒序
 */
import { reactive } from 'vue';

export const orderStore = reactive({
  claimOrders: [
    // ================= 待抢订单 =================
    // 未配置分润 → 点击抢单报错
    { id: 'clm-1', orderNo: '156252462487', thirdOrderNo: '2455501', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: true, product: '绝密航天/巴克累计2088W双子星(店长强推爽吃)', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '客户急单，请优先处理', claimed: false, profitConfigured: false, tags: [], assignTime: '2026-10-13 09:12:22', createTime: '2026-10-13 09:12:22' },
    { id: 'clm-2', orderNo: '156252462488', thirdOrderNo: '2455502', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W双子星(店长强推爽吃)', assignService: '张三', claimedCount: 0, requiredCount: 2, note: '', claimed: false, profitConfigured: true, tags: [], assignTime: '2026-10-13 09:30:22', createTime: '2026-10-13 09:30:22' },
    // 多人且已有人接单但未满 → 同级中优先展示
    { id: 'clm-3', orderNo: '156252462489', thirdOrderNo: '862512403', channel: '抖音', amount: 158.0, actualAmount: 158.0, gameName: '三角洲行动', spec: '护航', clientType: ['手游'], transfer: false, product: '绝密航天/巴克累计2089W 双子星', assignService: '李四', claimedCount: 1, requiredCount: 2, note: '需两个打手，已有1人接单', claimed: false, profitConfigured: true, tags: ['待发货'], assignTime: '2026-10-13 10:05:22', createTime: '2026-10-13 10:05:22' },
    { id: 'clm-4', orderNo: '156252462490', thirdOrderNo: '2455504', channel: '抖音', amount: 88.0, actualAmount: 88.0, gameName: '王者荣耀', spec: '', clientType: ['手游'], transfer: false, product: '王者荣耀 上分套餐', assignService: '王五', claimedCount: 0, requiredCount: 1, note: '', claimed: false, profitConfigured: true, tags: [], assignTime: '2026-10-13 11:20:22', createTime: '2026-10-13 11:20:22' },
    { id: 'clm-5', orderNo: '156252462491', thirdOrderNo: '2455505', channel: '抖音', amount: 666.0, actualAmount: 666.0, gameName: '三角洲行动', spec: '跑刀', clientType: ['端游', '手游'], transfer: true, product: '绝密航天/巴克累计2088W 双子星', assignService: '李四', claimedCount: 0, requiredCount: 3, note: '端游手游都要，注意区分', claimed: false, profitConfigured: true, tags: ['部分退款'], assignTime: '2026-10-13 13:15:22', createTime: '2026-10-13 13:15:22' },
    // 未配置分润 → 点击抢单报错
    { id: 'clm-6', orderNo: '156252462492', thirdOrderNo: '862512410', channel: '抖音', amount: 128.0, actualAmount: 128.0, gameName: '和平精英', spec: '护航', clientType: ['手游'], transfer: false, product: '和平精英 护航套餐', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '晚上8点后上号', claimed: false, profitConfigured: false, tags: [], assignTime: '2026-10-13 14:02:22', createTime: '2026-10-13 14:02:22' },
    { id: 'clm-7', orderNo: '156252462493', thirdOrderNo: '2455508', channel: '抖音', amount: 227.0, actualAmount: 227.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W 双子星', assignService: '王五', claimedCount: 0, requiredCount: 1, note: '', claimed: false, profitConfigured: true, tags: [], assignTime: '2026-10-13 15:40:22', createTime: '2026-10-13 15:40:22' },
    // ================= 已抢订单 =================
    { id: 'clm-8', orderNo: '156252462494', thirdOrderNo: '2455506', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W双子星(店长强推爽吃)', assignService: '张三', claimedCount: 1, requiredCount: 1, note: '已分配打手，待开始', claimed: true, profitConfigured: true, tags: ['已发货'], assignTime: '2026-10-13 10:42:22', createTime: '2026-10-13 10:42:22' },
    { id: 'clm-9', orderNo: '156252462495', thirdOrderNo: '2455507', channel: '抖音', amount: 158.0, actualAmount: 158.0, gameName: '三角洲行动', spec: '护航', clientType: ['手游'], transfer: false, product: '绝密航天/巴克累计2089W 双子星', assignService: '李四', claimedCount: 1, requiredCount: 2, note: '俱乐部已抢，打手未分配', claimed: true, profitConfigured: true, tags: [], assignTime: '2026-10-13 09:40:22', createTime: '2026-10-13 09:40:22' },
    { id: 'clm-10', orderNo: '156252462496', thirdOrderNo: '2455509', channel: '抖音', amount: 88.0, actualAmount: 88.0, gameName: '王者荣耀', spec: '', clientType: ['手游'], transfer: false, product: '王者荣耀 上分套餐', assignService: '王五', claimedCount: 1, requiredCount: 1, note: '', claimed: true, profitConfigured: true, tags: ['待发货'], assignTime: '2026-10-13 08:20:22', createTime: '2026-10-13 08:20:22' },
    // ================= 隐藏规则演示（售后中 / 冻结 不展示） =================
    { id: 'clm-11', orderNo: '156252462497', thirdOrderNo: '2455510', channel: '抖音', amount: 500.0, actualAmount: 500.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W 双子星', assignService: '李四', claimedCount: 0, requiredCount: 1, note: '', claimed: false, profitConfigured: true, tags: ['售后中'], assignTime: '2026-10-13 16:00:22', createTime: '2026-10-13 16:00:22' },
    { id: 'clm-12', orderNo: '156252462498', thirdOrderNo: '2455511', channel: '抖音', amount: 358.0, actualAmount: 358.0, gameName: '和平精英', spec: '护航', clientType: ['手游'], transfer: false, product: '和平精英 护航套餐', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '', claimed: false, profitConfigured: true, tags: ['冻结'], assignTime: '2026-10-13 17:10:22', createTime: '2026-10-13 17:10:22' },
  ],
});
