// ==================== 管理 API ====================
import request from '@/utils/request'

/**
 * 查询列表
 */
export function listCopywriting() {
    return request({
        url: '/business/copywriting/list',
        method: 'get',
    })
}
// 查询详情
// configId
export function getCopywriting(id) {
    return request({
        url: `/business/copywriting/${id}`,
        method: "get"
    });
}
// 新增接口
// productId  商品 ID
// productName  商品名称
// productImage  商品图片 OSS ID
// copywritingContent 0 文案内容（富文本）
export function EditCopywriting(data) {
    return request({
        url: "/business/copywriting",
        method: "post",
        data
    });
}
// 修改文案配置
// configId  配置 ID
// productId  商品 ID
// productName  商品名称
// productImage  商品图片 OSS ID
// copywritingContent 0 文案内容（富文本）
export function updataCopywriting(data) {
    return request({
        url: "/business/copywriting", // 请求的API地址
        method: "put", // 请求方法为
        data // 请求体数据
    });
}

// 删除接口
export function deleteCopywriting(configId) {
    return request({
        url: `/business/copywriting/${configId}`,
        method: "delete"
    });
}
