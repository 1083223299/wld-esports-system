let host = null;
let token = '', actor = 'A';
export function configureHost(adapter) { host = adapter; }
export function hasHost() { return host !== null; }
export function openHandover() { if (!host?.openHandover)
    throw new Error('订单交接需接入主项目现有入口'); host.openHandover(); }
export function localSession(value, who) { token = value; actor = who; }
export function createRequestId() {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    }
    else {
        for (let i = 0; i < bytes.length; i++)
            bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function headers() { return { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-PC-Test-Actor': actor }; }
export async function request(path, init = {}) {
    if (host)
        return host.request(`/api/admin/pc/v1${path}`, init);
    const response = await fetch(`/api/admin/pc/v1${path}`, { ...init, headers: { ...headers(), ...init.headers }, credentials: 'same-origin' });
    if (!response.ok) {
        let error;
        try {
            error = await response.json();
        }
        catch {
            error = { message: '服务暂时不可用，请重试' };
        }
        const requestError = new Error(`${error.message || '连接失败，请检查服务地址和会话'} (${error.bizCode || error.code || response.status})`);
        requestError.code = error.bizCode || error.code || response.status;
        requestError.status = response.status;
        throw requestError;
    }
    return response.json();
}
export function mutate(path, body, key = createRequestId()) { return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) }); }
export async function upload(kind, file, fields) { const body = new FormData(); body.append('file', file); Object.entries(fields).forEach(([k, v]) => body.append(k, v)); return request(`/uploads/${kind}`, { method: 'POST', headers: { 'Idempotency-Key': createRequestId() }, body }); }
export async function download(kind, file) {
    if (host?.download)
        return host.download(kind, file);
    const desktop = window.pcDesktop;
    if (!host && desktop) {
        const result = await desktop.saveFile({ kind, id: file.id, name: file.name, token, actor, requestId: createRequestId() });
        if (result.cancelled)
            throw new Error('已取消保存');
        return;
    }
    // Host request adapter also governs byte authorization in merged mode.
    const response = host ? await host.request(`/api/admin/pc/v1/bytes/${kind}/${file.id}`, { headers: { Accept: 'application/octet-stream' } }) : await fetch(`/api/admin/pc/v1/bytes/${kind}/${file.id}`, { headers: headers() });
    if (!response.ok)
        throw new Error('下载失败，请检查权限或重试');
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function imageUrl(id) { const response = host ? await host.request(`/api/admin/pc/v1/bytes/media/${encodeURIComponent(id)}`) : await fetch(`/api/admin/pc/v1/bytes/media/${encodeURIComponent(id)}`, { headers: headers() }); if (!response.ok)
    throw new Error('图片无权读取或已失效'); return URL.createObjectURL(await response.blob()); }
/** 读取附件二进制并转成本地对象 URL（缩略图 / 放大预览用，调用方负责 revokeObjectURL） */
export async function bytesUrl(kind, file) {
    const path = `/api/admin/pc/v1/bytes/${kind}/${file.id}`;
    const response = host ? await host.request(path) : await fetch(path, { headers: headers() });
    if (!response.ok)
        throw new Error('附件无权读取或已失效');
    return URL.createObjectURL(await response.blob());
}
