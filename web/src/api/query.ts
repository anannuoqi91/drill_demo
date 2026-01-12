/**
 * 详情查询相关的 API 接口
 */

import type { DetailRequest, DetailResponse } from "../types";
import { postJSON } from "./common";

/**
 * 详情查询
 */
export function queryDetail(req: DetailRequest): Promise<DetailResponse> {
  return postJSON<DetailResponse>("/api/detail", req);
}