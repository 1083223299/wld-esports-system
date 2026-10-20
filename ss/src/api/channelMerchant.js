import request from "@/utils/request";

/** 渠道商分页列表 */
export function getChannelMerchantPage(data) {
  return request({
    url: "/business/channel-merchant/page",
    method: "post",
    data: data || {},
  });
}

/** 新增渠道商 */
export function addChannelMerchant(data) {
  return request({
    url: "/business/channel-merchant/add",
    method: "post",
    data: data || {},
  });
}

/** 新增前校验联系电话 */
export function checkChannelMerchantPhone(data) {
  return request({
    url: "/business/channel-merchant/check-phone",
    method: "post",
    data: data || {},
  });
}

/** 渠道商已绑定公会分页列表 */
export function getBindGuildPage(data) {
  return request({
    url: "/business/channel-merchant/bind-guild/page",
    method: "post",
    data: data || {},
  });
}

/** 搜索可绑定公会 */
export function searchBindableGuild(data) {
  return request({
    url: "/business/channel-merchant/bind-guild/search",
    method: "post",
    data: data || {},
  });
}

/** 手动绑定公会 */
export function addBindGuild(data) {
  return request({
    url: "/business/channel-merchant/bind-guild/add",
    method: "post",
    data: data || {},
  });
}
