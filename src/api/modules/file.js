import { request } from '../request';

/**
 * 文件上传（俱乐部端）
 * POST /api/club/files/upload
 * - multipart/form-data，字段名 file；图片或文件，最大 10MB
 * - 鉴权：Header Authorization: Bearer {token}（request.js 自动携带，CLUB 端 JWT）
 * - 先上传拿到 url，再把 url 填进提交验收的 coverUrl / endUrl / progressUrls
 * - 注意：三端 JWT 互不通用，俱乐部端只能用 /api/club/files/upload，
 *   不能使用 /api/admin/files/upload（ADMIN token）或 /api/player/files/upload（PLAYER token）
 * 返回 data：{ url, fileName, ossId }
 */
export const fileApi = {
  /**
   * 上传文件（俱乐部）
   * @param {File|Blob} file 文件对象（type 限 jpg/jpeg/png/gif/webp/bmp/pdf/doc/docx/xls/xlsx/mp4/mov/zip，≤10MB）
   * @returns {Promise<{url:string, fileName:string, ossId:string}>}
   */
  upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type 不手动设置：request.js 对 FormData 自动跳过 JSON 序列化，
    // 由浏览器自动携带 multipart/form-data; boundary=...
    return request.http({
      url: '/api/club/files/upload',
      method: 'POST',
      data: formData,
    });
  },
};
