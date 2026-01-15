from fastapi import APIRouter
from typing import Any, Dict, List, Optional, Tuple
import os
# from psycopg2.extras import execute_values
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


# async def insert_data_to_db(
#     router: APIRouter,
#     sql: str,
#     records: List[Tuple],
# ) -> Dict[str, Any]:
#     """
#     使用execute_values执行批量数据插入操作

#     Args:
#         router: FastAPI路由器实例
#         sql: SQL插入语句（包含VALUES占位符）
#         records: 要插入的数据记录列表，每个记录是一个元组

#     Returns:
#         插入操作结果字典
#     """
#     async with router.app.state.pg.acquire() as conn:
#         try:
#             # 获取原始同步连接以使用execute_values
#             sync_conn = await conn.get_raw_connection()

#             with sync_conn.cursor() as cur:
#                 # 使用execute_values执行批量插入
#                 result = execute_values(cur, sql, records, page_size=200)

#                 # 提交事务
#                 sync_conn.commit()

#             # 解析影响的行数
#             affected_rows = result if result else len(records)

#             return {
#                 "success": True,
#                 "operation": "batch_insert",
#                 "affected_rows": affected_rows,
#                 "inserted_count": len(records),
#                 "message": f"成功插入 {affected_rows} 条记录"
#             }

#         except Exception as e:
#             # 发生错误时回滚
#             try:
#                 sync_conn.rollback()
#             except:
#                 pass

#             return {
#                 "success": False,
#                 "operation": "batch_insert",
#                 "error": str(e),
#                 "affected_rows": 0,
#                 "inserted_count": 0,
#                 "message": f"插入失败: {str(e)}"
#             }
