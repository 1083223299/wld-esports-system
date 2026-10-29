function imageUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function mapOrderDetailFields(order = {}) {
  const evidence = order.evidence && typeof order.evidence === 'object' ? order.evidence : {};
  const evidenceImages = Array.isArray(evidence.images)
    ? evidence.images.map(imageUrl).filter(Boolean)
    : null;
  const images = evidenceImages?.length ? evidenceImages : [
    imageUrl(order.coverUrl),
    imageUrl(order.endUrl),
    ...(Array.isArray(order.progressUrls) ? order.progressUrls.map(imageUrl) : []),
  ].filter(Boolean);

  return {
    logs: Array.isArray(order.logs)
      ? order.logs.map((log) => ({
          time: log?.createdAt || '',
          text: log?.action || '',
          operator: log?.operatorName || '',
        }))
      : [],
    vouchers: {
      first: images.length ? [images[0]] : [],
      last: images.length > 1 ? [images[1]] : [],
      process: images.slice(2),
    },
    playerRemark: evidence.remark || order.playerRemark || '',
  };
}
