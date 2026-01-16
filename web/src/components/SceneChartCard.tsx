import React, { useState, useMemo } from "react";
import HomeLineChart from "./HomeLineChart";

interface SceneChartCardProps {
    sceneName: string;
    platform: "arm" | "x86";
    sceneData: Record<string, any>[];
    index: number;
    totalScenes: number;
    loading: boolean;
    error?: string;
    selectedOdVersion?: string;
}

export default function SceneChartCard(props: SceneChartCardProps) {
    const { sceneName, sceneData, loading, error } = props;

    const [selectedDirectionForChart, setSelectedDirectionForChart] = useState("");
    const [selectedLaneForChart, setSelectedLaneForChart] = useState("");
    const [displayMode, setDisplayMode] = useState<"chart" | "table">("chart");

    const toggleDisplayMode = () => {
        setDisplayMode(displayMode === "chart" ? "table" : "chart");
    };

    // 计算precision和recall的函数
    function calculatePR(tp: number, fp: number, fn: number) {
        const precision = tp + fp === 0 ? 0 : Math.round((tp / (tp + fp)) * 10000) / 10000;
        const recall = tp + fn === 0 ? 0 : Math.round((tp / (tp + fn)) * 10000) / 10000;
        return { precision, recall };
    }

    // 场景级别数据：按od_version_minute分组聚合，计算PR
    const validSceneData = useMemo(() => {
        const versionMap = new Map<string, any>();

        sceneData.forEach((row) => {
            if (
                !row.od_version_minute ||
                row.tp === undefined ||
                row.fp === undefined ||
                row.fn === undefined
            ) {
                return;
            }

            const versionKey = String(row.od_version_minute);
            if (!versionMap.has(versionKey)) {
                versionMap.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    scene_name: row.scene_name,
                    tp: 0,
                    fp: 0,
                    fn: 0,
                });
            }

            const current = versionMap.get(versionKey);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        return Array.from(versionMap.values()).map((item) => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn),
        }));
    }, [sceneData]);

    // 获取所有可用的方向
    const availableDirections = useMemo(() => {
        const directions = new Set<string>();
        sceneData.forEach((row) => {
            if (row.direction) directions.add(String(row.direction));
        });
        return Array.from(directions).sort();
    }, [sceneData]);

    // 仅在选中方向后，提供该方向下的可用车道
    const availableLanesForSelectedDirection = useMemo(() => {
        if (!selectedDirectionForChart) return [];

        const lanes = new Set<string>();
        sceneData.forEach((row) => {
            if (String(row.direction) === selectedDirectionForChart && row.lane !== undefined && row.lane !== null) {
                lanes.add(String(row.lane));
            }
        });
        return Array.from(lanes).sort((a, b) => Number(a) - Number(b));
    }, [sceneData, selectedDirectionForChart]);

    // 方向选择变化：清空 lane（保证“下钻链路”一致）
    function handleDirectionChange(direction: string) {
        setSelectedDirectionForChart(direction);
        setSelectedLaneForChart("");
    }

    function handleLaneChange(lane: string) {
        setSelectedLaneForChart(lane);
    }

    // 方向过滤：按od_version_minute聚合，计算PR
    const filteredDirectionData = useMemo(() => {
        if (!selectedDirectionForChart) return [];

        const directionData = sceneData.filter(
            (row) => String(row.direction) === selectedDirectionForChart
        );

        const versionMap = new Map<string, any>();
        directionData.forEach((row) => {
            if (
                !row.od_version_minute ||
                row.tp === undefined ||
                row.fp === undefined ||
                row.fn === undefined
            ) {
                return;
            }

            const versionKey = String(row.od_version_minute);
            if (!versionMap.has(versionKey)) {
                versionMap.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    scene_name: row.scene_name,
                    direction: selectedDirectionForChart,
                    tp: 0,
                    fp: 0,
                    fn: 0,
                });
            }

            const current = versionMap.get(versionKey);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        return Array.from(versionMap.values()).map((item) => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn),
        }));
    }, [sceneData, selectedDirectionForChart]);

    // 车道过滤：按od_version_minute聚合，计算PR（direction 必选，lane 次选）
    const filteredLaneData = useMemo(() => {
        if (!selectedDirectionForChart || !selectedLaneForChart) return [];

        const laneData = sceneData
            .filter((row) => String(row.direction) === selectedDirectionForChart)
            .filter((row) => String(row.lane) === selectedLaneForChart);

        const versionMap = new Map<string, any>();
        laneData.forEach((row) => {
            if (
                !row.od_version_minute ||
                row.tp === undefined ||
                row.fp === undefined ||
                row.fn === undefined
            ) {
                return;
            }

            const versionKey = String(row.od_version_minute);
            if (!versionMap.has(versionKey)) {
                versionMap.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    scene_name: row.scene_name,
                    direction: selectedDirectionForChart,
                    lane: selectedLaneForChart,
                    tp: 0,
                    fp: 0,
                    fn: 0,
                });
            }

            const current = versionMap.get(versionKey);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        return Array.from(versionMap.values()).map((item) => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn),
        }));
    }, [sceneData, selectedLaneForChart, selectedDirectionForChart]);

    // 表格：按direction、lane、od_version_minute分组汇总
    const tableData = useMemo(() => {
        if (!sceneData.length) return [];

        type VersionAgg = {
            od_version_minute: string;
            od_version?: string;
            gt: number;
            tp: number;
            fp: number;
            fn: number;
        };

        type GroupAgg = {
            direction: string;
            lane: string | number;
            versions: Map<string, VersionAgg>;
        };

        const groupedData = new Map<string, GroupAgg>();

        sceneData.forEach((row) => {
            if (!row.direction || !row.lane || !row.od_version_minute) return;

            const key = `${row.direction}_${row.lane}`;
            if (!groupedData.has(key)) {
                groupedData.set(key, {
                    direction: row.direction,
                    lane: row.lane,
                    versions: new Map<string, any>(),
                });
            }

            const group = groupedData.get(key);
            const versionKey = String(row.od_version_minute);
            if (!group.versions.has(versionKey)) {
                group.versions.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    gt: 0,
                    tp: 0,
                    fp: 0,
                    fn: 0,
                });
            }

            const versionData = group.versions.get(versionKey);
            versionData.tp += row.tp || 0;
            versionData.fp += row.fp || 0;
            versionData.fn += row.fn || 0;
            versionData.gt += row.gt || 0;
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
                const pr = calculatePR(version.tp, version.fp, version.fn);
                const versionKey = String(version.od_version_minute);
                rowData[`${versionKey}_gt`] = version.gt;
                rowData[`${versionKey}_tp`] = version.tp;
                rowData[`${versionKey}_fp`] = version.fp;
                rowData[`${versionKey}_fn`] = version.fn;
                rowData[`${versionKey}_precision`] = pr.precision;
                rowData[`${versionKey}_recall`] = pr.recall;
            });

            result.push(rowData);
        }

        return result.sort((a, b) => {
            const directionCompare = String(a.direction).localeCompare(String(b.direction));
            if (directionCompare !== 0) return directionCompare;
            return Number(a.lane) - Number(b.lane);
        });
    }, [sceneData]);

    // 获取所有OD版本
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
            {/* 标题和按钮 */}
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

            {/* 表格模式 */}
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
                                <th
                                    rowSpan={2}
                                    style={{ border: "1px solid #ddd", padding: "8px", minWidth: 80 }}
                                >
                                    direction
                                </th>
                                <th
                                    rowSpan={2}
                                    style={{ border: "1px solid #ddd", padding: "8px", minWidth: 60 }}
                                >
                                    lane
                                </th>
                                {allOdVersions.map((version) => (
                                    <th
                                        key={version}
                                        colSpan={6}
                                        style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}
                                    >
                                        {version}
                                    </th>
                                ))}
                            </tr>
                            <tr style={{ background: "#f5f5f5" }}>
                                {allOdVersions.map((version) => (
                                    <React.Fragment key={version}>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 40 }}>gt</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 40 }}>tp</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 40 }}>fp</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 40 }}>fn</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 60 }}>precision</th>
                                        <th style={{ border: "1px solid #ddd", padding: "8px", minWidth: 60 }}>recall</th>
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

                                        {allOdVersions.map((version) => (
                                            <React.Fragment key={version}>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_gt`] || 0}
                                                </td>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_tp`] || 0}
                                                </td>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_fp`] || 0}
                                                </td>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_fn`] || 0}
                                                </td>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_precision`]
                                                        ? (row[`${version}_precision`] * 100).toFixed(2) + "%"
                                                        : "0%"}
                                                </td>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_recall`]
                                                        ? (row[`${version}_recall`] * 100).toFixed(2) + "%"
                                                        : "0%"}
                                                </td>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={2 + allOdVersions.length * 6}
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
                    {/* 下拉框下钻（只用 dropdown，不再 click 下钻） */}
                    {availableDirections.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                gap: 16,
                                marginBottom: 12,
                                alignItems: "center",
                            }}
                        >
                            {/* direction */}
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

                            {/* lane：只有选了方向才出现 */}
                            {selectedDirectionForChart && availableLanesForSelectedDirection.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <label style={{ marginRight: 8, fontSize: 14 }}>lane：</label>
                                    <select
                                        value={selectedLaneForChart}
                                        onChange={(e) => handleLaneChange(e.target.value)}
                                        style={{
                                            padding: "4px 8px",
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            fontSize: 14,
                                        }}
                                    >
                                        <option value="">ALL</option>
                                        {availableLanesForSelectedDirection.map((lane) => (
                                            <option key={lane} value={lane}>
                                                {lane}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                            {/* 1) direction+lane 都选：lane 曲线 */}
                            {selectedDirectionForChart && selectedLaneForChart ? (
                                filteredLaneData.length > 0 ? (
                                    <HomeLineChart title="" rows={filteredLaneData} xKey="od_version_minute" />
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
                                        暂无{selectedDirectionForChart}方向{selectedLaneForChart}车道的数据
                                    </div>
                                )
                            ) : /* 2) 只选 direction：direction 曲线 */
                                selectedDirectionForChart ? (
                                    filteredDirectionData.length > 0 ? (
                                        <HomeLineChart title="" rows={filteredDirectionData} xKey="od_version_minute" />
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
                                            暂无{selectedDirectionForChart}方向的数据
                                        </div>
                                    )
                                ) : (
                                    /* 3) ALL：scene 聚合曲线 */
                                    validSceneData.length > 0 ? (
                                        <HomeLineChart title="" rows={validSceneData} xKey="od_version_minute" />
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
                                            <span style={{ fontSize: 12 }}>(需要包含od_version_minute/tp/fp/fn字段的数据)</span>
                                        </div>
                                    )
                                )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
