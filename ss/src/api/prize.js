
import request from "@/utils/request";

// 未来币充值相关接口

// 奖品配置列表接口
// pageNum   
// pageSize  
// prizeId  奖品ID
// prizeName  奖品名称  
// prizeSource  奖品属性 1=活动奖品 2=人工发放奖品
// activityLinked  是否关联活动 0=未关联 1=已关联
export function OperationPrizeList(data) {
    return request({
        url: "/business/operation-prize/page",
        method: "post",
        data
    });
}

// 奖品配置详情接口
// prizeId  奖品ID
export function OperationPrizeDetail(data) {
    return request({
        url: "/business/operation-prize/detail",
        method: "post",
        data
    });
}

// 新增接口
export function createPrize(data) {
    return request({
        url: "/business/operation-prize/create",
        method: "post",
        data
    });
}

// 编辑接口
export function updatePrize(data) {
    return request({
        url: "/business/operation-prize/update",
        method: "post",
        data
    });
}

// 删除接口
// ids 奖品ID列表 "ids": [0]
export function deleteRechargeConfig(data) {
    return request({
        url: "/business/operation-prize/delete",
        method: "post",
        data
    });
}
