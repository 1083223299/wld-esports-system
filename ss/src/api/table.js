import request from '@/utils/request'

export function getList(params) {
  return request({
    url: '/admin/table/list',
    method: 'get',
    params
  })
}
// 公会列表请求
export function getunionList(params) {
  return request({
    url: '/trade/union/list',
    method: 'get',
    params
  })
}
// 查询公会详情
export function getunionDetail(params) {
  return request({
    url: `/trade/union/${params}`,
    method: "get"
  });
}
// 公会列表新增
export function PostUnionAdd(data) {
  return request({
    url: '/trade/union/add',
    method: 'post',
    data
  })
}
// 公会列表编辑
export function PutUnionEdit(data) {
  return request({
    url: '/trade/union',
    method: 'put',
    data
  })
}
// 修改公会营业状态
export function PostUpdateStatus(data) {
  return request({
    url: '/trade/union/updateStatus',
    method: 'post',
    data
  })
}
// 修改公会置顶状态
export function PostUpdateTopStatus(data) {
  return request({
    url: '/trade/union/updateTopStatus',
    method: 'post',
    data
  })
}

// 提交终止合作
export function PostClubExitSubmit(data) {
  return request({
    url: '/business/club-exit/submit',
    method: 'post',
    data
  })
}

// 重启合作
export function PostRestartCooperation(data) {
  return request({
    url: '/business/club-exit/restart-cooperation',
    method: 'post',
    data
  })
}

// 终止合作日志
export function PostClubExitLogs(data) {
  return request({
    url: '/business/club-exit/logs',
    method: 'post',
    data
  })
}

// 终止合作审核列表
export function PostClubExitList(data) {
  return request({
    url: '/business/club-exit/list',
    method: 'post',
    data
  })
}

// 终止合作审核通过
export function PostClubExitAuditApprove(data) {
  return request({
    url: '/business/club-exit/audit-approve',
    method: 'post',
    data
  })
}

// 终止合作审核驳回
export function PostClubExitAuditReject(data) {
  return request({
    url: '/business/club-exit/audit-reject',
    method: 'post',
    data
  })
}

/** 终止合作申请详情（审核回显，可选） */
export function PostClubExitDetail(data) {
  return request({
    url: '/business/club-exit/detail',
    method: 'post',
    data
  })
}

/** 当前登录俱乐部可用功能（终止合作后权限） */
export function PostClubExitAvailableFunctions(data) {
  return request({
    url: '/business/club-exit/available-functions',
    method: 'post',
    data: data || {}
  })
}
