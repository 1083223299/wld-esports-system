import request from '@/utils/request';

// 查询字段关联列表（树形结构）
export function productFieldRelationList(params) {
  return request({
    url: '/business/productFieldRelation/list',
    method: 'get',
    params
  });
}
// 查询展示模式
export function getShowModeList(data) {
  return request({
    url: '/business/productFieldRelation/showModeList',
    method: 'post',
    data
  });
}

// 编辑字段关联
export function editProductFieldRelation(data) {
  return request({
    url: '/business/productFieldRelation/edit',
    method: 'post',
    data
  });
}

// 删除字段关联
export function removeProductFieldRelation(id) {
  return request({
    url: `/business/productFieldRelation/remove/${id}`,
    method: 'post'
  });
}

// 查询关联字段详细信息
export function ProductFieldRelationId(id) {
  return request({
    url: `/business/productFieldRelation/${id}`,
    method: 'get'
  });
}

// 切换是否外显状态
export function toggleProductFieldRelationShow(id, isShow) {
  return request({
    url: `/business/productFieldRelation/toggleIsShow`,
    method: 'post',
    data: { id, isShow }
  });
}
// 切换是否技术陪
export function toggleIsTechPlay(id, isTechPlay) {
  return request({
    url: `/business/productFieldRelation/toggleIsTechPlay`,
    method: 'post',
    data: { id, isTechPlay }
  });
}

// 切换是否展示单位
export function toggleShowUnit(id, showUnit) {
  return request({
    url: `/business/productFieldRelation/toggleShowUnit`,
    method: 'post',
    data: { id, showUnit }
  });
}

// 批量新增字段关联
export function batchAddProductFieldRelation(data) {
  return request({
    url: '/business/productFieldRelation/add/batch',
    method: 'post',
    data
  });
}
