/**
 * 订单管理 > 派单消息 mock 数据
 * 字段说明（依据需求文档）：
 * - 订单状态：待处理 / 已接单 / 已拒绝（必填）
 * - 订单标签：售后中、冻结（非必填，展示在游戏行）
 * - 订单号：平台订单号（必填）
 * - 游戏名称 / 游戏规格 / 游戏客户端：必填；客户端支持端游、手游同时存在
 * - 购买项目：必填
 * - 派单客服：必填，展示实名
 * - 接单人数：必填，当前已接单人数 / 所需总人数
 * - 派单备注：非必填，客服填写的内容，无时不展示
 * - 预估到手：必填，俱乐部到手收益金额（此处为计算后的总值）
 */
import { reactive } from 'vue';

export const dispatchStore = reactive({
  orders: [
    // ================= 待处理 =================
    // 未配置分润 + 冻结 + 售后中 → 点击接单分别报错
    { id: 'dp-1', orderNo: '156252462487', thirdOrderNo: '2455501', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '客户急单，请优先处理', status: 'pending', profitConfigured: false, tags: ['冻结', '售后中'], assignTime: '2026-10-15 09:12:22', createTime: '2026-10-15 09:12:22' },
    // 未配置分润 → 点击接单报错
    { id: 'dp-2', orderNo: '156252462488', thirdOrderNo: '2455502', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）', assignService: '张三', claimedCount: 0, requiredCount: 2, note: '需两个打手', status: 'pending', profitConfigured: false, tags: [], assignTime: '2026-10-15 09:30:22', createTime: '2026-10-15 09:30:22' },
    // 冻结标签 → 点击接单报「订单异常」
    { id: 'dp-3', orderNo: '156252462489', thirdOrderNo: '862512403', channel: '抖音', amount: 158.0, actualAmount: 158.0, gameName: '三角洲行动', spec: '护航', clientType: ['手游'], transfer: false, product: '绝密航天/巴克累计2089W 双子星', assignService: '李四', claimedCount: 0, requiredCount: 2, note: '需两个打手，已有1人接单', status: 'pending', profitConfigured: true, tags: ['冻结'], assignTime: '2026-10-15 10:05:22', createTime: '2026-10-15 10:05:22' },
    // 售后中标签 → 点击接单报「订单异常」
    { id: 'dp-4', orderNo: '156252462490', thirdOrderNo: '2455504', channel: '抖音', amount: 88.0, actualAmount: 88.0, gameName: '王者荣耀', spec: '上分', clientType: ['手游'], transfer: false, product: '王者荣耀 上分套餐', assignService: '王五', claimedCount: 0, requiredCount: 1, note: '', status: 'pending', profitConfigured: true, tags: ['售后中'], assignTime: '2026-10-15 11:20:22', createTime: '2026-10-15 11:20:22' },
    // 正常可接单（多人）
    { id: 'dp-5', orderNo: '156252462491', thirdOrderNo: '2455505', channel: '抖音', amount: 666.0, actualAmount: 666.0, gameName: '三角洲行动', spec: '跑刀', clientType: ['端游', '手游'], transfer: true, product: '绝密航天/巴克累计2088W 双子星', assignService: '李四', claimedCount: 0, requiredCount: 3, note: '端游手游都要，注意区分', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 13:15:22', createTime: '2026-10-15 13:15:22' },
    // 正常可接单（单人）
    { id: 'dp-6', orderNo: '156252462492', thirdOrderNo: '862512410', channel: '抖音', amount: 128.0, actualAmount: 128.0, gameName: '和平精英', spec: '护航', clientType: ['手游'], transfer: false, product: '和平精英 护航套餐', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '晚上8点后上号', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 14:02:22', createTime: '2026-10-15 14:02:22' },
    { id: 'dp-7', orderNo: '156252462493', thirdOrderNo: '2455508', channel: '抖音', amount: 227.0, actualAmount: 227.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W 双子星', assignService: '王五', claimedCount: 0, requiredCount: 1, note: '', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 15:40:22', createTime: '2026-10-15 15:40:22' },
    { id: 'dp-8', orderNo: '156252462498', thirdOrderNo: '2455511', channel: '抖音', amount: 358.0, actualAmount: 358.0, gameName: '永劫无间', spec: '任务', clientType: ['端游'], transfer: false, product: '永劫无间 排位代练', assignService: '赵六', claimedCount: 0, requiredCount: 2, note: '分两班打，注意账号安全', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 16:10:22', createTime: '2026-10-15 16:10:22' },
    // ================= 已接单 =================
    { id: 'dp-9', orderNo: '156252462494', thirdOrderNo: '2455506', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）', assignService: '张三', claimedCount: 1, requiredCount: 1, note: '已分配打手，待开始', status: 'accepted', profitConfigured: true, tags: [], assignTime: '2026-10-15 10:42:22', createTime: '2026-10-15 10:42:22' },
    { id: 'dp-10', orderNo: '156252462495', thirdOrderNo: '2455507', channel: '抖音', amount: 158.0, actualAmount: 158.0, gameName: '三角洲行动', spec: '护航', clientType: ['手游'], transfer: false, product: '绝密航天/巴克累计2089W 双子星', assignService: '李四', claimedCount: 1, requiredCount: 2, note: '俱乐部已接单，打手未分配', status: 'accepted', profitConfigured: true, tags: [], assignTime: '2026-10-15 09:40:22', createTime: '2026-10-15 09:40:22' },
    { id: 'dp-11', orderNo: '156252462496', thirdOrderNo: '2455509', channel: '抖音', amount: 88.0, actualAmount: 88.0, gameName: '王者荣耀', spec: '上分', clientType: ['手游'], transfer: false, product: '王者荣耀 上分套餐', assignService: '王五', claimedCount: 1, requiredCount: 1, note: '', status: 'accepted', profitConfigured: true, tags: [], assignTime: '2026-10-15 08:20:22', createTime: '2026-10-15 08:20:22' },
    { id: 'dp-12', orderNo: '156252462499', thirdOrderNo: '2455512', channel: '抖音', amount: 520.0, actualAmount: 520.0, gameName: '金铲铲之战', spec: '陪练', clientType: ['手游'], transfer: false, product: '金铲铲之战 大师陪练', assignService: '孙七', claimedCount: 2, requiredCount: 2, note: '已满员', status: 'accepted', profitConfigured: true, tags: ['冻结'], assignTime: '2026-10-15 12:30:22', createTime: '2026-10-15 12:30:22' },
    // ================= 已拒绝 =================
    { id: 'dp-13', orderNo: '156252462500', thirdOrderNo: '2455513', channel: '抖音', amount: 300.0, actualAmount: 300.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W 双子星', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '分润比例过低，拒绝', status: 'rejected', profitConfigured: true, tags: [], assignTime: '2026-10-15 11:50:22', createTime: '2026-10-15 11:50:22' },
    { id: 'dp-14', orderNo: '156252462501', thirdOrderNo: '2455514', channel: '抖音', amount: 168.0, actualAmount: 168.0, gameName: '和平精英', spec: '护航', clientType: ['手游'], transfer: false, product: '和平精英 护航套餐', assignService: '李四', claimedCount: 0, requiredCount: 2, note: '', status: 'rejected', profitConfigured: true, tags: ['售后中'], assignTime: '2026-10-15 10:18:22', createTime: '2026-10-15 10:18:22' },
    { id: 'dp-15', orderNo: '156252462502', thirdOrderNo: '2455515', channel: '抖音', amount: 99.0, actualAmount: 99.0, gameName: '王者荣耀', spec: '上分', clientType: ['手游'], transfer: false, product: '王者荣耀 上分套餐', assignService: '王五', claimedCount: 0, requiredCount: 1, note: '客户要求太高，拒绝', status: 'rejected', profitConfigured: true, tags: [], assignTime: '2026-10-15 09:05:22', createTime: '2026-10-15 09:05:22' },
    { id: 'dp-16', orderNo: '156252462503', thirdOrderNo: '2455516', channel: '抖音', amount: 238.0, actualAmount: 238.0, gameName: '三角洲行动', spec: '跑刀', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2088W 双子星', assignService: '赵六', claimedCount: 0, requiredCount: 1, note: '', status: 'rejected', profitConfigured: true, tags: ['冻结'], assignTime: '2026-10-15 08:45:22', createTime: '2026-10-15 08:45:22' },
    // 更多待处理，用于分页演示
    { id: 'dp-17', orderNo: '156252462504', thirdOrderNo: '2455517', channel: '快手', amount: 268.0, actualAmount: 268.0, gameName: '三角洲行动', spec: '任务', clientType: ['端游'], transfer: false, product: '绝密航天/巴克累计2090W 双子星', assignService: '张三', claimedCount: 0, requiredCount: 1, note: '', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 17:02:22', createTime: '2026-10-15 17:02:22' },
    { id: 'dp-18', orderNo: '156252462505', thirdOrderNo: '2455518', channel: '抖音', amount: 148.0, actualAmount: 148.0, gameName: '永劫无间', spec: '护航', clientType: ['端游'], transfer: false, product: '永劫无间 护航套餐', assignService: '孙七', claimedCount: 0, requiredCount: 2, note: '需两个打手', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 17:25:22', createTime: '2026-10-15 17:25:22' },
    { id: 'dp-19', orderNo: '156252462506', thirdOrderNo: '2455519', channel: '抖音', amount: 388.0, actualAmount: 388.0, gameName: '金铲铲之战', spec: '陪练', clientType: ['手游'], transfer: false, product: '金铲铲之战 宗师陪练', assignService: '李四', claimedCount: 0, requiredCount: 1, note: '客户要求语音沟通', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 18:00:22', createTime: '2026-10-15 18:00:22' },
    { id: 'dp-20', orderNo: '156252462507', thirdOrderNo: '2455520', channel: '快手', amount: 218.0, actualAmount: 218.0, gameName: '和平精英', spec: '任务', clientType: ['手游'], transfer: false, product: '和平精英 上分套餐', assignService: '王五', claimedCount: 0, requiredCount: 1, note: '', status: 'pending', profitConfigured: true, tags: ['售后中'], assignTime: '2026-10-15 18:20:22', createTime: '2026-10-15 18:20:22' },
    { id: 'dp-21', orderNo: '156252462508', thirdOrderNo: '2455521', channel: '抖音', amount: 468.0, actualAmount: 468.0, gameName: '三角洲行动', spec: '跑刀', clientType: ['端游', '手游'], transfer: true, product: '绝密航天/巴克累计2091W 双子星', assignService: '张三', claimedCount: 0, requiredCount: 2, note: '端游手游各一名', status: 'pending', profitConfigured: true, tags: [], assignTime: '2026-10-15 18:40:22', createTime: '2026-10-15 18:40:22' },
  ],
});
