INSERT_SQL = """
INSERT INTO public.stop_bar_detail_test
(od_version, plat_form, scene_name, direction, lane,
ground_truth, tp, fp, fn, precision, recall, od_time)
VALUES %s
ON CONFLICT (od_version, plat_form, scene_name, direction, lane, od_time)
DO UPDATE SET
ground_truth = EXCLUDED.ground_truth,
tp = EXCLUDED.tp,
fp = EXCLUDED.fp,
fn = EXCLUDED.fn,
precision = EXCLUDED.precision,
recall = EXCLUDED.recall,
update_time = CURRENT_TIMESTAMP
"""
