// ==================== 操作日志管理 API ====================
import request from '@/utils/request'

/**
 * 查询操作日志列表
 * @param {Object} query - 查询参数
 * @param {number} query.pageNum - 当前页码
 * @param {number} query.pageSize - 每页条数
 * @param {string} query.operIp - 操作地址
 * @param {string} query.title - 系统模块
 * @param {string} query.operName - 操作人员
 * @param {string} query.businessType - 操作类型
 * @param {string} query.status - 操作状态
 * @param {string} query['params[beginTime]'] - 开始时间
 * @param {string} query['params[endTime]'] - 结束时间
 * @param {string} query.orderByColumn - 排序字段
 * @param {string} query.isAsc - 排序方式
 * @returns {Promise} 返回操作日志列表数据
 */
export function listOperlog(query) {
    return request({
        url: '/monitor-v1/operlog/list',
        method: 'get',
        params: query
    })
}

/**
 * 删除操作日志
 * @param {string|number|Array} operIds - 日志ID（支持单个或批量）
 * @returns {Promise} 返回删除结果
 */
export function delOperlog(operIds) {
    return request({
        url: '/monitor-v1/operlog/' + operIds,
        method: 'delete'
    })
}

/**
 * 清空操作日志
 * @returns {Promise} 返回清空结果
 * @warning 此操作会删除所有操作日志，不可恢复
 */
export function cleanOperlog() {
    return request({
        url: '/monitor-v1/operlog/clean',
        method: 'delete'
    })
}