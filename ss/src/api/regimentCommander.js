import request from "@/utils/request";

export function getLeaderList(data) {
  return request({
    url: "/admin/trade-union-leader/list",
    method: "post",
    data,
  });
}

export function getBoundCompanionList(data) {
  return request({
    url: "/admin/trade-union-leader/bound-companion-list",
    method: "post",
    data,
  });
}

export function getCompanionPool(data) {
  return request({
    url: "/admin/trade-union-leader/companion-list",
    method: "post",
    data,
  });
}

export function bindCompanions(data) {
  return request({
    url: "/admin/trade-union-leader/bind-companion",
    method: "post",
    data,
  });
}

export function unbindLeader(data) {
  return request({
    url: "/admin/trade-union-leader/unbind",
    method: "post",
    data,
  });
}

export function unbindCompanion(data) {
  return request({
    url: "/admin/trade-union-leader/unbind-companion",
    method: "post",
    data,
  });
}

export function getBilledOrderList(data) {
  return request({
    url: "/admin/trade-union-order/list",
    method: "post",
    data,
  });
}

export function getLeaderInviteStatus(data) {
  return request({
    url: "/admin/trade-union-leader-invite/status",
    method: "post",
    data,
  });
}
