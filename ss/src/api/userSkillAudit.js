// ==================== 管理 API ====================
import request from '@/utils/request'

/**
 * 查询用户技能审核列表
 */
// pageSize
// pageNum
// userId 陪玩ID
// nickName 陪玩名称
// phone 手机号
// applyStatus 状态（申请状态：0=待审核，1=实战考核，2=驳回，3=已通过）
// unionAuditStatus 公会审核状态（0=待审核，1=公会通过，2=公会驳回）
// applyType 申请类型（1=娱乐陪，2=技术陪）
// type 陪陪类型（1=个人陪陪，2=公会陪陪，3=商户公会陪陪）
export function listUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/list',
        method: 'post',
        data
    })
}

// 审核通过
// priceId 价格ID
export function approveUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/approve',
        method: 'post',
        data
    });
}
// 审核驳回
// priceId 价格ID
// rejectReason 驳回原因（审核驳回时必填）

export function rejectUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/reject',
        method: 'post',
        data
    });
}

// 技术初审通过
// priceId 技能价格ID
export function firstApproveUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/first-approve',
        method: 'post',
        data
    });
}

// 技术初审驳回
// priceId 技能价格ID
// rejectReason 初审驳回原因（50字以内）
export function firstRejectUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/first-reject',
        method: 'post',
        data
    });
}

// 实战考核通过
// priceId 技能价格ID
// assessmentLevel 实战考核评分定级：mass/third/first/top
export function practicalApproveUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/practical-approve',
        method: 'post',
        data
    });
}

// 实战考核驳回
// priceId 技能价格ID
// rejectReason 实战考核驳回原因（50字以内）
// convertToEntertainment 是否转为娱乐陪
export function practicalRejectUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/practical-reject',
        method: 'post',
        data
    });
}

export function entertainmentCompanionCheck(data) {
    return request({
        url: '/business/userSkillAudit/entertainment-companion-check',
        method: 'post',
        data
    });
}

/**
 * 查询用户技能审核详情
 */
export function detailUserSkillAudit(data) {
    return request({
        url: '/business/userSkillAudit/detail',
        method: 'post',
        data
    });
}

/**
 * 查询技能冻结重新提交说明
 * @param {Object} data - { priceId }
 */
export function getFreezeResubmitInfo(data) {
    return request({
        url: '/business/userSkillAudit/freeze-resubmit-info',
        method: 'post',
        data
    });
}
/**
 * 公会后台-陪陪审核列表
 * @param {Object} data
 * @param {number} [data.pageNum] - 当前页数
 * @param {number} [data.pageSize] - 分页大小
 * @param {number|string} [data.tradeId] - 当前公会ID（后端按登录账号写入）
 * @param {number|string} [data.userId] - 陪陪ID
 * @param {string} [data.nickName] - 陪陪名称
 * @param {string} [data.phone] - 手机号
 * @param {number|string} [data.merchantAuditStatus] - 公会审核状态：0=待审核，1=通过，2=驳回
 * @param {string} [data.platformAuditStatus] - 平台审核状态：0=待审核/初审，1=实战考核，2=驳回，3=通过
 * @param {number|string} [data.productId] - 游戏ID
 * @param {string} [data.productName] - 游戏名称
 * @param {string} [data.applyType] - 申请类型：1=娱乐陪，2=技术陪
 * @param {number|string} [data.type] - 陪陪类型：1=个人陪陪，2=公会陪陪，3=商户公会陪陪
 * @param {number|string} [data.applyId] - 申请ID
 * @returns {Promise<{ code: number, msg: string, data: { total: number, rows: Array<TradeUnionCompanionAuditListVo> } }>}
 *
 * @typedef {Object} TradeUnionCompanionAuditListVo
 * @property {number|string} applyId - 申请ID
 * @property {number|string} userId - 陪陪ID
 * @property {string} nickName - 陪陪名称
 * @property {string} phone - 手机号
 * @property {number|string} avatar - 头像
 * @property {number|string} merchantId - 商户ID
 * @property {number|string} tradeId - 公会ID
 * @property {number|string} productId - 游戏ID
 * @property {string} productName - 游戏名称
 * @property {string} applyType - 申请类型：1=娱乐陪，2=技术陪
 * @property {string} skillAudit - 技能审核状态：0=待审核，1=通过，2=驳回，3=失效
 * @property {string} platformAuditStatus - 平台审核状态：0=待审核/初审，1=实战考核，2=驳回，3=通过
 * @property {string} firstAuditStatus - 初审状态：0=待审核，1=通过，2=驳回
 * @property {string} secondAuditStatus - 复审/实战考核状态：0=待审核，1=通过，2=驳回
 * @property {number|string} merchantAuditStatus - 公会审核状态：0=待审核，1=通过，2=驳回
 * @property {number|string} type - 陪陪类型：1=个人陪陪，2=公会陪陪，3=商户公会陪陪
 * @property {string} [merchantName] - 商户名称（商户公会陪陪备注展示）
 * @property {string} [tradeName] - 公会名称（备注展示）
 * @property {string} [unionName] - 公会名称（备注展示，同 tradeName）
 * @property {string} [remark] - 备注
 * @property {string} rejectReason - 平台驳回原因
 * @property {string} merchantRemark - 公会审核备注/驳回原因
 * @property {string} createTime - 提交时间
 */
export function listTradeUnionCompanionAudit(data) {
    return request({
        url: '/business/trade-union-companion-audit/list',
        method: 'post',
        data
    });
}

/**
 * 商户公会审核通过
 * @param {Object} data
 * @param {number|string} data.applyId - 申请ID
 */
export function approveTradeUnionCompanionAudit(data) {
    return request({
        url: '/business/trade-union-companion-audit/approve',
        method: 'post',
        data
    });
}

/**
 * 商户公会审核驳回
 * @param {Object} data
 * @param {number|string} data.applyId - 申请ID
 * @param {string} data.rejectReason - 驳回原因（必填，0-500字符）
 */
export function rejectTradeUnionCompanionAudit(data) {
    return request({
        url: '/business/trade-union-companion-audit/reject',
        method: 'post',
        data
    });
}

