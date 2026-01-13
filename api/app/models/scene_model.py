from pydantic import BaseModel
from typing import Optional, List
from .common import *


class SceneDataRequest(BaseModel):
    od_version: str = "latest"
    baseinfo: BaseInfo = BaseInfo()


class MultiVersionSceneDataRequest(BaseModel):
    od_versions: List[str]
    baseinfo: BaseInfo = BaseInfo()
