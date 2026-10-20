
import request from "@/utils/request";

export function faqPage(params) {
  return request({
    url: "/business/faq/page",
    method: "get",
    params,
  });
}

export function faqAdd(data) {
  return request({
    url: "/business/faq/add",
    method: "post",
    data,
  });
}

export function faqEdit(data) {
  return request({
    url: "/business/faq/edit",
    method: "post",
    data,
  });
}

export function faqRemove(ids) {
  return request({
    url: `/business/faq/remove/${ids}`,
    method: "post",
  });
}

export function faqDetail(id) {
  return request({
    url: `/business/faq/detail/${id}`,
    method: "get",
  });
}

export function toggleCommon(id) {
  return request({
    url: `/business/faq/toggle-common/${id}`,
    method: "post",
  });
}

export function faqCategoryList(params) {
  return request({
    url: "/business/faq-category/list",
    method: "get",
    params,
  });
}

export function faqCategoryAdd(data) {
  return request({
    url: "/business/faq-category/add",
    method: "post",
    data,
  });
}

export function faqCategoryEdit(data) {
  return request({
    url: "/business/faq-category/edit",
    method: "post",
    data,
  });
}

export function faqCategoryRemove(ids) {
  return request({
    url: `/business/faq-category/remove/${ids}`,
    method: "post",
  });
}

export function faqCategoryDetail(id) {
  return request({
    url: `/business/faq-category/detail/${id}`,
    method: "get",
  });
}
