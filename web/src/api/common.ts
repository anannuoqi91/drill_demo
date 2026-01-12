/**
 * 通用的 HTTP 请求工具函数
 */

/**
 * 发送 POST JSON 请求
 */
export async function postJSON<T>(url: string, body: any): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
  }
  return resp.json();
}

export interface BaseInfo {
  platform: string;
  data_fix: string;
}

/**
 * 发送 GET 请求
 */
export async function getJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
  }
  return resp.json();
}