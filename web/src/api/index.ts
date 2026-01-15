/**
 * API 模块主入口 - 导出所有 API 接口
 */

// 导出通用工具函数
export { postJSON, getJSON, type BaseInfo } from "./common";

// 导出首页相关 API
export {
  queryHomeSeries,
  querySceneDirectionsPR,
  queryDirectionLanesPR,
  getODVersions,
  getAllScenes,
  type HomeSeriesRequest,
  type SceneDirectionPRRequest,
  type DirectionLanesPRRequest,
  type HomeAPIResponse,
  type ODVersionItem,
  type ODVersionsResponse,
} from "./home";

// 导出详情查询 API
export { queryDetail } from "./query";
