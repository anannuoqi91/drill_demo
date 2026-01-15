#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from datetime import datetime
from config import conn
from zoneinfo import ZoneInfo
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DEFAULT_TZ_NAME = "Asia/Singapore"


def infer_time_from_filename(path: str, tz_name: str = DEFAULT_TZ_NAME) -> datetime:
    """
    从文件名里提取时间：YYYY-MM-DD-HH-MM-SS，并截断到分钟（秒=0）
    e.g. *_2026-01-08-23-06-20.csv -> 2026-01-08 23:06:00 +08:00
    """
    base = os.path.basename(path)
    m = re.search(r"(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})", base)
    if not m:
        raise ValueError(f"无法从文件名推断时间（需要包含 YYYY-MM-DD-HH-MM-SS）：{base}")
    dt = datetime.strptime(m.group(1), "%Y-%m-%d-%H-%M-%S")
    tz = ZoneInfo(tz_name)
    dt = dt.replace(tzinfo=tz)
    dt = dt.replace(second=0, microsecond=0)
    return dt


def infer_prefix_from_filename(path: str) -> str:
    """
    取文件名前缀：xxx_stop_bar_statistic... -> xxx
    """
    base = os.path.basename(path)
    m = re.match(r"(.+?)_stop_bar_statistic", base)
    if m:
        return m.group(1)
    # 兜底：去掉扩展名
    return os.path.splitext(base)[0]


def get_env(name: str, default: str = "") -> str:
    v = os.environ.get(name)
    return v if v is not None and v != "" else default


def get_od_version(dir_name: str, tz_name: str = DEFAULT_TZ_NAME) -> str:
    """
    从文件名里提取 od_version：SIMPL_OD_daily_build_dev-SIMPL_20260108_220928_5924-job-ESEE-353_190 -> daily_build
    """

    dir_name_l = dir_name.split("-job-ESEE")
    if len(dir_name_l) != 2:
        raise ValueError(f"无法从目录名推断 od_version（需要包含 -job-ESEE）：{dir_name}")
    od_version = dir_name_l[0].replace("SIMPL_OD_", "")
    if "daily_build" in od_version:
        m = re.search(r"(\d{8}_\d{6}_\d{4})", od_version)
        if not m:
            raise ValueError(
                f"无法从目录名推断 od_version（daily_build 格式错误）：{dir_name}")
        time_list = m.group(1).split("_")
        time_str = time_list[0] + " " + time_list[1]
        dt = datetime.strptime(time_str, "%Y%m%d %H%M%S")
        tz = ZoneInfo(tz_name)
        dt = dt.replace(tzinfo=tz)
        dt = dt.replace(second=0, microsecond=0)

        return "daily_build", dt
    else:
        return od_version, None


def import_data(csv_dir: str, key_str: str, platform: str):
    """
    从 CSV 导入数据到数据库
    """
    dir_name = os.path.basename(csv_dir)
    od_version, stat_time = get_od_version(dir_name)
    csv_sub_dir = "unzip"
    search_dir = os.path.join(csv_dir, csv_sub_dir)
    records = []
    for sub_dir in os.listdir(search_dir):
        for sub_dir in os.listdir(search_dir):
            scene_name = sub_dir
            scene_abs_dir = os.path.join(search_dir, sub_dir)
            for i_file in os.listdir(scene_abs_dir):
                if key_str not in i_file:
                    continue
                csv_path = os.path.join(scene_abs_dir, i_file)
                if stat_time is None:
                    stat_time = infer_time_from_filename(csv_path)
                # 读 CSV
                df = pd.read_csv(csv_path)
                # 兼容列名（你文件里列名如下）
                col_direction = "Direction"
                col_lane = "Lane"
                col_gt = "Ground Truth"
                col_tp = "Zone Counted Times - TP"
                col_fp = "Zone Counted Times - FP"
                col_fn = "Zone Counted Times - FN"
                col_precision = "Precision"
                col_recall = "Recall"

                for c in [col_direction, col_lane, col_gt, col_tp, col_fp, col_fn, col_precision, col_recall]:
                    if c not in df.columns:
                        raise ValueError(
                            f"CSV 缺少列: {c}，实际列为: {list(df.columns)}")

                # 过滤 lane=total/Total（忽略大小写 & 去掉空格）
                lane_str = df[col_lane].astype(str).str.strip()
                df = df[~(lane_str.str.lower() == "total")].copy()

                # lane 转 int（表里是 INTEGER）
                df["lane_int"] = pd.to_numeric(df[col_lane], errors="coerce")
                df = df[df["lane_int"].notna()].copy()
                df["lane_int"] = df["lane_int"].astype(int)

                # 计数列转 int（FP/FN 可能是 float：0.0/1.0）
                def to_int_series(s: pd.Series) -> pd.Series:
                    x = pd.to_numeric(s, errors="coerce").fillna(0)
                    # 允许 0.0/1.0 这种，取四舍五入后转 int
                    return x.round(0).astype(int)

                df["gt"] = to_int_series(df[col_gt])
                df["tp"] = to_int_series(df[col_tp])
                df["fp"] = to_int_series(df[col_fp])
                df["fn"] = to_int_series(df[col_fn])

                # precision/recall：NUMERIC(5,2)，范围 [0,100]
                def to_pct(s: pd.Series) -> pd.Series:
                    x = pd.to_numeric(s, errors="coerce").fillna(0.0)
                    x = x.clip(lower=0.0, upper=100.0)
                    return x.round(2)

                df["precision"] = to_pct(df[col_precision])
                df["recall"] = to_pct(df[col_recall])

                # 组装 records
                for _, r in df.iterrows():
                    records.append((
                        od_version,
                        platform,
                        scene_name,
                        str(r[col_direction]).strip(),
                        int(r["lane_int"]),
                        int(r["gt"]),
                        int(r["tp"]),
                        int(r["fp"]),
                        int(r["fn"]),
                        float(r["precision"]),
                        float(r["recall"]),
                        stat_time,
                    ))

    return records
