import request from '@/utils/request'

export function listDict(params) {
    return request({
        url: '/system-v1/dict/type/list',
        method: 'get',
        params
    })
}

export function getDict(dictId) {
    return request({
        url: '/system-v1/dict/type/' + dictId,
        method: 'get'
    })
}

export function addDict(data) {
    return request({
      url: '/system-v1/dict/type',
      method: 'post',
      data: data
    })
}

export function updateDict(data) {
  return request({
    url: '/system-v1/dict/type',
    method: 'put',
    data: data
  });
}

export function delDict(dictId) {
    return request({
        url: '/system-v1/dict/type/' + dictId,
        method: 'delete'
    })
}

export function refreshCache() {
    return request({
        url: '/system-v1/dict/type/refreshCache',
        method: 'delete'
    })
}
