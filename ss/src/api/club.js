import request from "@/utils/request";

// 俱乐部排序因素列表
export function ClubList(data) {
    return request({
        url: "/admin/club-sort-config/factorList", // 俱乐部排序
        method: "post", // 请求方法为
        data // 请求体数据
    });
}

// 保存规则
// factorId  因素ID
// ruleName  区间名称
// minValue  最小值
// maxValue  最大值
// score  得分
export function addClub(data) {
    return request({
        url: "/admin/club-sort-config/saveRules", // 请求的API地址
        method: "post", // 请求方法为
        data // 请求体数据
    });
}

// 查询规则详情
// factorId 因素ID
export function detailClub(params) {
    return request({
        url: "/admin/club-sort-config/rulesByFactorId", // 请求的API地址
        method: "get", // 请求方法为
        params // 请求体数据
    });
}