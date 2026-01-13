from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
import os
from ..cache import cache_get, cache_set, stable_dumps
from ..query_db.scene_query import *
from ..models.scene_model import *
from ..services.query_services import execute_cached_query

router = APIRouter(prefix="/api/scene", tags=["scene"])

CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))


@router.get("/all_scenes")
async def api_all_scenes(platform: str):
    """获取所有场景列表"""
    payload = await execute_cached_query(
        router=router,
        sql=SCENE_QUERY.format(arch=platform),
        cache_prefix="scene:all",
        request_data={}
    )
    return payload


@router.post("/scene_data")
async def api_scene_data(req: SceneDataRequest):
    """获取所有场景的数据"""
    payload = await execute_cached_query(
        router=router,
        sql=LASTEST_QUERY.format(
            arch=req.baseinfo.platform),
        cache_prefix="scene:latest",
        request_data=req.model_dump()
    )
    return payload
