import React, { useMemo, useState } from "react";
import HomeLineChartAbs from "./HomeLineChartAbs";

interface StopbarAbsoluteCardProps {
    sceneName: string;
    platform: "arm" | "x86";
    sceneData: Record<string, any>[];
    index: number;
    totalScenes: number;
    loading?: boolean;
    error?: string;
    selectedOdVersion?: string;
}

// 聚合后的行：按版本 + 方向
type DirectionAggRow = {
    od_version_minute: string;
    direction: string;
    /** 0~1 */
    absolute: number;
};

// 聚合后的行：按版本 + 方向 + 车道
type LaneAggRow = {
    od_version_minute: string;
    direction: string;
    lane: string;
    /** 0~1 */
    absolute: number;
};

export default function StopbarAbsoluteCard(props: StopbarAbsoluteCardProps) {
    const { sceneName, sceneData, loading, error } = props;

    // chart / table 切换
    const [displayMode, setDisplayMode] = useState<"chart" | "table">("chart");

    // 只保留 direction 下拉框
    const [selectedDirectionForChart, setSelectedDirectionForChart] = useState("");

    const toggleDisplayMode = () => {
        setDisplayMode(displayMode === "chart" ? "table" : "chart");
    };

    // 计算 absolute（0~1）
    function calcAbsolute(gt: number, predict: number) {
        if (!gt || gt === 0) return 0;
        const raw = 1 - Math.abs(gt - predict) / gt;
        const clamped = Math.max(0, Math.min(1, raw));
        return Math.round(clamped * 10000) / 10000;
    }

    // 1) 所有可用 direction
    const availableDirections = useMemo(() => {
        const directions = new Set<string>();
        sceneData.forEach((row) => {
            if (row.direction === undefined || row.direction === null) return;
            const d = String(row.direction);
            if (!d) return;
            directions.add(d);
        });
        return Array.from(directions).sort();
    }, [sceneData]);

    function handleDirectionChange(direction: string) {
        setSelectedDirectionForChart(direction);
    }

    // 2) 按 (direction, od_version_minute) 聚合：用于「ALL → direction 多线」
    const directionChartRows = useMemo<DirectionAggRow[]>(() => {
        const map = new Map<
            string,
            { od_version_minute: string; direction: string; gt: number; zone_counted: number }
        >();

        sceneData.forEach((row) => {
            if (!row.od_version_minute) return;
            if (row.direction === undefined || row.direction === null) return;
            if (row.gt === undefined || row.zone_counted === undefined) return;

            const od = String(row.od_version_minute);
            const direction = String(row.direction);
            if (!od || !direction) return;

            const key = `${direction}__${od}`;
            if (!map.has(key)) {
                map.set(key, {
                    od_version_minute: od,
                    direction,
                    gt: 0,
                    zone_counted: 0,
                });
            }

            const agg = map.get(key)!;
            agg.gt += row.gt || 0;
            agg.zone_counted += row.zone_counted || 0;
        });

        const result: DirectionAggRow[] = [];
        for (const [, v] of map) {
            result.push({
                od_version_minute: v.od_version_minute,
                direction: v.direction,
                absolute: calcAbsolute(v.gt, v.zone_counted),
            });
        }

        // 按版本 + 方向排序，便于 legend/tooltip 展示
        return result.sort((a, b) => {
            const v = a.od_version_minute.localeCompare(b.od_version_minute);
            if (v !== 0) return v;
            return a.direction.localeCompare(b.direction);
        });
    }, [sceneData]);

    // 3) 按 (direction, lane, od_version_minute) 聚合：用于「指定 direction → lane 多线」
    const laneChartRows = useMemo<LaneAggRow[]>(() => {
        const map = new Map<
            string,
            { od_version_minute: string; direction: string; lane: string; gt: number; zone_counted: number }
        >();

        sceneData.forEach((row) => {
            if (!row.od_version_minute) return;
            if (row.direction === undefined || row.direction === null) return;
            if (row.lane === undefined || row.lane === null) return;
            if (row.gt === undefined || row.zone_counted === undefined) return;

            const od = String(row.od_version_minute);
            const direction = String(row.direction);
            const lane = String(row.lane);
            if (!od || !direction || !lane) return;

            const key = `${direction}__${lane}__${od}`;
            if (!map.has(key)) {
                map.set(key, {
                    od_version_minute: od,
                    direction,
                    lane,
                    gt: 0,
                    zone_counted: 0,
                });
            }

            const agg = map.get(key)!;
            agg.gt += row.gt || 0;
            agg.zone_counted += row.zone_counted || 0;
        });

        const result: LaneAggRow[] = [];
        for (const [, v] of map) {
            result.push({
                od_version_minute: v.od_version_minute,
                direction: v.direction,
                lane: v.lane,
                absolute: calcAbsolute(v.gt, v.zone_counted),
            });
        }

        // 按版本 + direction + lane 排序
        return result.sort((a, b) => {
            const v1 = a.direction.localeCompare(b.direction);
            if (v1 !== 0) return v1;
            const v2 = a.lane.localeCompare(b.lane);
            if (v2 !== 0) return v2;
            return a.od_version_minute.localeCompare(b.od_version_minute);
        });
    }, [sceneData]);

    // 4) 表格数据（原逻辑不动）
    const tableData = useMemo(() => {
        if (!sceneData.length) return [];

        type VersionAgg = {
            od_version_minute: string;
            gt: number;
            zone_counted: number;
        };

        type GroupAgg = {
            direction: string;
            lane: string;
            versions: Map<string, VersionAgg>;
        };

        const groupedData = new Map<string, GroupAgg>();

        sceneData.forEach((row) => {
            if (!row.od_version_minute) return;
            if (row.direction === undefined || row.direction === null) return;
            if (row.lane === undefined || row.lane === null) return;

            const direction = String(row.direction);
            const lane = String(row.lane);
            if (!direction || !lane) return;

            const key = `${direction}_${lane}`;
            if (!groupedData.has(key)) {
                groupedData.set(key, {
                    direction,
                    lane,
                    versions: new Map<string, VersionAgg>(),
                });
            }

            const group = groupedData.get(key)!;
            const versionKey = String(row.od_version_minute);

            if (!group.versions.has(versionKey)) {
                group.versions.set(versionKey, {
                    od_version_minute: versionKey,
                    gt: 0,
                    zone_counted: 0,
                });
            }

            const versionData = group.versions.get(versionKey)!;
            versionData.gt += row.gt || 0;
            versionData.zone_counted += row.zone_counted || 0;
        });

        const result: any[] = [];
        for (const [, group] of groupedData) {
            const rowData: any = {
                direction: group.direction,
                lane: group.lane,
            };

            const sortedVersions = Array.from(group.versions.values()).sort((a, b) =>
                String(a.od_version_minute).localeCompare(String(b.od_version_minute))
            );

            sortedVersions.forEach((version) => {
                const abs = calcAbsolute(version.gt, version.zone_counted);
                const versionKey = String(version.od_version_minute);
                rowData[`${versionKey}_gt`] = version.gt;
                rowData[`${versionKey}_zone_counted`] = version.zone_counted;
                rowData[`${versionKey}_absolute`] = abs;
            });

            result.push(rowData);
        }

        return result.sort((a, b) => {
            const directionCompare = String(a.direction).localeCompare(String(b.direction));
            if (directionCompare !== 0) return directionCompare;
            return String(a.lane).localeCompare(String(b.lane));
        });
    }, [sceneData]);

    // 所有 OD 版本（表头用）
    const allOdVersions = useMemo(() => {
        const versions = new Set<string>();
        sceneData.forEach((row) => {
            if (row.od_version_minute) versions.add(String(row.od_version_minute));
        });
        return Array.from(versions).sort();
    }, [sceneData]);

    return (
        <div
            style={{
                padding: 12,
                background: "white",
                border: "1px solid #eee",
                borderRadius: 10,
                minHeight: 300,
            }}
        >
            {/* 标题 + 切换按钮 */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                <div style={{ fontSize: 16, fontWeight: "bold" }}>{sceneName}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                        onClick={toggleDisplayMode}
                        style={{
                            padding: "4px 8px",
                            background: displayMode === "table" ? "#1890ff" : "#f0f0f0",
                            color: displayMode === "table" ? "white" : "#333",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: "bold",
                        }}
                    >
                        {displayMode === "chart" ? "表格" : "图表"}
                    </button>
                </div>
            </div>

            {/* 表格模式：原样保留 */}
            {displayMode === "table" && (
                <div style={{ overflow: "auto", maxHeight: 400 }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 12,
                        }}
                    >
                        <thead>
                            <tr style={{ background: "#f5f5f5" }}>
                                <th rowSpan={2} style={{ border: "1px solid #ddd", padding: "8px", minWidth: 80 }}>
                                    direction
                                </th>
                                <th rowSpan={2} style={{ border: "1px solid #ddd", padding: "8px", minWidth: 80 }}>
                                    lane
                                </th>
                                {allOdVersions.map((version) => (
                                    <th
                                        key={version}
                                        colSpan={3}
                                        style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}
                                    >
                                        {version}
                                    </th>
                                ))}
                            </tr>
                            <tr style={{ background: "#f5f5f5" }}>
                                {allOdVersions.map((version) => (
                                    <React.Fragment key={version}>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 60 }}>gt</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 90 }}>
                                            zone_counted
                                        </th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 80 }}>
                                            absolute
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.length > 0 ? (
                                tableData.map((row, idx) => (
                                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{row.direction}</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{row.lane}</td>

                                        {allOdVersions.map((version) => {
                                            const abs = row[`${version}_absolute`];
                                            const absText =
                                                typeof abs === "number" ? `${(abs * 100).toFixed(2)}%` : "0%";

                                            return (
                                                <React.Fragment key={version}>
                                                    <td
                                                        style={{
                                                            border: "1px solid #ddd",
                                                            padding: "8px",
                                                            textAlign: "center",
                                                        }}
                                                    >
                                                        {row[`${version}_gt`] || 0}
                                                    </td>
                                                    <td
                                                        style={{
                                                            border: "1px solid #ddd",
                                                            padding: "8px",
                                                            textAlign: "center",
                                                        }}
                                                    >
                                                        {row[`${version}_zone_counted`] || 0}
                                                    </td>
                                                    <td
                                                        style={{
                                                            border: "1px solid #ddd",
                                                            padding: "8px",
                                                            textAlign: "center",
                                                        }}
                                                    >
                                                        {absText}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={2 + allOdVersions.length * 3}
                                        style={{
                                            border: "1px solid #ddd",
                                            padding: "20px",
                                            textAlign: "center",
                                            color: "#666",
                                        }}
                                    >
                                        暂无表格数据
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 图表模式 */}
            {displayMode === "chart" && (
                <>
                    {/* direction 下拉（已去掉 lane 下拉） */}
                    {availableDirections.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                gap: 16,
                                marginBottom: 12,
                                alignItems: "center",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <label style={{ marginRight: 8, fontSize: 14 }}>direction：</label>
                                <select
                                    value={selectedDirectionForChart}
                                    onChange={(e) => handleDirectionChange(e.target.value)}
                                    style={{
                                        padding: "4px 8px",
                                        border: "1px solid #ddd",
                                        borderRadius: 4,
                                        fontSize: 14,
                                    }}
                                >
                                    <option value="">ALL</option>
                                    {availableDirections.map((direction) => (
                                        <option key={direction} value={direction}>
                                            {direction}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* 数据展示 */}
                    {loading ? (
                        <div
                            style={{
                                height: 200,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#666",
                            }}
                        >
                            正在加载场景数据...
                        </div>
                    ) : error ? (
                        <div
                            style={{
                                height: 200,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ff4d4f",
                            }}
                        >
                            {error}
                        </div>
                    ) : (
                        <div>
                            {/* 1) ALL：按 direction 多条线 */}
                            {!selectedDirectionForChart ? (
                                directionChartRows.length > 0 ? (
                                    <HomeLineChartAbs
                                        title=""
                                        rows={directionChartRows as any}
                                        xKey="od_version_minute"
                                        groupBy="direction"
                                    />
                                ) : (
                                    <div
                                        style={{
                                            height: 200,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#f9f9f9",
                                            borderRadius: 4,
                                            border: "1px dashed #ddd",
                                            color: "#666",
                                        }}
                                    >
                                        暂无有效数据
                                        <br />
                                        <span style={{ fontSize: 12 }}>
                                            (需要包含 od_version_minute / direction / gt / zone_counted 字段的数据)
                                        </span>
                                    </div>
                                )
                            ) : (
                                // 2) 指定 direction：该方向下按 lane 多条线
                                (() => {
                                    const laneRowsForDir = laneChartRows.filter(
                                        (r) => r.direction === selectedDirectionForChart
                                    );
                                    return laneRowsForDir.length > 0 ? (
                                        <HomeLineChartAbs
                                            title=""
                                            rows={laneRowsForDir as any}
                                            xKey="od_version_minute"
                                            groupBy="lane"
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                height: 200,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#f9f9f9",
                                                borderRadius: 4,
                                                border: "1px dashed #ddd",
                                                color: "#666",
                                            }}
                                        >
                                            暂无 {selectedDirectionForChart} 方向下各车道的数据
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
