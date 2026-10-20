// ==================== 登录日志管理 API ====================
import request from '@/utils/request'

/**
 * 查询登录日志列表
 * @param {Object} query - 查询参数
 * @param {number} query.pageNum - 当前页码
 * @param {number} query.pageSize - 每页条数
 * @param {string} query.userName - 用户名称
 * @param {string} query.ipaddr - IP地址
 * @param {string} query.status - 登录状态（0-成功，1-失败）
 * @param {string} query['params[beginTime]'] - 开始时间
 * @param {string} query['params[endTime]'] - 结束时间
 * @param {string} query.orderByColumn - 排序字段
 * @param {string} query.isAsc - 排序方式
 * @returns {Promise} 返回登录日志列表数据
 */
export function listLogininfor(query) {
    return request({
        url: '/monitor-v1/logininfor/list',
        method: 'get',
        params: query
    })
}

/**
 * 
 * 
 * 删除登录日志
 * @param {string|number|Array} infoIds - 日志ID（支持单个或批量）
 * @returns {Promise} 返回删除结果
 */
export function delLogininfor(infoIds) {
    return request({
        url: '/monitor-v1/logininfor/' + infoIds,
        method: 'delete'
    })
}

/**
 * 解锁用户登录状态
 * @param {string|Array} userName - 用户名称（支持单个或批量）
 * @returns {Promise} 返回解锁结果
 * @description 用于解锁因密码错误次数过多而被锁定的用户
 */
export function unlockLogininfor(userName) {
    return request({
        url: '/monitor-v1/logininfor/unlock/' + userName,
        method: 'get'
    })
}

/**
 * 清空登录日志
 * @returns {Promise} 返回清空结果89iu7o0
 * @warning 此操作会删除所有登录日志，不可恢复
 */
export function cleanLogininfor() {
    return request({
        url: '/monitor-v1/logininfor/clean',
        method: 'delete'
    })
}