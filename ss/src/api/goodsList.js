import request from "@/utils/request";

// 获取商品列表
export function productList(params) {
  return request({
    url: "/business/product/list",
    method: "get",
    params
  });
}
// 获取商品下拉框数据
export function productSelect(params) {
  return request({
    url: "/business/product/select-options",
    method: "get",
    params
  });
}

// 获取商品详细信息
export function getProductDetail(id) {
  return request({
    url: `/business/product/${id}`,
    method: "get"
  });
}

// 新增商品
export function addProduct(data) {
  return request({
    url: "/business/product/add",
    method: "post",
    data
  });
}

// 修改商品
export function editProduct(data) {
  return request({
    url: "/business/product/edit",
    method: "post",
    data
  });
}

// 修改商品状态（上架/下架）
export function changeProductStatus(data) {
  return request({
    url: "/business/product/changeStatus",
    method: "post",
    data
  });
}

// 切换商品是否热门状态
export function toggleProductHot(data) {
  return request({
    url: "/business/product/toggleHot",
    method: "post",
    data
  });
}
// 切换商品是否支持申请技术陪状态
export function toggleSupportApply(data) {
  return request({
    url: "/business/product/toggle-support-tech-apply",
    method: "post",
    data
  });
}



