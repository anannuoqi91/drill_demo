NUM = 5


LASTEST_QUERY = """
SELECT
  od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  od_version,
  to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
  scene_name,
  direction,
  lane,
  sum(ground_truth) as gt,
  SUM(tp) as tp,
  SUM(fp) as fp,
  SUM(fn) as fn
FROM public.stop_bar_detail_{arch}
WHERE (scene_name, od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI')) IN (
    SELECT 
        scene_name,
        od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute
    FROM (
        SELECT 
            scene_name,
            od_version,
            date_trunc('minute', od_time) AS od_time_trunc,
            row_number() OVER (PARTITION BY scene_name ORDER BY date_trunc('minute', od_time) DESC, od_version DESC) AS rn
        FROM public.stop_bar_detail_{arch}
        GROUP BY scene_name, od_version, date_trunc('minute', od_time)
    ) t
    WHERE t.rn <= 5
)
GROUP BY
  od_version,
  date_trunc('minute', od_time),
  scene_name,
  direction,
  lane
ORDER BY
  scene_name,
  date_trunc('minute', od_time) DESC,
  od_version DESC,
  direction,
  lane;
"""


SCENE_QUERY = """
SELECT
  DISTINCT scene_name
FROM public.stop_bar_detail_{arch}
"""

MULTI_VERSION_QUERY = """
SELECT
  od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  od_version,
  to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
  scene_name,
  direction,
  lane,
  sum(ground_truth) as gt,
  SUM(tp) as tp,
  SUM(fp) as fp,
  SUM(fn) as fn
FROM public.stop_bar_detail_{arch}
WHERE od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') IN ({version_placeholders})
GROUP BY
  od_version,
  date_trunc('minute', od_time),
  scene_name,
  direction,
  lane
ORDER BY
  scene_name,
  date_trunc('minute', od_time) DESC,
  od_version DESC,
  direction,
  lane;
"""


LASTEST_QUERY_SP_SUMMARY = """
SELECT
  od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  od_version,
  to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
  scene_name,
  direction,
  lane,
  sum(ground_truth) as gt,
  SUM(zone_counted) as zone_counted
FROM public.stop_bar_summary_{arch}
WHERE (scene_name, od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI')) IN (
    SELECT 
        scene_name,
        od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute
    FROM (
        SELECT 
            scene_name,
            od_version,
            date_trunc('minute', od_time) AS od_time_trunc,
            row_number() OVER (PARTITION BY scene_name ORDER BY date_trunc('minute', od_time) DESC, od_version DESC) AS rn
        FROM public.stop_bar_detail_{arch}
        GROUP BY scene_name, od_version, date_trunc('minute', od_time)
    ) t
    WHERE t.rn <= 5
)
GROUP BY
  od_version,
  date_trunc('minute', od_time),
  scene_name,
  direction,
  lane
ORDER BY
  scene_name,
  date_trunc('minute', od_time) DESC,
  od_version DESC,
  direction,
  lane;
"""


MULTI_VERSION_QUERY_SP_SUMMARY = """
SELECT
  od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  od_version,
  to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
  scene_name,
  direction,
  lane,
  sum(ground_truth) as gt,
  SUM(zone_counted) as zone_counted
FROM public.stop_bar_summary_{arch}
WHERE od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') IN ({version_placeholders})
GROUP BY
  od_version,
  date_trunc('minute', od_time),
  scene_name,
  direction,
  lane
ORDER BY
  scene_name,
  date_trunc('minute', od_time) DESC,
  od_version DESC,
  direction,
  lane;
"""
