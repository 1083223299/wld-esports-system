import request from "@/utils/request";

/**
 * 陪陪退出审核 - 列表查询
 */
export function exitReviewList(params) {
  return request({
    url: "/business/trade/exit/list",
    method: "get",
    params,
  });
}

/**
 * 陪陪退出审核 - 通过/驳回
 * @param {Object} data - { exitId, status: '1'|'2', rejectionReason }
 */
export function exitReviewAction(data) {
  return request({
    url: "/business/trade/exit/exitReview",
    method: "post",
    data,
  });
}
