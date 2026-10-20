import request from "@/utils/request";

/** 刷新公会邀请码（旧码立即失效） */
export function refreshInviteCode(data) {
  return request({
    url: "/admin/trade-union-operation/refresh-invite-code",
    method: "post",
    data: data || {},
  });
}
