import request from '@/utils/request'

export function listConfig(params) {
    return request({
        url: '/system-v1/config/list',
        method: 'get',
        params
    })
}

export function getConfig(configId) {
    return request({
        url: '/system-v1/config/' + configId,
        method: 'get'
    })
}

export function addConfig(data) {
    return request({
        url: '/system-v1/config',
        method: 'post',
        data
    })
}

export function updateConfig(data) {
    return request({
        url: '/system-v1/config',
        method: 'put',
        data
    })
}

export function delConfig(configId) {
    return request({
        url: '/system-v1/config/' + configId,
        method: 'delete'
    })
}

export function refreshCache() {
    return request({
        url: '/system-v1/config/refreshCache',
        method: 'delete'
    })
}
