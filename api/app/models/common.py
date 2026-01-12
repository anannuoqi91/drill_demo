from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class TimeRange(BaseModel):
    start: Optional[str] = None  # ISO string
    end: Optional[str] = None    # ISO string


class BaseInfo(BaseModel):
    platform: str = 'x86'
    data_fix: str = '_FK_'
