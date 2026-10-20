
import request from "@/utils/request";

// 商品品类管理相关接口

// 列表接口  
// pageNum  
// pageSize  
export function productCategoryList(params) {
    return request({
        url: "/business/productCategory/list",
        method: "get",
        params
    });
}

// 获取品类详细信息
export function getProductCategory(id) {
    return request({
        url: `/business/productCategory/${id}`,
        method: "get"
    });
}

// 批量新增未来币
// categoryName  必填 string 品类名称（如：热门、手游、端游）
// sort  必填 排序
export function addProductCategory(data) {
    return request({
        url: "/business/productCategory/add",
        method: "post",
        data
    });
}

// 修改上下架状态
// id  品类ID
// categoryName  必填 string 品类名称（如：热门、手游、端游）
// sort  必填 排序
export function updateProductCategory(data) {
    return request({
        url: "/business/productCategory/edit",
        method: "post",
        data
    });
}

// 删除接口
export function deleteProductCategory(id) {
    return request({
        url: `/business/productCategory/remove/${id}`,
        method: "post"
    });
}

// 查询商品品类关联列表
// productName  开始时间
// categoryId  品类ID
// pageNum  
// pageSize  
export function productCategoryRefList(params) {
    return request({
        url: "/business/productCategoryRef/list",
        method: "get",
        params
    });
}

// 新增商品品类关联
// productId  商品ID
// categoryId  品类ID
// sort   排序
// 数据结构 [{productId: 1,categoryId: 1,sort: 1}]
export function addProductCategoryRef(data) {
    return request({
        url: "/business/productCategoryRef/add",
        method: "post",
        data
    });
}
// 删除商品品类关联
export function deleteProductCategoryRef(id) {
    return request({
        url: `/business/productCategoryRef/remove/${id}`,
        method: "post"
    });
}