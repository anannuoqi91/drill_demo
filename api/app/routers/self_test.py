from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
import os
import asyncio
from ..cache import cache_get, cache_set, stable_dumps
from ..models.selftest_model import ImportDataRequest
from ..query_db.selftest_query import INSERT_SQL
from ..services.download_from_jenkins import get_result_url
from ..services.import_data import import_data
from ..services.query_services import insert_data_to_db


router = APIRouter(prefix="/api/selftest", tags=["selftest"])

CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "30"))

# 存储导入进度的全局字典
import_progress = {}


@router.get("/import_data")
async def api_import_data(req: ImportDataRequest):
    """根据trigger link将数据导入数据库"""
    import_id = f"{req.link_str}_{req.key_str}_{req.platform}"
    import_progress[import_id] = {
        "status": "starting", "progress": 0, "message": "开始导入数据..."}

    urls = [req.link_str]
    save_dir = "./datatmp/"
    os.makedirs(save_dir, exist_ok=True)
    records = []

    try:
        # 步骤1: 下载文件
        import_progress[import_id] = {
            "status": "downloading", "progress": 20, "message": "正在下载文件..."}
        get_result_url(urls, save_dir=save_dir)

        # 步骤2: 处理文件
        import_progress[import_id] = {
            "status": "processing", "progress": 40, "message": "正在处理文件..."}
        dirs = os.listdir(save_dir)
        total_dirs = len(dirs)

        for i, dir_name in enumerate(dirs):
            progress = 40 + int((i / total_dirs) * 30)
            import_progress[import_id] = {
                "status": "processing",
                "progress": progress,
                "message": f"正在处理文件 {i+1}/{total_dirs}..."
            }
            records.extend(import_data(os.path.join(
                save_dir, dir_name), req.key_str, req.platform))
            await asyncio.sleep(0.1)  # 模拟处理时间

        # 步骤3: 导入数据库
        import_progress[import_id] = {
            "status": "importing", "progress": 80, "message": "正在导入数据库..."}
        if records:
            result = insert_data_to_db(router, INSERT_SQL, records)
            if result["success"]:
                import_progress[import_id] = {
                    "status": "completed", "progress": 100, "message": "数据导入成功"}
                return {"status_code": 200, "message": "Data imported successfully", "import_id": import_id}
            else:
                import_progress[import_id] = {
                    "status": "error", "progress": 0, "message": result['message']}
                raise HTTPException(status_code=500, detail=result['message'])
        else:
            import_progress[import_id] = {
                "status": "error", "progress": 0, "message": "没有可导入的记录"}
            raise HTTPException(status_code=400, detail="No records to import")

    except Exception as e:
        import_progress[import_id] = {
            "status": "error", "progress": 0, "message": str(e)}
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 清理临时目录
        if os.path.exists(save_dir):
            for item in os.listdir(save_dir):
                item_path = os.path.join(save_dir, item)
                if os.path.isfile(item_path):
                    os.remove(item_path)
            os.rmdir(save_dir)


@router.get("/import_progress/{import_id}")
async def get_import_progress(import_id: str):
    """获取数据导入进度"""
    progress = import_progress.get(
        import_id, {"status": "unknown", "progress": 0, "message": "导入任务不存在"})
    return progress
