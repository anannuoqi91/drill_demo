CREATE TABLE IF NOT EXISTS public.stop_bar_detail_x86 (
  id           BIGSERIAL PRIMARY KEY,
  
  od_version   TEXT        NOT NULL,
  scene_name   TEXT        NOT NULL,
  direction    TEXT        NOT NULL,
  lane         INTEGER        NOT NULL,

  ground_truth INTEGER     NOT NULL DEFAULT 0,
  tp           INTEGER     NOT NULL DEFAULT 0,
  fp           INTEGER     NOT NULL DEFAULT 0,
  fn           INTEGER     NOT NULL DEFAULT 0,

  -- [0,100]，两位小数
  precision    NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  recall       NUMERIC(5,2) NOT NULL DEFAULT 0.00,

  -- 精确到秒
  od_time         TIMESTAMPTZ  NOT NULL,

  -- 精确到秒
  update_time  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 唯一索引（唯一约束）
  CONSTRAINT uq_stop_bar_detail_x86 UNIQUE (od_version, scene_name, direction, lane, od_time),

  -- 约束：precision/recall 在 [0,100]
  CONSTRAINT ck_stop_bar_detail_precision CHECK (precision >= 0.00 AND precision <= 100.00),
  CONSTRAINT ck_stop_bar_detail_recall    CHECK (recall    >= 0.00 AND recall    <= 100.00),

  -- 可选：计数类非负（建议加上，避免脏数据）
  CONSTRAINT ck_stop_bar_detail_counts_nonneg CHECK (
    ground_truth >= 0 AND tp >= 0 AND fp >= 0 AND fn >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_stop_bar_detail_time_x86
  ON stop_bar_detail_x86 (od_time);


CREATE TABLE IF NOT EXISTS public.stop_bar_detail_arm (
  id           BIGSERIAL PRIMARY KEY,
  
  od_version   TEXT        NOT NULL,
  scene_name   TEXT        NOT NULL,
  direction    TEXT        NOT NULL,
  lane         INTEGER        NOT NULL,

  ground_truth INTEGER     NOT NULL DEFAULT 0,
  tp           INTEGER     NOT NULL DEFAULT 0,
  fp           INTEGER     NOT NULL DEFAULT 0,
  fn           INTEGER     NOT NULL DEFAULT 0,

  -- [0,100]，两位小数
  precision    NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  recall       NUMERIC(5,2) NOT NULL DEFAULT 0.00,

  -- 精确到秒
  od_time         TIMESTAMPTZ  NOT NULL,

  -- 精确到秒
  update_time  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 唯一索引（唯一约束）
  CONSTRAINT uq_stop_bar_detail_arm UNIQUE (od_version, scene_name, direction, lane, od_time),

  -- 约束：precision/recall 在 [0,100]
  CONSTRAINT ck_stop_bar_detail_precision CHECK (precision >= 0.00 AND precision <= 100.00),
  CONSTRAINT ck_stop_bar_detail_recall    CHECK (recall    >= 0.00 AND recall    <= 100.00),

  -- 可选：计数类非负（建议加上，避免脏数据）
  CONSTRAINT ck_stop_bar_detail_counts_nonneg CHECK (
    ground_truth >= 0 AND tp >= 0 AND fp >= 0 AND fn >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_stop_bar_detail_time_arm
  ON stop_bar_detail_arm (od_time);
