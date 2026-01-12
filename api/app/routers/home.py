from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
import os
from ..cache import cache_get, cache_set, stable_dumps
from ..query_db.home_query import *
from ..models.home_model import HomeSeriesRequest, SceneDirectionPRRequest, DirectionLanesPRRequest
from ..services.query_services import execute_cached_query

router = APIRouter(prefix="/api/home", tags=["home"])

CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))


@router.post("/series")
async def api_home_series(req: HomeSeriesRequest):
    """使用特定的 od_version 进行筛选"""
    payload = await execute_cached_query(
        router=router,
        sql=LASTEST_QUERY.format(
            arch=req.baseinfo.platform, data_fix=req.baseinfo.data_fix),
        cache_prefix="home",
        params=(req.od_version,),
        request_data=req.model_dump()
    )
    return payload


@router.post("/scene/directions_pr")
async def api_scene_directions_pr(req: SceneDirectionPRRequest):
    """场景方向PR数据查询"""
    payload = await execute_cached_query(
        sql=DIRECTION_PR_QUERY.format(
            arch=req.baseinfo.platform),
        router=router,
        cache_prefix="home:dir_pr",
        params=(req.od_version, req.scene_name),
        request_data=req.model_dump()
    )
    return payload


@router.post("/scene/direction/lanes_pr")
async def api_direction_lanes_pr(req: DirectionLanesPRRequest):
    """方向车道PR数据查询"""
    payload = await execute_cached_query(
        router=router,
        sql=LANE_PR_QUERY.format(arch=req.baseinfo.platform),
        cache_prefix="home:lane_pr",
        params=(req.od_version, req.scene_name, req.direction),
        request_data=req.model_dump()
    )
    return payload


@router.get("/od_versions")
async def api_od_versions():
    """获取所有OD版本列表"""
    payload = await execute_cached_query(
        router=router,
        sql=ALL_SIMPL_OD,
        cache_prefix="od_versions",
        request_data={}
    )
    return payload
