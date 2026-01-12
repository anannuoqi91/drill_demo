from pydantic import BaseModel
from typing import Optional
from .common import *


class HomeSeriesRequest(BaseModel):
    od_version: str
    baseinfo: BaseInfo = BaseInfo()


class SceneDirectionPRRequest(BaseModel):
    od_version: str
    scene_name: str
    baseinfo: BaseInfo = BaseInfo()


class DirectionLanesPRRequest(BaseModel):
    od_version: str
    scene_name: str
    direction: str
    baseinfo: BaseInfo = BaseInfo()
