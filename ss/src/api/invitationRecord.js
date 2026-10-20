import request from "@/utils/request";

export function invitationRecordList(params) {
  return request({
    url: "/system/userInvitation/list",
    method: "get",
    params,
  });
}
