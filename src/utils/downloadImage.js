function imageFileName(url, name) {
  const cleanedName = String(name || '').trim();
  const path = String(url || '').split(/[?#]/, 1)[0];
  const fallback = path.split('/').pop()?.split('\\').pop() || 'image';
  const filename = cleanedName || fallback;
  if (/\.[a-z\d]{2,5}$/i.test(filename)) return filename;

  const extension = fallback.match(/\.([a-z\d]{2,5})$/i)?.[1];
  return extension ? `${filename}.${extension}` : filename;
}

export function downloadImageFile(url, name) {
  if (typeof url !== 'string' || !url) {
    throw new Error('图片地址无效，无法下载');
  }

  const filename = imageFileName(url, name);
  if (/^https?:\/\//i.test(url) && window.appActions?.downloadImage) {
    return window.appActions.downloadImage(url, filename);
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
