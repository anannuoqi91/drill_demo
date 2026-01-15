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

export interface AllScenesRequest {
  platform: string;
  /** 评测模块：stopbar_pr / advance_detection_pr / stopbar_absolute / advance_detection_absolute / perception_pr */
  eval_module?: string;
}

export interface AllScenesResponse {
  rows: { scene_name: string }[];
}

export interface SceneDataRequest {
  od_version: string;
  baseinfo: BaseInfo;
  /** 评测模块：stopbar_pr / advance_detection_pr / stopbar_absolute / advance_detection_absolute / perception_pr */
  eval_module?: string;
}

export interface SceneDataResponse {
  rows: Record<string, any>[];
}

export interface MultiVersionSceneDataRequest {
  od_versions: string[];
  baseinfo: BaseInfo;
  /** 评测模块：stopbar_pr / advance_detection_pr / stopbar_absolute / advance_detection_absolute / perception_pr */
  eval_module?: string;
}

export interface MultiVersionSceneDataResponse {
  rows: Record<string, any>[];
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

/**
 * 获取所有场景列表
 */
export function getAllScenes(req: AllScenesRequest): Promise<AllScenesResponse> {
  const qs = new URLSearchParams({ platform: req.platform });
  if (req.eval_module) qs.set("eval_module", req.eval_module);
  return getJSON<AllScenesResponse>(`/api/scene/all_scenes?${qs.toString()}`);
}

/**
 * 获取所有场景的数据
 */
export function getSceneData(req: SceneDataRequest): Promise<SceneDataResponse> {
  return postJSON<SceneDataResponse>("/api/scene/scene_data", req);
}

/**
 * 获取多版本场景数据
 */
export function getMultiVersionSceneData(req: MultiVersionSceneDataRequest): Promise<MultiVersionSceneDataResponse> {
  return postJSON<MultiVersionSceneDataResponse>("/api/scene/multi_version_scene_data", req);
}
