from pydantic import BaseModel
from typing import Optional
from .common import *


class SceneDataRequest(BaseModel):
    od_version: str = "latest"
    baseinfo: BaseInfo = BaseInfo()
