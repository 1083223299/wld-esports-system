import request from "@/utils/request";

// 活动列表分页查询
export function activityPage(data) {
    return request({
        url: "/business/operation-activity/page",
        method: "post",
        data,
    });
}

// 活动详情
export function activityDetail(data) {
    return request({
        url: "/business/operation-activity/detail",
        method: "post",
        data,
    });
}

// 新增活动
export function activityCreate(data) {
    return request({
        url: "/business/operation-activity/create",
        method: "post",
        data,
    });
}

// 更新活动
export function activityUpdate(data) {
    return request({
        url: "/business/operation-activity/update",
        method: "post",
        data,
    });
}

// 删除活动
export function activityDelete(data) {
    return request({
        url: "/business/operation-activity/delete",
        method: "post",
        data,
    });
}

// 切换活动状态
export function activityChangeStatus(data) {
    return request({
        url: "/business/operation-activity/change-status",
        method: "post",
        data,
    });
}

// 活动数据看板 - 可统计活动列表
export function activityBoardActivityOptions(data) {
    return request({
        url: "/business/operation-activity/board/activity-options",
        method: "post",
        data,
    });
}

// 活动数据看板 - 核心概览指标
export function activityBoardOverview(data) {
    return request({
        url: "/business/operation-activity/board/overview",
        method: "post",
        data,
    });
}

// 活动数据看板 - 趋势图表
export function activityBoardTrend(data) {
    return request({
        url: "/business/operation-activity/board/trend",
        method: "post",
        data,
    });
}

// 活动数据看板 - 优惠券转化数据
export function activityBoardCouponConversion(data) {
    return request({
        url: "/business/operation-activity/board/coupon-conversion",
        method: "post",
        data,
    });
}

// 活动数据看板 - 当前视图导出
export function activityBoardExport(data) {
    return request({
        url: "/business/operation-activity/board/export",
        method: "post",
        data,
        responseType: "blob",
    });
}
