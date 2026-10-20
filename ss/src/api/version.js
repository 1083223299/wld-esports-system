import request from '@/utils/request'

export function getVersionList(params) {
    return request({
        url: '/system-v1/version/list',
        method: 'get',
        params
    })
}

export function getVersion(versionId) {
    return request({
        url: '/system-v1/version/' + versionId,
        method: 'get'
    })
}

export function postVersionAdd(data) {
    return request({
        url: '/system-v1/version',
        method: 'post',
        data
    })
}

export function putVersionEdit(data) {
    return request({
        url: '/system-v1/version',
        method: 'put',
        data
    })
}

export function deleteVersion(data) {
    return request({
        url: '/system-v1/version/' + data,
        method: 'delete'
    })
}

export function putVersionStatus(data) {
    return request({
        url: '/system-v1/version/changeStatus',
        method: 'put',
        data
    })
}

export function downloadVersion(versionId) {
    return request({
        url: '/system-v1/version/download/' + versionId,
        method: 'get',
        responseType: 'blob'
    })
}
