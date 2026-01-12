/**
 * 首页相关的 API 接口
 */

import { postJSON, getJSON, type BaseInfo } from "./common";

export interface HomeSeriesRequest {
  od_version: string;
  baseinfo?: BaseInfo;
}

export interface SceneDirectionPRRequest {
  od_version: string;
  scene_name: string;
  baseinfo?: BaseInfo;
}

export interface DirectionLanesPRRequest {
  od_version: string;
  scene_name: string;
  direction: string;
  baseinfo?: BaseInfo;
}

export interface HomeAPIResponse {
  rows: Record<string, any>[];
}

export interface ODVersionItem {
  od_version_minute: string;
  od_time_minute: string;
}

export interface ODVersionsResponse {
  rows: ODVersionItem[];
}

/**
 * 获取OD版本列表
 */
export function getODVersions(): Promise<ODVersionsResponse> {
  return getJSON<ODVersionsResponse>(`/api/home/od_versions`);
}

/**
 * 不同场景的评测结果
 */
export function queryHomeSeries(req: HomeSeriesRequest): Promise<HomeAPIResponse> {
  return postJSON<HomeAPIResponse>("/api/home/series", req);
}

/**
 * 查询场景下的方向 PR 数据
 */
export function querySceneDirectionsPR(req: SceneDirectionPRRequest): Promise<HomeAPIResponse> {
  return postJSON<HomeAPIResponse>("/api/home/scene/directions_pr", req);
}

/**
 * 查询方向下的车道 PR 数据
 */
export function queryDirectionLanesPR(req: DirectionLanesPRRequest): Promise<HomeAPIResponse> {
  return postJSON<HomeAPIResponse>("/api/home/scene/direction/lanes_pr", req);
}