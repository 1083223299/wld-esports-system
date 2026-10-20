import request from '@/utils/request'

// 公户提现审批列表
export function getCashoutList(params) {
    return request({
        url: '/system/transaction/list',
        method: 'get',
        params
    })
}
// 公会提现申请列表
export function getApplicationList(params) {
    return request({
        url: '/system/transaction/listUnionTransaction',
        method: 'get',
        params
    })
}

// 获取公会剩余余额
export function getInfoBlance(params) {
    return request({
        url: '/system/transaction/getInfo',
        method: 'get',
        params
    })
}

// 获取公会详情信息
export function getInfoUnion(params) {
    return request({
        url: '/system/transaction/getInfoUnion',
        method: 'get',
        params
    })
}

/** 申请提现前校验（true 可提现 / false 不可提现） */
export function checkUnionWithdraw(tradeId) {
    return request({
        url: `/trade/union/withdrawCheck/${tradeId}`,
        method: 'get'
    })
}
// 公会提现详情信息
export function getCashoutDetail(params) {
    return request({
        url: '/system/transaction/{unionTransactionId}',
        method: 'get',
        params
    })
}
// 新增提现
export function PostCashoutAdd(data) {
    return request({
        url: '/system/transaction',
        method: 'post',
        data
    })
}
// 审批提现
export function PostApproval(data) {
    return request({
        url: '/system/transaction/audit',
        method: 'post',
        data
    })
}
// 打款
export function PutPayment(data) {
    return request({
        url: '/system/transaction/payment',
        method: 'post',
        data
    })
}

// 查询工会提现配置
export function getWithdrawConfig(data = {}) {
    return request({
        url: '/system/transaction/withdraw-config',
        method: 'post',
        data
    })
}

// 保存工会提现配置
export function saveWithdrawConfig(data) {
    return request({
        url: '/system/transaction/withdraw-config/save',
        method: 'post',
        data
    })
}
