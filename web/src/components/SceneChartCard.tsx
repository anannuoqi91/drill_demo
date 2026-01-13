import React, { useEffect, useState, useMemo } from "react";
import HomeLineChart from "./HomeLineChart";
import { querySceneDirectionsPR, queryDirectionLanesPR, type BaseInfo } from "../api";

type SceneLevel = "scene" | "direction" | "lane";

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
    const { sceneName, platform, sceneData, index, totalScenes, loading, error, selectedOdVersion } = props;

    const [level, setLevel] = useState<SceneLevel>("scene");
    const [odVersion, setOdVersion] = useState("");
    const [selectedDirectionForChart, setSelectedDirectionForChart] = useState("");
    const [selectedLaneForChart, setSelectedLaneForChart] = useState("");
    const [displayMode, setDisplayMode] = useState<"chart" | "table">("chart");

    // 方向级别的数据 - 按OD版本分组，每个方向在每个版本上显示PR
    const [directionRows, setDirectionRows] = useState<Record<string, any>[]>([]);
    // 车道级别的数据 - 按OD版本分组，每个车道在每个版本上显示PR
    const [laneRows, setLaneRows] = useState<Record<string, any>[]>([]);

    // 过滤出有效的OD版本数据（现在需要计算PR）
    const validSceneData = useMemo(() => {
        // 按od_version_minute分组聚合
        const versionMap = new Map();

        sceneData.forEach(row => {
            if (!row.od_version_minute ||
                row.tp === undefined ||
                row.fp === undefined ||
                row.fn === undefined) {
                return;
            }

            const versionKey = row.od_version_minute;
            if (!versionMap.has(versionKey)) {
                versionMap.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    scene_name: row.scene_name,
                    tp: 0,
                    fp: 0,
                    fn: 0
                });
            }

            const current = versionMap.get(versionKey);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        // 计算每个版本的PR
        return Array.from(versionMap.values()).map(item => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn)
        }));
    }, [sceneData]);

    // 获取所有可用的方向
    const availableDirections = useMemo(() => {
        const directions = new Set<string>();
        sceneData.forEach(row => {
            if (row.direction) {
                directions.add(row.direction);
            }
        });
        return Array.from(directions).sort();
    }, [sceneData]);

    const availableLanesForSelectedDirection = useMemo(() => {
        if (!selectedDirectionForChart) {
            // 如果没有选择方向，返回所有车道
            const lanes = new Set<string>();
            sceneData.forEach(row => {
                if (row.lane) {
                    lanes.add(String(row.lane));
                }
            });
            return Array.from(lanes).sort((a, b) => Number(a) - Number(b));
        }

        // 如果选择了方向，只返回该方向下的车道
        const lanes = new Set<string>();
        sceneData.forEach(row => {
            if (row.direction === selectedDirectionForChart && row.lane) {
                lanes.add(String(row.lane));
            }
        });
        return Array.from(lanes).sort((a, b) => Number(a) - Number(b));
    }, [sceneData, selectedDirectionForChart]);

    // 过滤特定方向的数据并按OD版本分组
    const filteredDirectionData = useMemo(() => {
        if (!selectedDirectionForChart) return [];

        // 过滤出选中方向的数据
        const directionData = sceneData.filter(row => row.direction === selectedDirectionForChart);

        // 按OD版本分组聚合
        const versionMap = new Map();

        directionData.forEach(row => {
            if (!row.od_version_minute ||
                row.tp === undefined ||
                row.fp === undefined ||
                row.fn === undefined) {
                return;
            }

            const versionKey = row.od_version_minute;
            if (!versionMap.has(versionKey)) {
                versionMap.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    scene_name: row.scene_name,
                    direction: selectedDirectionForChart,
                    tp: 0,
                    fp: 0,
                    fn: 0
                });
            }

            const current = versionMap.get(versionKey);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        // 计算每个版本的PR
        return Array.from(versionMap.values()).map(item => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn)
        }));
    }, [sceneData, selectedDirectionForChart]);


    // 过滤特定车道的数据并按OD版本分组
    const filteredLaneData = useMemo(() => {
        if (!selectedLaneForChart) return [];

        // 过滤出选中车道的数据，如果选择了方向，还要过滤方向
        let laneData = sceneData;
        if (selectedDirectionForChart) {
            laneData = laneData.filter(row => row.direction === selectedDirectionForChart);
        }
        laneData = laneData.filter(row => String(row.lane) === selectedLaneForChart);

        // 按OD版本分组聚合
        const versionMap = new Map();

        laneData.forEach(row => {
            if (!row.od_version_minute ||
                row.tp === undefined ||
                row.fp === undefined ||
                row.fn === undefined) {
                return;
            }

            const versionKey = row.od_version_minute;
            if (!versionMap.has(versionKey)) {
                versionMap.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    scene_name: row.scene_name,
                    direction: row.direction,
                    lane: selectedLaneForChart,
                    tp: 0,
                    fp: 0,
                    fn: 0
                });
            }

            const current = versionMap.get(versionKey);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        // 计算每个版本的PR
        return Array.from(versionMap.values()).map(item => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn)
        }));
    }, [sceneData, selectedLaneForChart, selectedDirectionForChart]);

    // 设置OD版本
    useEffect(() => {
        if (selectedOdVersion) {
            setOdVersion(selectedOdVersion);
        } else if (validSceneData.length > 0) {
            // 使用第一个有效数据的OD版本
            setOdVersion(validSceneData[0].od_version_minute);
        }
    }, [selectedOdVersion, validSceneData]);

    // 计算precision和recall的函数
    function calculatePR(tp: number, fp: number, fn: number) {
        const precision = tp + fp === 0 ? 0 : Math.round((tp / (tp + fp)) * 10000) / 10000;
        const recall = tp + fn === 0 ? 0 : Math.round((tp / (tp + fn)) * 10000) / 10000;
        return { precision, recall };
    }

    // 生成表格数据
    const tableData = useMemo(() => {
        if (!sceneData.length) return [];

        // 按direction、lane、od_version_minute分组
        const groupedData = new Map();

        sceneData.forEach(row => {
            if (!row.direction || !row.lane || !row.od_version_minute) return;

            const key = `${row.direction}_${row.lane}`;
            if (!groupedData.has(key)) {
                groupedData.set(key, {
                    direction: row.direction,
                    lane: row.lane,
                    versions: new Map()
                });
            }

            const group = groupedData.get(key);
            const versionKey = row.od_version_minute;
            if (!group.versions.has(versionKey)) {
                group.versions.set(versionKey, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    gt: 0,
                    tp: 0,
                    fp: 0,
                    fn: 0
                });
            }

            const versionData = group.versions.get(versionKey);
            versionData.tp += row.tp || 0;
            versionData.fp += row.fp || 0;
            versionData.fn += row.fn || 0;
            versionData.gt += row.gt || 0;
        });

        // 转换为数组格式并计算PR
        const result = [];
        for (const [key, group] of groupedData) {
            const rowData: any = {
                direction: group.direction,
                lane: group.lane,
            };

            // 按od_version_minute排序并添加版本数据
            const sortedVersions = Array.from(group.versions.values())
                .sort((a, b) => String(a.od_version_minute).localeCompare(String(b.od_version_minute)));

            sortedVersions.forEach(version => {
                const pr = calculatePR(version.tp, version.fp, version.fn);
                const versionKey = version.od_version_minute;
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
        sceneData.forEach(row => {
            if (row.od_version_minute) {
                versions.add(row.od_version_minute);
            }
        });
        return Array.from(versions).sort();
    }, [sceneData]);

    const toggleDisplayMode = () => {
        setDisplayMode(displayMode === "chart" ? "table" : "chart");
    };

    // 方向级别的数据聚合 - 按OD版本分组，每个方向在每个版本上显示PR
    function aggregateDirectionData(rows: Record<string, any>[]) {
        const versionDirectionMap = new Map();

        rows.forEach(row => {
            const versionKey = row.od_version_minute;
            const direction = row.direction;
            const key = `${versionKey}_${direction}`;

            if (!versionDirectionMap.has(key)) {
                versionDirectionMap.set(key, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    direction: direction,
                    tp: 0,
                    fp: 0,
                    fn: 0
                });
            }

            const current = versionDirectionMap.get(key);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        return Array.from(versionDirectionMap.values()).map(item => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn)
        }));
    }

    // 车道级别的数据聚合 - 按OD版本分组，每个车道在每个版本上显示PR
    function aggregateLaneData(rows: Record<string, any>[]) {
        const versionLaneMap = new Map();

        rows.forEach(row => {
            const versionKey = row.od_version_minute;
            const lane = row.lane;
            const key = `${versionKey}_${lane}`;

            if (!versionLaneMap.has(key)) {
                versionLaneMap.set(key, {
                    od_version_minute: versionKey,
                    od_version: row.od_version,
                    od_time_minute: row.od_time_minute,
                    lane: lane,
                    tp: 0,
                    fp: 0,
                    fn: 0
                });
            }

            const current = versionLaneMap.get(key);
            current.tp += row.tp || 0;
            current.fp += row.fp || 0;
            current.fn += row.fn || 0;
        });

        return Array.from(versionLaneMap.values()).map(item => ({
            ...item,
            ...calculatePR(item.tp, item.fp, item.fn)
        }));
    }

    // 下钻到方向级别
    async function drillSceneToDirection(odVersionMinute: string) {
        if (!odVersionMinute) return;

        // 过滤出当前OD版本的数据
        const currentOdData = sceneData.filter(row =>
            row.od_version_minute === odVersionMinute
        );

        if (currentOdData.length === 0) return;

        try {
            // 在前端聚合方向级别的数据 - 按OD版本分组
            const directionRows = aggregateDirectionData(currentOdData);
            directionRows.sort((a: any, b: any) => {
                // 先按方向排序，再按OD版本排序
                const directionCompare = String(a.direction ?? "").localeCompare(String(b.direction ?? ""));
                if (directionCompare !== 0) return directionCompare;
                return String(a.od_version_minute ?? "").localeCompare(String(b.od_version_minute ?? ""));
            });

            setSelectedDirectionForChart("");
            setDirectionRows(directionRows);
            setLaneRows([]);
            setLevel("direction");
        } catch (error) {
            console.error(`下钻到方向级别失败:`, error);
        }
    }

    // 下钻到车道级别
    async function drillDirectionToLane(direction: string) {
        if (!odVersion) return;

        // 过滤出当前OD版本和方向的数据
        const currentDirectionData = sceneData.filter(row =>
            row.od_version_minute === odVersion &&
            row.direction === direction
        );

        if (currentDirectionData.length === 0) return;

        try {
            // 车道级别的数据 - 按OD版本分组
            const laneRows = aggregateLaneData(currentDirectionData);
            laneRows.sort((a: any, b: any) => {
                // 先按车道排序，再按OD版本排序
                const laneCompare = Number(a.lane ?? 0) - Number(b.lane ?? 0);
                if (laneCompare !== 0) return laneCompare;
                return String(a.od_version_minute ?? "").localeCompare(String(b.od_version_minute ?? ""));
            });
            setSelectedDirectionForChart("");
            setLaneRows(laneRows);
            setLevel("lane");
        } catch (error) {
            console.error(`下钻到车道级别失败:`, error);
        }
    }

    // 处理方向选择变化
    function handleDirectionChange(direction: string) {
        setSelectedDirectionForChart(direction);
        setSelectedLaneForChart(""); // 清空车道选择
    }

    // 处理车道选择变化
    function handleLaneChange(lane: string) {
        setSelectedLaneForChart(lane);
    }

    // 返回场景级别
    function backToScene() {
        setLevel("scene");
        setSelectedDirectionForChart("");
        setSelectedLaneForChart("");
        setDirectionRows([]);
        setLaneRows([]);
    }


    return (
        <div style={{
            padding: 12,
            background: "white",
            border: "1px solid #eee",
            borderRadius: 10,
            minHeight: 300
        }}>
            {/* 标题和导航 */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
            }}>
                <div style={{ fontSize: 16, fontWeight: "bold" }}>
                    {sceneName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* 表格按钮 */}
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
                            fontWeight: "bold"
                        }}
                    >
                        {displayMode === "chart" ? "表格" : "图表"}
                    </button>
                    {level !== "scene" && (
                        <button
                            onClick={backToScene}
                            style={{
                                padding: "4px 8px",
                                background: "#f0f0f0",
                                border: "1px solid #ddd",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontSize: 12
                            }}
                        >
                            返回场景
                        </button>
                    )}
                </div>
            </div>

            {/* 表格模式显示 */}
            {displayMode === "table" && (
                <div style={{ overflow: "auto", maxHeight: 400 }}>
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12
                    }}>
                        <thead>
                            {/* 第一行表头：OD版本 */}
                            <tr style={{ background: "#f5f5f5" }}>
                                <th rowSpan={2} style={{ border: "1px solid #ddd", padding: "8px", minWidth: 80 }}>direction</th>
                                <th rowSpan={2} style={{ border: "1px solid #ddd", padding: "8px", minWidth: 60 }}>lane</th>
                                {allOdVersions.map(version => (
                                    <th
                                        key={version}
                                        colSpan={6}
                                        style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}
                                    >
                                        {version}
                                    </th>
                                ))}
                            </tr>
                            {/* 第二行表头：指标列 */}
                            <tr style={{ background: "#f5f5f5" }}>
                                {allOdVersions.map(version => (
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
                                tableData.map((row, index) => (
                                    <tr key={index} style={{ background: index % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{row.direction}</td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{row.lane}</td>
                                        {allOdVersions.map(version => (
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
                                                    {row[`${version}_precision`] ? (row[`${version}_precision`] * 100).toFixed(2) + '%' : '0%'}
                                                </td>
                                                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                    {row[`${version}_recall`] ? (row[`${version}_recall`] * 100).toFixed(2) + '%' : '0%'}
                                                </td>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={3 + allOdVersions.length * 5}
                                        style={{
                                            border: "1px solid #ddd",
                                            padding: "20px",
                                            textAlign: "center",
                                            color: "#666"
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
            {/* 图表模式显示 */}
            {displayMode === "chart" && (
                <>
                    {/* 方向选择下拉框（仅在场景级别显示） */}
                    {level === "scene" && (availableDirections.length > 0 || availableLanesForSelectedDirection.length > 0) && (
                        <div style={{
                            display: "flex",
                            gap: 16,
                            marginBottom: 12,
                            alignItems: "center"
                        }}>
                            {/* 方向下拉框 */}
                            {availableDirections.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <label style={{ marginRight: 8, fontSize: 14 }}>direction：</label>
                                    <select
                                        value={selectedDirectionForChart}
                                        onChange={(e) => handleDirectionChange(e.target.value)}
                                        style={{
                                            padding: "4px 8px",
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            fontSize: 14
                                        }}
                                    >
                                        <option value="">ALL</option>
                                        {availableDirections.map(direction => (
                                            <option key={direction} value={direction}>
                                                {direction}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* 车道下拉框 */}
                            {availableLanesForSelectedDirection.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <label style={{ marginRight: 8, fontSize: 14 }}>lane：</label>
                                    <select
                                        value={selectedLaneForChart}
                                        onChange={(e) => handleLaneChange(e.target.value)}
                                        disabled={!selectedDirectionForChart || selectedDirectionForChart === ""} // 修改禁用条件
                                        style={{
                                            padding: "4px 8px",
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            fontSize: 14,
                                            backgroundColor: (selectedDirectionForChart && selectedDirectionForChart !== "") ? "white" : "#f5f5f5", // 修改背景色条件
                                            color: (selectedDirectionForChart && selectedDirectionForChart !== "") ? "black" : "#999" // 修改文字颜色条件
                                        }}
                                    >
                                        <option value="">ALL</option>
                                        {availableLanesForSelectedDirection.map(lane => (
                                            <option key={lane} value={lane}>
                                                {lane}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                    {/* 场景数据内容 */}
                    {loading ? (
                        <div style={{
                            height: 200,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#666"
                        }}>
                            正在加载场景数据...
                        </div>
                    ) : error ? (
                        <div style={{
                            height: 200,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ff4d4f"
                        }}>
                            {error}
                        </div>
                    ) : (
                        <div>
                            {/* 根据级别显示不同的图表 */}
                            {level === "scene" && (
                                <>
                                    {selectedDirectionForChart && selectedLaneForChart ? (
                                        // 显示选中方向和车道的折线图
                                        filteredLaneData.length > 0 ? (
                                            <HomeLineChart
                                                title=""
                                                rows={filteredLaneData}
                                                xKey="od_version_minute"
                                            />
                                        ) : (
                                            <div style={{
                                                height: 200,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#f9f9f9",
                                                borderRadius: 4,
                                                border: "1px dashed #ddd",
                                                color: "#666"
                                            }}>
                                                暂无{selectedDirectionForChart}方向{selectedLaneForChart}车道的数据
                                            </div>
                                        )
                                    ) : selectedDirectionForChart ? (
                                        // 显示选中方向的折线图
                                        filteredDirectionData.length > 0 ? (
                                            <HomeLineChart
                                                title=""
                                                rows={filteredDirectionData}
                                                xKey="od_version_minute"
                                            />
                                        ) : (
                                            <div style={{
                                                height: 200,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#f9f9f9",
                                                borderRadius: 4,
                                                border: "1px dashed #ddd",
                                                color: "#666"
                                            }}>
                                                暂无{selectedDirectionForChart}方向的数据
                                            </div>
                                        )
                                    ) : selectedLaneForChart ? (
                                        // 显示选中车道的折线图
                                        filteredLaneData.length > 0 ? (
                                            <HomeLineChart
                                                title=""
                                                rows={filteredLaneData}
                                                xKey="od_version_minute"
                                            />
                                        ) : (
                                            <div style={{
                                                height: 200,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#f9f9f9",
                                                borderRadius: 4,
                                                border: "1px dashed #ddd",
                                                color: "#666"
                                            }}>
                                                暂无{selectedLaneForChart}车道的数据
                                            </div>
                                        )
                                    ) : (
                                        // 显示所有场景数据的折线图
                                        validSceneData.length > 0 ? (
                                            <HomeLineChart
                                                title=""
                                                rows={validSceneData}
                                                xKey="od_version_minute"
                                                onClickCategory={drillSceneToDirection}
                                            />
                                        ) : (
                                            <div style={{
                                                height: 200,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#f9f9f9",
                                                borderRadius: 4,
                                                border: "1px dashed #ddd",
                                                color: "#666"
                                            }}>
                                                暂无有效数据
                                                <br />
                                                <span style={{ fontSize: 12 }}>
                                                    (需要包含od_version、precision、recall字段的数据)
                                                </span>
                                            </div>
                                        )
                                    )}
                                </>
                            )}

                            {level === "direction" && (
                                directionRows.length > 0 ? (
                                    <HomeLineChart
                                        title=""
                                        rows={directionRows}
                                        xKey="od_version_minute"
                                        groupBy="direction"
                                        onClickCategory={drillDirectionToLane}
                                    />
                                ) : (
                                    <div style={{
                                        height: 200,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#f9f9f9",
                                        borderRadius: 4,
                                        border: "1px dashed #ddd",
                                        color: "#666"
                                    }}>
                                        暂无方向数据
                                    </div>
                                )
                            )}

                            {level === "lane" && (
                                laneRows.length > 0 ? (
                                    <HomeLineChart
                                        title=""
                                        rows={laneRows}
                                        xKey="od_version_minute"
                                        groupBy="lane"
                                    />
                                ) : (
                                    <div style={{
                                        height: 200,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#f9f9f9",
                                        borderRadius: 4,
                                        border: "1px dashed #ddd",
                                        color: "#666"
                                    }}>
                                        暂无车道数据
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