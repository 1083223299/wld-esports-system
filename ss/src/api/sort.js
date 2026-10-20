// ==================== 管理 API ====================
import request from '@/utils/request'

/**
 * 查询列表
 */
export function listRecommendFactor() {
    return request({
        url: '/business/recommendFactor/list',
        method: 'get',
    })
}

// 查询详情
// configId
export function DetailRecommendFactor(configId) {
    return request({
        url: `/business/recommendFactor/${configId}`,
        method: "get"
    });
}

// 查询区间配置列表详情
// configId
export function DetailRangeList(configId) {
    return request({
        url: `/business/recommendFactor/rangeList/${configId}`,
        method: "get"
    });
}

// 新增接口
// rangeId : 0 区间 ID
// configId : 0 配置 ID
// rangeName :  区间名称
// minValue : 0 最小值
// maxValue : 0 最大值
// score : 0 得分
// sortOrder : 0 排序
export function EditsaveRanges(data) {
    return request({
        url: "/business/recommendFactor/saveRanges",
        method: "post",
        data
    });
}