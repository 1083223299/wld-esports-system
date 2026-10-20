/**
 * 订单管理 > 我的订单 mock 数据
 * 字段口径见需求：
 * - orderStatus: pending 待接单(x/y) / processing 进行中 / completed 已完成 / closed 交易关闭
 * - tags: 售后中 / 冻结 / 部分退款（悬浮订单号展示下单用户）
 * - auditStatus: '' 主订单 / none 未提交 / pending 待审核 / rejected 已驳回
 * - isMain: 是否主订单（主订单审核列展示「主订单 查看关系」）
 * - transferred: 是否已转单（已转单则加减价按钮隐藏）
 * - 操作按钮规则：
 *   1. 冻结 / 售后中标签 → 无加减价、无转单，仅「查看」
 *   2. 已转单 → 隐藏加减价
 *   3. 部分退款 → 隐藏加减价（涉部分退款，加减价失效）
 */
import { reactive } from 'vue';

// 订单状态选项（筛选用）
export const ORDER_STATUS_OPTIONS = [
  { label: '待接单', value: 'pending' },
  { label: '进行中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '交易关闭', value: 'closed' },
];

// 旗下打手（转单弹框用）
export const PLAYER_OPTIONS = [
  { label: '张三 (144587)', value: '144587' },
  { label: '李四 (121651)', value: '121651' },
  { label: '赵六 (121656)', value: '121656' },
  { label: '钱七 (133890)', value: '133890' },
];

export const orderStore = reactive({
  myOrders: [
    // 1. 待接单 1/2，主订单 → 查看 + 加减价
    {
      id: 'mo-1', orderNo: '2455415', customerTip: '微信用户1780993581',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['端游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'pending', tags: [], auditStatus: '', isMain: true,
      claimedCount: 1, requiredCount: 2, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      // 详情
      orderType: '常规单', teamCode: '', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [
        { name: '张三', id: '1216516', club: '李四俱乐部', acceptTime: '2026-10-10 11:12:22', transferTime: '' },
      ],
      profit: { adjustText: '-20元', clubShare: '40.12', playerShareText: '40.12元-20.12元+20.00元', adjustInvalid: false },
      logs: [
        { time: '2026-09-19 10:00', text: '渠道下单', operator: '' },
        { time: '2026-09-19 11:00', text: '派单 → 打手 小鹿#4410', operator: '' },
        { time: '2026-09-21 22:00', text: '提交凭证，客服审核通过', operator: '' },
        { time: '2026-09-21 22:30', text: '订单完成，进入7天账期', operator: '' },
      ],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: '', rejectReason: '', orderRemark: '',
      relation: { main: '2455415', subs: ['2455415'] },
    },
    // 2. 进行中 手游，未提交 → 查看 + 转单
    {
      id: 'mo-2', orderNo: '2455415', customerTip: '',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['手游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'processing', tags: [], auditStatus: 'none', isMain: false,
      claimedCount: 1, requiredCount: 1, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [
        { name: '张三', id: '1216516', club: '李四俱乐部', acceptTime: '2026-10-10 11:12:22', transferTime: '' },
      ],
      profit: { adjustText: '-20元', clubShare: '40.12', playerShareText: '40.12元-20.12元+20.00元', adjustInvalid: false },
      logs: [
        { time: '2026-09-19 10:00', text: '渠道下单', operator: '' },
        { time: '2026-09-19 11:00', text: '派单 → 打手 小鹿#4410', operator: '' },
      ],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: '', rejectReason: '', orderRemark: '',
      relation: { main: '2455415', subs: ['2455415'] },
    },
    // 3. 进行中 手游/端游，售后中+冻结+部分退款，待审核 → 仅查看
    {
      id: 'mo-3', orderNo: '2455415', customerTip: '微信用户1780993581',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['手游', '端游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'processing', tags: ['售后中', '冻结', '部分退款'], auditStatus: 'pending', isMain: false,
      claimedCount: 1, requiredCount: 1, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '16464464', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [
        { name: '张三', id: '1216516', club: '李四俱乐部', acceptTime: '2026-10-10 11:12:22', transferTime: '' },
      ],
      profit: { adjustText: '-20元（涉部分退款，加减价失效）', clubShare: '40.12', playerShareText: '40.12元-20.12元+20.00元', adjustInvalid: true },
      logs: [
        { time: '2026-09-19 10:00', text: '渠道下单', operator: '' },
        { time: '2026-09-19 11:00', text: '派单 → 打手 小鹿#4410', operator: '' },
        { time: '2026-09-21 22:00', text: '售后介入，订单冻结', operator: '系统' },
      ],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: 'xxxxxxxxxxxxxxxxxxxxxxx', rejectReason: 'xxxxxxxxxxxxxxxx', orderRemark: '',
      relation: { main: '2455415', subs: ['2455415'] },
    },
    // 4. 进行中 端游，已驳回 → 仅查看
    {
      id: 'mo-4', orderNo: '2455415', customerTip: '',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['端游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'processing', tags: [], auditStatus: 'rejected', isMain: false,
      claimedCount: 1, requiredCount: 1, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [
        { name: '张三', id: '1216516', club: '李四俱乐部', acceptTime: '2026-10-10 11:12:22', transferTime: '' },
      ],
      profit: { adjustText: '-20元', clubShare: '40.12', playerShareText: '40.12元-20.12元+20.00元', adjustInvalid: false },
      logs: [
        { time: '2026-09-19 10:00', text: '渠道下单', operator: '' },
        { time: '2026-09-19 11:00', text: '派单 → 打手 小鹿#4410', operator: '' },
        { time: '2026-09-21 22:00', text: '提交凭证，客服审核驳回', operator: '系统' },
      ],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: '', rejectReason: '凭证不清，重新上传', orderRemark: '',
      relation: { main: '2455415', subs: ['2455415'] },
    },
    // 5. 已完成 → 仅查看
    {
      id: 'mo-5', orderNo: '2455415', customerTip: '',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['端游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'completed', tags: [], auditStatus: '', isMain: false,
      claimedCount: 1, requiredCount: 1, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [
        { name: '张三', id: '1216516', club: '李四俱乐部', acceptTime: '2026-10-10 11:12:22', transferTime: '' },
      ],
      profit: { adjustText: '-20元', clubShare: '40.12', playerShareText: '40.12元-20.12元+20.00元', adjustInvalid: false },
      logs: [
        { time: '2026-09-19 10:00', text: '渠道下单', operator: '' },
        { time: '2026-09-19 11:00', text: '派单 → 打手 小鹿#4410', operator: '' },
        { time: '2026-09-21 22:00', text: '提交凭证，客服审核通过', operator: '' },
        { time: '2026-09-21 22:30', text: '订单完成，进入7天账期', operator: '' },
      ],
      voucherTime: '2026-10-09 11:22:33',
      vouchers: { first: ['f.jpg'], last: ['l.jpg'], process: ['p1.jpg', 'p2.jpg', 'p3.jpg'] },
      playerRemark: '客户中途要求更换打手', rejectReason: '', orderRemark: '客户要求首把保底',
      relation: { main: '2455415', subs: ['2455415'] },
    },
    // 6. 交易关闭 → 仅查看
    {
      id: 'mo-6', orderNo: '2455415', customerTip: '',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['端游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'closed', tags: [], auditStatus: '', isMain: false,
      claimedCount: 0, requiredCount: 1, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [],
      profit: { adjustText: '', clubShare: '0.00', playerShareText: '0.00', adjustInvalid: false },
      logs: [{ time: '2026-09-19 10:00', text: '渠道下单', operator: '' }],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: '', rejectReason: '', orderRemark: '',
      relation: { main: '2455415', subs: ['2455415'] },
    },
    // 7. 子订单 进行中 未提交 → 查看 + 转单（已转单场景：转单时间有值）
    {
      id: 'mo-7', orderNo: '2455415', customerTip: '',
      amount: 100.0, product: '绝密航天/巴克累计2088W双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['端游'], spec: '跑刀', roleName: '阿斯基芬',
      orderStatus: 'processing', tags: [], auditStatus: 'none', isMain: false,
      claimedCount: 1, requiredCount: 1, transferred: true,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '', createTime: '2026-10-10 11:12:22', isDelta: false,
      // 非三角洲游戏：存单仅展示存单备注
      deposit: { targetW: 0, reason: '', firstW: 0, secondW: 0, images: [], note: '存单备注：客户白天有空上号' },
      players: [
        { name: '赵六', id: '1216516', club: '李四俱乐部', acceptTime: '', transferTime: '2026-10-10 11:12:22' },
      ],
      profit: { adjustText: '', clubShare: '35.00', playerShareText: '35.00', adjustInvalid: false },
      logs: [{ time: '2026-09-19 10:00', text: '渠道下单', operator: '' }],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: '', rejectReason: '', orderRemark: '',
      relation: { main: '2455415', subs: ['2455415', '2455415', '2455415', '2455415'] },
    },
    // 8. 待接单 1/1 主订单 → 查看 + 加减价（未转单）
    {
      id: 'mo-8', orderNo: '486464161686', customerTip: '微信用户13900001111',
      amount: 300.0, product: '绝密航天/巴克累计2088W 双子星（店长强推爽吃）',
      gameName: '三角洲行动', clientType: ['端游'], spec: '688W护航', roleName: '44879749',
      orderStatus: 'pending', tags: [], auditStatus: '', isMain: true,
      claimedCount: 1, requiredCount: 2, transferred: false,
      assignService: '张三', clubAcceptTime: '2026-10-10 11:12:22',
      orderType: '常规单', teamCode: '16464464', createTime: '2026-10-10 11:12:22', isDelta: true,
      deposit: { targetW: 1000, reason: 'xxxxxxxxxxxxxxxxxxxxxxx', firstW: 500, secondW: 500, images: [], note: '' },
      players: [
        { name: '张三', id: '1216516', club: '李四俱乐部', acceptTime: '2026-10-10 11:12:22', transferTime: '' },
      ],
      profit: { adjustText: '-20元', clubShare: '40.12', playerShareText: '40.12元-20.12元+20.00元', adjustInvalid: false },
      logs: [
        { time: '2026-09-19 10:00', text: '渠道下单', operator: '' },
        { time: '2026-09-19 11:00', text: '派单 → 打手 小鹿#4410', operator: '' },
      ],
      vouchers: { first: [], last: [], process: [] },
      playerRemark: '', rejectReason: '', orderRemark: '',
      relation: { main: '486464161686', subs: ['486464161686'] },
    },
  ],
});
