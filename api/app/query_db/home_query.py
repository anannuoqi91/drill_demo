LASTEST_QUERY = """
SELECT
  od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  od_version,
  to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
  scene_name,
  SUM(tp) as tp,
  SUM(fp) as fp,
  SUM(fn) as fn,
  CASE WHEN SUM(tp)+SUM(fp) = 0 THEN 0 ELSE ROUND(SUM(tp)*1.0/(SUM(tp)+SUM(fp)),4) END AS precision,
  CASE WHEN SUM(tp)+SUM(fn) = 0 THEN 0 ELSE ROUND(SUM(tp)*1.0/(SUM(tp)+SUM(fn)),4) END AS recall
FROM public.stop_bar_detail_{arch}
WHERE od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') = $1 
      AND scene_name like '%{data_fix}%'
GROUP BY
  od_version,
  date_trunc('minute', od_time),
  scene_name
ORDER BY
  od_version,
  date_trunc('minute', od_time),
  scene_name;
"""


DIRECTION_PR_QUERY = """
    SELECT
      od_version,
      to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
      scene_name,
      direction,
      SUM(tp) AS tp,
      SUM(fp) AS fp,
      SUM(fn) AS fn,
      ROUND(SUM(tp)::numeric / NULLIF(SUM(tp + fp), 0), 4) AS precision,
      ROUND(SUM(tp)::numeric / NULLIF(SUM(tp + fn), 0), 4) AS recall
    FROM public.stop_bar_detail_{arch}
    WHERE
      od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') = $1
      AND scene_name = $2
    GROUP BY
      od_version,
      date_trunc('minute', od_time),
      scene_name,
      direction
    ORDER BY
      direction;
    """


LANE_PR_QUERY = """
    SELECT
      od_version,
      to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_time_minute,
      scene_name,
      direction,
      lane,
      SUM(tp) AS tp,
      SUM(fp) AS fp,
      SUM(fn) AS fn,
      ROUND(SUM(tp)::numeric / NULLIF(SUM(tp + fp), 0), 4) AS precision,
      ROUND(SUM(tp)::numeric / NULLIF(SUM(tp + fn), 0), 4) AS recall
    FROM public.stop_bar_detail_{arch}
    WHERE
      od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') = $1
      AND scene_name = $2
      AND direction = $3
    GROUP BY
      od_version,
      date_trunc('minute', od_time),
      scene_name,
      direction,
      lane
    ORDER BY
      lane;
    """


ALL_SIMPL_OD = """
SELECT 
  DISTINCT od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  date_trunc('minute', od_time) AS od_time_minute
FROM public.stop_bar_detail_x86

UNION

SELECT 
  od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  date_trunc('minute', od_time) AS od_time_minute
FROM public.stop_bar_detail_arm

UNION

SELECT 
  DISTINCT od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  date_trunc('minute', od_time) AS od_time_minute
FROM public.stop_bar_summary_x86


UNION

SELECT 
  DISTINCT od_version || '-' || to_char(date_trunc('minute', od_time), 'YYYY-MM-DD_HH24:MI') AS od_version_minute,
  date_trunc('minute', od_time) AS od_time_minute
FROM public.stop_bar_summary_arm

ORDER BY od_time_minute DESC;
"""
