from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from redis.asyncio import Redis

from .routers import home, scene  # , self_test
from .cache import cache_get, cache_set, stable_dumps

DATABASE_URL = os.environ.get("DATABASE_URL", "")
REDIS_URL = os.environ.get("REDIS_URL", "")
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))

CORS_ORIGINS = [x.strip() for x in os.environ.get(
    "CORS_ORIGINS", "http://localhost:8080").split(",") if x.strip()]

app = FastAPI(title="Drill Demo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(home.router)
app.include_router(scene.router)
# app.include_router(self_test.router)


@app.on_event("startup")
async def on_startup():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required")

    app.state.pg = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    app.state.redis = Redis.from_url(REDIS_URL) if REDIS_URL else None

    # 将app实例传递给路由
    home.router.app = app
    scene.router.app = app


@app.on_event("shutdown")
async def on_shutdown():
    pg = getattr(app.state, "pg", None)
    if pg:
        await pg.close()
    r = getattr(app.state, "redis", None)
    if r:
        await r.close()


@app.get("/health")
async def health():
    return {"ok": True}
