import json
from typing import Any, Optional

from redis.asyncio import Redis
from fastapi.encoders import jsonable_encoder  # ✅ 新增


def stable_dumps(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


async def cache_get(r: Redis, key: str) -> Optional[Any]:
    v = await r.get(key)
    if not v:
        return None
    return json.loads(v)


async def cache_set(r: Redis, key: str, value: Any, ttl_seconds: int) -> None:
    # ✅ 关键：把 Decimal / datetime 等转成可 JSON 序列化的类型
    safe_value = jsonable_encoder(value)
    await r.set(key, json.dumps(safe_value, ensure_ascii=False), ex=ttl_seconds)
