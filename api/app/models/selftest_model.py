from pydantic import BaseModel
from typing import Optional, List
from .common import *


class ImportDataRequest(BaseModel):
    link_str: str
    platform: str
    key_str: str
