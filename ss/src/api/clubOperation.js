import request from '@/utils/request'

// 查询运营详情
export function operationDetail() {
    return request({
        url: `/admin/trade-union-operation/operationDetail`,
        method: "get"
    });
}

// 修改运营配置
// introduction  俱乐部简介
// photos  俱乐部宣传图片（多个OSS ID，用逗号隔开）
export function updateOperation(data) {
    return request({
        url: "/admin/trade-union-operation/updateOperation",
        method: "put",
        data
    });
}