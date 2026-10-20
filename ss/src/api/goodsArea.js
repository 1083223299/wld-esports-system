import request from "@/utils/request";

// 区服相关接口
// 新增区服（批量）
export function addProductServer(data) {
  return request({
    url: "/business/productServer/add",
    method: "post",
    data
  });
}

// 查询区服列表
export function productServerList(params) {
  return request({
    url: "/business/productServer/list",
    method: "get",
    params
  });
}

// 获取区服详细信息
export function getProductServer(id) {
  return request({
    url: `/business/productServer/${id}`,
    method: "get"
  });
}

// 修改区服
export function editProductServer(data) {
  return request({
    url: "/business/productServer/edit",
    method: "post",
    data
  });
}

// 删除区服（单个删除，级联删除子区服）
export function removeProductServer(id) {
  return request({
    url: `/business/productServer/remove/${id}`,
    method: "post"
  });
}

// 字段相关接口
// 查询字段列表（支持分页和搜索，传递productId和fieldName）
export function productFieldList(params) {
  return request({
    url: "/business/productField/list",
    method: "get",
    params
  });
}

// 获取字段详细信息
export function getProductField(id) {
  return request({
    url: `/business/productField/${id}`,
    method: "get"
  });
}

// 新增字段（传递productId和fieldName）
export function addProductField(data) {
  return request({
    url: "/business/productField/add",
    method: "post",
    data
  });
}

// 修改字段（传递id、productId和fieldName）
export function editProductField(data) {
  return request({
    url: "/business/productField/edit",
    method: "post",
    data
  });
}

// 删除字段
export function removeProductField(id) {
  return request({
    url: `/business/productField/remove/${id}`,
    method: "post"
  });
}


