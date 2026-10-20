
import request from "@/utils/request";

// 未来币充值相关接口

// 档位列表接口
// type   tb_xcx(淘宝小程序) android(安卓) ios(苹果)  ---下拉选择
// status  1-上架 2-下架 ---下拉选择
// startTime  开始时间
// endTime  结束时间  
// pageNum  
// pageSize  
export function RechargeConfigList(params) {
    return request({
        url: "/business/rechargeConfig/list",
        method: "get",
        params
    });
}

// 批量新增未来币
// type  必填 充值类型 tb_xcx(淘宝小程序) android(安卓) ios(苹果)
// amount  必填 充值金额 充值所需金额，添加时必填
// wlbCoin  必填 未来币数量  充值获得的未来币数量，添加时必填
// 数据结构 [{type: "1",amount: 1,wlbCoin: 1}]
export function addRechargeConfig(data) {
    return request({
        url: "/business/rechargeConfig/batch",
        method: "post",
        data
    });
}

// 修改上下架状态
// rechargeId-----充值编号
// status----1-上架 2-下架，必填
export function updateRechargeConfig(data) {
    return request({
        url: "/business/rechargeConfig/status",
        method: "post",
        data
    });
}

// 删除接口
// rechargeIds充值编号
export function deleteRechargeConfig(id) {
    return request({
        url: `/business/rechargeConfig/${id}`,
        method: "delete"
    });
}
