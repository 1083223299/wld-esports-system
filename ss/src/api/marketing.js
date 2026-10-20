// ==================== 营销管理 API ====================
import request from "@/utils/request";

/**
 * 查询Banner列表
 */
export function listBanner(query) {
    return request({
        url: "/business/banner/list",
        method: "get",
        params: query,
    });
}

/**
 * 查询Banner详情
 */
export function getProductCategory(bannerId) {
    return request({
        url: `/business/banner/${bannerId}`,
        method: "get",
    });
}

/**
 * 查询Banner游戏专区商品选项
 */
export function bannerProductOptions() {
    return request({
        url: "/business/banner/product-options",
        method: "post",
        transformResponse: [(data) => {
            if (typeof data !== "string") {
                return data;
            }

            return JSON.parse(data.replace(/("productId"\s*:\s*)(\d{16,})/g, '$1"$2"'));
        }],
    });
}

/**
 * 新增Banner
 */
export function addBanner(data) {
    return request({
        url: "/business/banner",
        method: "post",
        data,
    });
}

/**
 * 修改Banner
 */
export function UpdateBanner(data) {
    return request({
        url: "/business/banner",
        method: "put",
        data,
    });
}

/**
 * 修改Banner展示状态
 */
export function ChangeBanner(data) {
    return request({
        url: "/business/banner/changeStatus",
        method: "put",
        data,
    });
}

/**
 * 删除Banner
 */
export function RemoveBanner(data) {
    return request({
        url: "/business/banner/batchRemove",
        method: "post",
        data,
    });
}

/**
 * 查询游戏专区俱乐部广告位列表
 */
export function listGameZoneClubAdSlot(data) {
    return request({
        url: "/business/club-ad-slot/page",
        method: "post",
        data,
    });
}

/**
 * 查询单游戏俱乐部广告位详情
 */
export function getGameZoneClubAdSlotDetail(data) {
    return request({
        url: "/business/club-ad-slot/detail",
        method: "post",
        data,
    });
}

/**
 * 保存单游戏俱乐部广告位配置
 */
export function saveGameZoneClubAdSlot(data) {
    return request({
        url: "/business/club-ad-slot/save",
        method: "post",
        data,
    });
}

/**
 * 批量保存俱乐部广告位配置
 */
export function batchSaveGameZoneClubAdSlot(data) {
    return request({
        url: "/business/club-ad-slot/batch-save",
        method: "post",
        data,
    });
}

/**
 * 修改俱乐部广告位开启/关闭状态
 */
export function changeGameZoneClubAdSlotStatus(data) {
    return request({
        url: "/business/club-ad-slot/change-status",
        method: "post",
        data,
    });
}

/**
 * 选择俱乐部弹窗分页查询
 */
export function clubAdSlotClubSelectPage(data) {
    return request({
        url: "/business/club-ad-slot/club-select-page",
        method: "post",
        data,
    });
}

/**
 * 查询意见反馈列表
 */
export function listUserFeedback(data) {
    return request({
        url: "/business/user-feed-back/list-back",
        method: "post",
        data,
    });
}

/**
 * 查询意见反馈备注详情
 */
export function getUserFeedbackRemarkDetail(data) {
    return request({
        url: "/business/user-feed-back/remark-detail",
        method: "post",
        data,
    });
}

/**
 * 保存意见反馈备注
 */
export function saveUserFeedbackRemark(data) {
    return request({
        url: "/business/user-feed-back/remark-save",
        method: "post",
        data,
    });
}

/**
 * 查询陪玩保障配置列表
 */
export function listPlayGuaranteeConfig(data) {
    return request({
        url: "/business/play-guarantee/page",
        method: "post",
        data,
    });
}

/**
 * 查询陪玩保障配置详情
 */
export function getPlayGuaranteeDetail(data) {
    return request({
        url: "/business/play-guarantee/detail",
        method: "post",
        data,
    });
}

/**
 * 保存陪玩保障配置
 */
export function savePlayGuaranteeConfig(data) {
    return request({
        url: "/business/play-guarantee/save",
        method: "post",
        data,
    });
}
