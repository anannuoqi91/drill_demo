from fastapi import APIRouter
from typing import Any, Dict, List, Optional, Tuple
import os
from ..cache import cache_get, cache_set, stable_dumps
from ..models.common import TimeRange

CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))


async def execute_cached_query(
    router: APIRouter,
    sql: str,
    cache_prefix: str,
    params: Tuple[Any, ...] = (),
    time_range: Optional[TimeRange] = None,
    request_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    执行带缓存的数据库查询

    Args:
        sql: SQL查询语句
        cache_prefix: 缓存键前缀
        params: SQL查询参数
        time_range: 时间范围（用于缓存键）
        request_data: 请求数据（用于缓存键）

    Returns:
        查询结果字典
    """
    r = router.app.state.redis if hasattr(router, 'app') else None
    cache_key = None

    # 构建缓存键
    if r:
        cache_data = {"sql": sql, "params": params}
        if time_range:
            cache_data["time_range"] = time_range.model_dump() if hasattr(
                time_range, 'model_dump') else time_range
        if request_data:
            cache_data["request"] = request_data

        cache_key = f"{cache_prefix}:" + stable_dumps(cache_data)
        cached = await cache_get(r, cache_key)
        if cached is not None:
            return cached

    # 执行数据库查询
    async with router.app.state.pg.acquire() as conn:
        rows = await conn.fetch(sql, *params)

    payload = {"rows": [dict(x) for x in rows]}

    # 设置缓存
    if r and cache_key:
        await cache_set(r, cache_key, payload, CACHE_TTL_SECONDS)

    return payload
