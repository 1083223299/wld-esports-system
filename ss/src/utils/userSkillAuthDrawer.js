export function cleanWrappedString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/^["'`\s]+|["'`\s]+$/g, "");
}

export function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    const normalizedValue = cleanWrappedString(value);
    try {
      const parsedValue = JSON.parse(normalizedValue);
      return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : value ? [value] : [];
    } catch (error) {
      return normalizedValue
        ? normalizedValue.split(",").map((item) => cleanWrappedString(item)).filter(Boolean)
        : [];
    }
  }
  return [];
}

export function uniqueList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return Array.from(new Set(list.map((item) => cleanWrappedString(item)).filter(Boolean)));
}

export function getMediaType(url) {
  const normalizedUrl = cleanWrappedString(url).split("?")[0].toLowerCase();
  if (/\.(mp4|mov|m4v|webm|ogg|ogv|avi|wmv|flv|mkv|m3u8)$/.test(normalizedUrl)) {
    return "video";
  }
  return "image";
}

export function buildMediaList(value) {
  return uniqueList(value).map((url) => ({
    url,
    type: getMediaType(url),
  }));
}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function formatBusinessType(value) {
  const map = { 1: "搭档", 2: "代练" };
  return map[normalizeId(value)] || cleanWrappedString(value) || "-";
}

function formatModuleType(value) {
  const map = {
    1: "认证模块",
    2: "商品规格",
    3: "游戏专区",
    5: "订单字段",
    6: "价格配置",
    7: "一键安排",
  };
  return map[normalizeId(value)] || cleanWrappedString(value) || "-";
}

function formatSkillStatus(value) {
  const map = { 0: "已开启", 1: "已关闭" };
  return map[normalizeId(value)] || cleanWrappedString(value) || "-";
}

function buildTextFieldRule(field) {
  if (!field || typeof field !== "object") return "";
  const fragments = [];
  const charMin = field.charMin;
  const charMax = field.charMax;
  if (charMin || charMax) {
    fragments.push(`字数要求：${charMin || 0}-${charMax || "不限"}字`);
  }
  if (Number(field.isRequired) === 1) {
    fragments.push("该项必填");
  }
  return fragments.join("；");
}

function sortFieldsByOrder(fields) {
  return (fields || []).slice().sort((a, b) => {
    const orderA = Number(a && a.orderNum);
    const orderB = Number(b && b.orderNum);
    return (Number.isNaN(orderA) ? 0 : orderA) - (Number.isNaN(orderB) ? 0 : orderB);
  });
}

function resolveFieldOrder(field, fallbackIndex) {
  const orderNum = Number(field && field.orderNum);
  return Number.isNaN(orderNum) ? fallbackIndex : orderNum;
}

function buildFieldOptionLabels(field) {
  const children = sortFieldsByOrder(Array.isArray(field && field.children) ? field.children : []);
  return uniqueList(children.map((item) => item.fieldName));
}

function getFieldValueKey(item) {
  return normalizeId(item && (item.relationId || item.productFieldId || item.fieldName || item.ownerId));
}

function isFieldMatched(valueItem, field) {
  if (!valueItem || !field) return false;
  const relationId = normalizeId(valueItem.relationId);
  const productFieldId = normalizeId(valueItem.productFieldId);
  const fieldId = normalizeId(field.id);
  const fieldProductFieldId = normalizeId(field.productFieldId);
  if (relationId && (relationId === fieldId || relationId === fieldProductFieldId)) {
    return true;
  }
  if (productFieldId && productFieldId === fieldProductFieldId) {
    return true;
  }
  const children = Array.isArray(field.children) ? field.children : [];
  return children.some((child) => {
    const childId = normalizeId(child.id);
    const childProductFieldId = normalizeId(child.productFieldId);
    return (
      (relationId && (relationId === childId || relationId === childProductFieldId)) ||
      (productFieldId && productFieldId === childProductFieldId) ||
      (!!valueItem.fieldName && valueItem.fieldName === child.fieldName)
    );
  });
}

function getFieldDisplayText(item) {
  const displayLabels = parseJsonArray(item && item.displayLabels);
  return (
    displayLabels.join("、") ||
    cleanWrappedString(item && item.fieldDisplayValue) ||
    cleanWrappedString(item && item.fieldValue) ||
    cleanWrappedString(item && item.fieldName) ||
    ""
  );
}

function buildAuthFieldValues(detailData) {
  const fields = sortFieldsByOrder(Array.isArray(detailData.fields) ? detailData.fields : []);
  const currentFieldValues = Array.isArray(detailData.currentSkill && detailData.currentSkill.fieldValues)
    ? detailData.currentSkill.fieldValues
    : Array.isArray(detailData.fieldValues)
      ? detailData.fieldValues
      : [];
  const result = [];
  const usedKeys = new Set();

  fields.forEach((field, index) => {
    const matchedValues = currentFieldValues.filter((item) => isFieldMatched(item, field));
    matchedValues.forEach((item) => usedKeys.add(getFieldValueKey(item)));
    const imageList = uniqueList(matchedValues.flatMap((item) => parseJsonArray(item.displayUrls)));
    const displayValues = uniqueList(
      matchedValues.map((item) => getFieldDisplayText(item)).filter(Boolean)
    );
    result.push({
      key: field.id || field.productFieldId || index,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      orderNum: resolveFieldOrder(field, index),
      isRequired: Number(field.isRequired) === 1,
      optionLabels: buildFieldOptionLabels(field),
      imageList,
      displayText: displayValues.join("、") || "-",
      hasValue: imageList.length > 0 || displayValues.length > 0,
    });
  });

  currentFieldValues.forEach((item, index) => {
    const fieldValueKey = getFieldValueKey(item);
    if (usedKeys.has(fieldValueKey)) return;
    result.push({
      ...item,
      key: fieldValueKey || index,
      fieldName: item.fieldName || "未匹配字段",
      fieldType: item.fieldType,
      orderNum: fields.length + index + 1,
      isRequired: false,
      optionLabels: [],
      imageList: uniqueList(parseJsonArray(item.displayUrls)),
      displayText: getFieldDisplayText(item) || "-",
      hasValue: !!(parseJsonArray(item.displayUrls).length || getFieldDisplayText(item)),
    });
  });

  return result;
}

export function extractAuthPayload(res) {
  if (!res) return null;
  if (res.data && res.data.success && res.data.data) return res.data.data;
  if (res.success && res.data && res.data.data) return res.data.data;
  if (res.success && res.data) return res.data;
  if (res.data && res.data.data && (res.data.code === 200 || res.data.errorCode === "0")) {
    return res.data.data;
  }
  if (res.data) return res.data;
  return null;
}

export function normalizeAuthData(detailData, row = {}) {
  const currentSkill = detailData.currentSkill || {};
  const picInfo = detailData.userSkillPicItemVo || {};
  const voiceInfo = detailData.userSkillVoiceItemVo || {};
  const textInfo = detailData.userSkillTextItemVo || {};
  const textField = textInfo.skillTextField || {};
  const applyStatus =
    currentSkill.applyStatus ??
    row.applyStatus ??
    row.platformAuditStatus ??
    detailData.applyStatus ??
    detailData.platformAuditStatus;
  const remark = cleanWrappedString(
    currentSkill.remark ?? detailData.remark ?? row.rejectReason ?? detailData.rejectReason
  );
  return {
    ...detailData,
    currentSkill,
    userId: currentSkill.userId ?? row.userId ?? detailData.userId ?? "",
    skillId: currentSkill.skillId || detailData.skillId || "",
    productName: cleanWrappedString(detailData.productName || row.productName || "-") || "-",
    productId: detailData.productId || currentSkill.productId || row.productId || "",
    applyType: cleanWrappedString(currentSkill.applyType ?? detailData.applyType ?? row.applyType ?? ""),
    realName: cleanWrappedString(currentSkill.realName ?? detailData.realName ?? ""),
    wechatNo: cleanWrappedString(currentSkill.wechatNo ?? detailData.wechatNo ?? ""),
    expectedAssessmentTime: cleanWrappedString(
      currentSkill.expectedAssessmentTime ?? detailData.expectedAssessmentTime ?? ""
    ),
    highlightVideo: cleanWrappedString(currentSkill.highlightVideo || ""),
    highlightVideoOssId: cleanWrappedString(currentSkill.highlightVideoOssId || ""),
    businessType: detailData.businessType || currentSkill.businessType || "",
    businessTypeText: formatBusinessType(detailData.businessType || currentSkill.businessType),
    moduleType: detailData.moduleType || currentSkill.moduleType || "",
    moduleTypeText: formatModuleType(detailData.moduleType || currentSkill.moduleType),
    isTechnicalWaiter: detailData.isTechnicalWaiter ?? currentSkill.isTechnicalWaiter ?? 0,
    skillStatus: currentSkill.status ?? detailData.status ?? "",
    skillStatusText: formatSkillStatus(currentSkill.status ?? detailData.status),
    demoImageList: parseJsonArray(picInfo.demoPicUrl),
    picOssId: cleanWrappedString(currentSkill.skillInfoImageOssId || ""),
    skillImageList: parseJsonArray(currentSkill.skillInfoImage),
    voiceOssId: cleanWrappedString(voiceInfo.voiceOssId || ""),
    skillVoice: cleanWrappedString(voiceInfo.voiceUrl || currentSkill.skillVoice || ""),
    skillVoiceLength:
      voiceInfo.skillVoiceLength ?? currentSkill.skillVoiceLength ?? detailData.skillVoiceLength ?? "",
    introduce: cleanWrappedString(textInfo.userText || currentSkill.introduce || ""),
    textFieldName: cleanWrappedString(textField.fieldName || "技能介绍"),
    textFieldRule: buildTextFieldRule(textField),
    textFieldPlaceholder: cleanWrappedString(textField.placeholder || ""),
    applyStatus,
    rejectReason: cleanWrappedString(row.rejectReason ?? detailData.rejectReason ?? ""),
    remark,
    fieldValues: buildAuthFieldValues(detailData),
  };
}

export function formatAuthFieldValues(fieldValues) {
  return (fieldValues || []).map((item, index) => ({
    ...item,
    key: item.key || item.relationId || item.productFieldId || item.ownerId || index,
    imageList: uniqueList(item.imageList || parseJsonArray(item.displayUrls)),
    optionLabels: uniqueList(item.optionLabels),
    displayText: item.displayText || getFieldDisplayText(item) || "-",
    hasValue:
      item.hasValue !== undefined
        ? item.hasValue
        : !!((item.imageList && item.imageList.length) || (item.displayText && item.displayText !== "-")),
    orderNum: Number(item.orderNum || 0),
  })).sort((a, b) => a.orderNum - b.orderNum);
}

export const AUTH_STATUS_TEXT_MAP = {
  0: "待审核",
  1: "实战考核",
  2: "驳回",
  3: "已通过",
};

export const AUTH_STATUS_TAG_MAP = {
  0: "primary",
  1: "warning",
  2: "danger",
  3: "success",
};

export function getAuthStatusText(status) {
  return AUTH_STATUS_TEXT_MAP[String(status)] || status || "-";
}

export function getAuthStatusTag(status) {
  return AUTH_STATUS_TAG_MAP[String(status)] || "info";
}

export function formatVoiceLength(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${value}秒`;
}

export function fieldTypeText(fieldType) {
  const map = {
    1: "单选项",
    2: "输入项(仅数字)",
    3: "输入项(无限制)",
    4: "筛选项",
    5: "展示项",
    6: "多选项",
    7: "图片项",
    8: "自定义商品",
    9: "选项值(价格)",
  };
  return map[fieldType] || "-";
}

export function buildDetailParams(row = {}) {
 
  if (row.priceId) return { priceId: row.priceId };
   if (row.applyId) return { applyId: row.applyId };
  return null;
}
