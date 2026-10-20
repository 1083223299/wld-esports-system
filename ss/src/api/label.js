import request from "@/utils/request";

/**
 * 用户标签列表查询
 * @param {Object} data - { labelName: string }
 */
export function queryUserLabel(data) {
    return request({
        url: "/user-label/query",
        method: "post",
        data,
    });
}
