import request from '@/utils/request'

export function getAuthorityList(params) {
    return request({
        url: '/system-v1/authority/list',
        method: 'get',
        params
    })
}

export function getAuthority(authorityId) {
    return request({
        url: '/system-v1/authority/' + authorityId,
        method: 'get'
    })
}

export function postAuthorityAdd(data) {
    return request({
        url: '/system-v1/authority',
        method: 'post',
        data
    })
}

export function putAuthorityEdit(data) {
    return request({
        url: '/system-v1/authority',
        method: 'put',
        data
    })
}

export function deleteAuthority(data) {
    return request({
        url: '/system-v1/authority/' + data,
        method: 'delete'
    })
}

export function putAuthorityStatus(data) {
    return request({
        url: '/system-v1/authority/changeStatus',
        method: 'put',
        data
    })
}
