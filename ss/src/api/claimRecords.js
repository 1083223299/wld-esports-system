import request from "@/utils/request";

/**
 * 领取记录分页查询
 */
export function claimRecordPage(data) {
    return request({
        url: "/business/operation-prize-receive/page",
        method: "post",
        data,
    });
}

/**
 * 领取记录日志列表
 */
export function claimRecordLogList(data) {
    return request({
        url: "/business/operation-prize-receive/log-list",
        method: "post",
        data,
    });
}

/**
 * 人工发放奖品
 */
export function manualGrant(data) {
    return request({
        url: "/business/operation-manual-grant/create",
        method: "post",
        data,
    });
}
