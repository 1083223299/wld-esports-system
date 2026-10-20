// ==================== 公会入驻审核 API ====================
import request from "@/utils/request";

/**
 * 入驻审核分页列表
 * POST /business/trade-union-apply/list
 */
export function listUnionAudit(data) {
  return request({
    url: "/business/trade-union-apply/list",
    method: "post",
    data,
  });
}

/**
 * 入驻审核详情
 * POST /business/trade-union-apply/detail
 */
export function detailUnionAudit(data) {
  return request({
    url: "/business/trade-union-apply/detail",
    method: "post",
    data,
  });
}

/**
 * 审核通过
 * POST /business/trade-union-apply/approve
 */
export function approveUnionAudit(data) {
  return request({
    url: "/business/trade-union-apply/approve",
    method: "post",
    data,
  });
}

/**
 * 审核驳回
 * POST /business/trade-union-apply/reject
 */
export function rejectUnionAudit(data) {
  return request({
    url: "/business/trade-union-apply/reject",
    method: "post",
    data,
  });
}

/**
 * 待审核数量（用于左侧菜单角标）
 * POST /business/trade-union-apply/pending-count
 */
export function getUnionAuditPendingCount() {
  return request({
    url: "/business/trade-union-apply/pending-count",
    method: "post",
    data: {},
  }).then((res) => {
    if (res && res.success && res.data && typeof res.data === "object" && "pendingCount" in res.data) {
      return { success: true, data: res.data.pendingCount };
    }
    return res;
  });
}
