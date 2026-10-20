import request from "@/utils/request";

// 快捷语相关接口

// 列表接口
// GET /business/shortcut/listByPage
export function listQuickPhrase(params) {
  return request({
    url: "/business/shortcut/listByPage",
    method: "get",
    params
  });
}

// 查询详情
// GET /business/shortcut/{id}
export function getQuickPhrase(id) {
  return request({
    url: `/business/shortcut/${id}`,
    method: "get"
  });
}

// 新增接口
// POST /business/shortcut
export function addQuickPhrase(data) {
  return request({
    url: "/business/shortcut",
    method: "post",
    data
  });
}

// 修改接口
// POST /business/shortcut/update
export function updateQuickPhrase(data) {
  return request({
    url: "/business/shortcut/update",
    method: "post",
    data
  });
}

// 删除接口
// POST /business/shortcut/{id}
export function deleteQuickPhrase(id) {
  return request({
    url: `/business/shortcut/${id}`,
    method: "delete"
  });
}
