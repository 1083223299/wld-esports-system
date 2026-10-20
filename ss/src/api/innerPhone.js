import request from "@/utils/request";

// 查询测试手机号维护列表
// phone  手机号
// pageSize  
// pageNum
export function InnerPhoneList(params) {
    return request({
        url: "/system-v1/innerPhone/list",
        method: "get",
        params
    });
}
// 新增测试手机号维护
// phone  手机号
export function addInnerPhone(data) {
    return request({
        url: "/system-v1/innerPhone/add",
        method: "post",
        data
    });
}

// 删除测试手机号
// id 列表id
export function deleteInnerPhone(id) {
    return request({
        url: `/system-v1/innerPhone/remove/${id}`,
        method: "post"
    });
}