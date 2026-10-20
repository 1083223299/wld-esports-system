import request from "@/utils/request";

// 营业弹窗配置列表
export function businessPopList(data) {
  return request({
    url: "/system/business-pop/list",
    method: "get",
    data,
  });
}

// 新增
export function businessPopAdd(data) {
  return request({
    url: "/system/business-pop/add",
    method: "post",
    data,
  });
}

// 编辑
export function businessPopEdit(data) {
  return request({
    url: "/system/business-pop/edit",
    method: "post",
    data,
  });
}

// 删除
export function businessPopDelete(data) {
  return request({
    url: "/system/business-pop/delete",
    method: "post",
    data,
  });
}
