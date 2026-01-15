import React, { useEffect, useState } from "react";
import Sidebar, { NavKey } from "./components/Sidebar";
import BaseInfoDrillCard from "./components/BaseInfoDrillCard";
import SceneChartCard from "./components/SceneChartCard";
import MultiSelectDropdown from "./components/MultiSelectDropdown";
import type { BaseInfo, ODVersionItem, ODVersionsResponse } from "./api";
import { getODVersions, getAllScenes, getSceneData, getMultiVersionSceneData } from "./api/home";

const BASEINFO_CONFIGS: { key: string; baseinfo: BaseInfo; title: string }[] = [
    { key: "arm_fk", baseinfo: { platform: "arm", data_fix: "_FK_" }, title: "arm _FK" },
    { key: "arm_rw", baseinfo: { platform: "arm", data_fix: "_RW_" }, title: "arm _RW" },
    { key: "arm_re1x", baseinfo: { platform: "arm", data_fix: "_RE1X_" }, title: "arm _RE1X" },
    { key: "x86_fk", baseinfo: { platform: "x86", data_fix: "_FK_" }, title: "x86 _FK" },
    { key: "x86_rw", baseinfo: { platform: "x86", data_fix: "_RW_" }, title: "x86 _RW" },
    { key: "x86_re1x", baseinfo: { platform: "x86", data_fix: "_RE1X_" }, title: "x86 _RE1X" },
];

// 场景数据接口
interface SceneData {
    scene_name: string;
    data: Record<string, any>[];
    loading: boolean;
    error?: string;
}

export default function App() {
    const [page, setPage] = useState<NavKey>("home");
    const [odVersions, setOdVersions] = useState<ODVersionItem[]>([]);
    const [selectedOdVersion, setSelectedOdVersion] = useState<string>("");
    const [platformScenes, setPlatformScenes] = useState<string[]>([]);
    const [currentPlatform, setCurrentPlatform] = useState<"arm" | "x86" | "">("");
    const [allSceneData, setAllSceneData] = useState<Record<string, any>[]>([]);
    const [scenesData, setScenesData] = useState<SceneData[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // 新增状态：多选OD版本
    const [selectedOdVersions, setSelectedOdVersions] = useState<string[]>([]);
    // 新增状态：是否使用多版本模式
    const [useMultiVersionMode, setUseMultiVersionMode] = useState(false);
    // 新增状态：下拉框是否展开
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 新增状态：自测页面专用
    const [triggerLink, setTriggerLink] = useState(""); // trigger link输入
    const [showTriggerLinkModal, setShowTriggerLinkModal] = useState(false); // 显示trigger link模态框
    const [testVersion, setTestVersion] = useState(""); // test版本
    const [baselineVersion, setBaselineVersion] = useState(""); // baseline版本
    const [selectedScenes, setSelectedScenes] = useState<string[]>([]); // 选中的场景
    const [isSceneDropdownOpen, setIsSceneDropdownOpen] = useState(false); // 场景下拉框是否展开
    // 新增状态：数据导入模态框下拉框
    const [testPlatform, setTestPlatform] = useState(""); // 测试平台：arm、x86
    const [appData, setAppData] = useState(""); // 应用数据：stop_bar_statistic_with_time、stop_bar_statistic_without_time

    // 处理多选OD版本确定按钮点击
    const handleMultiVersionConfirm = () => {
        if (selectedOdVersions.length > 0) {
            // 启用多版本模式
            setUseMultiVersionMode(true);

            // 设置加载状态
            const loadingScenesData = platformScenes.map(sceneName => ({
                scene_name: sceneName,
                data: [],
                loading: true
            }));
            setScenesData(loadingScenesData);

            // 触发重新加载数据
            setRefreshTrigger(prev => prev + 1);
        }
    };

    // 重置多版本模式
    const resetMultiVersionMode = () => {
        setUseMultiVersionMode(false);
        setSelectedOdVersions([]);
        setIsDropdownOpen(false);

        // 设置加载状态
        const loadingScenesData = platformScenes.map(sceneName => ({
            scene_name: sceneName,
            data: [],
            loading: true
        }));
        setScenesData(loadingScenesData);

        // 触发重新加载数据
        setRefreshTrigger(prev => prev + 1);
    };

    // 切换版本选择
    const toggleVersionSelection = (version: string) => {
        setSelectedOdVersions(prev => {
            if (prev.includes(version)) {
                return prev.filter(v => v !== version);
            } else {
                return [...prev, version];
            }
        });
    };

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (selectedOdVersions.length === odVersions.length) {
            setSelectedOdVersions([]);
        } else {
            setSelectedOdVersions(odVersions.map(item => item.od_version_minute));
        }
    };

    // 自测页面：切换场景选择
    const toggleSceneSelection = (scene: string) => {
        setSelectedScenes(prev => {
            if (prev.includes(scene)) {
                return prev.filter(s => s !== scene);
            } else {
                return [...prev, scene];
            }
        });
    };

    // 自测页面：全选/取消全选场景
    const toggleSelectAllScenes = () => {
        if (selectedScenes.length === platformScenes.length) {
            setSelectedScenes([]);
        } else {
            setSelectedScenes([...platformScenes]);
        }
    };

    // 自测页面：处理trigger link确认
    const handleTriggerLinkConfirm = () => {
        // 这里可以添加处理trigger link的逻辑
        console.log("Trigger Link:", triggerLink);
        console.log("测试平台:", testPlatform);
        console.log("应用数据:", appData);
        setShowTriggerLinkModal(false);
        setTriggerLink(""); // 清空输入框
        setTestPlatform(""); // 重置测试平台
        setAppData(""); // 重置应用数据
    };

    // 自测页面：重置功能
    const handleSelfTestReset = () => {
        setTriggerLink("");
        setTestVersion("");
        setBaselineVersion("");
        setSelectedScenes([]);
        setTestPlatform(""); // 重置测试平台
        setAppData(""); // 重置应用数据
        // 重置数据状态
        setScenesData([]);
        setAllSceneData([]);
    };

    useEffect(() => {
        // 每张卡片自己会 load，不需要 App 统一 load
    }, [page]);

    // 加载OD版本列表
    useEffect(() => {
        const loadODVersions = async () => {
            try {
                const response: ODVersionsResponse = await getODVersions();
                setOdVersions(response.rows);
                if (response.rows.length > 0) {
                    setSelectedOdVersion(response.rows[0].od_version_minute);
                }
            } catch (error) {
                console.error("加载OD版本列表失败:", error);
            }
        };
        loadODVersions();
    }, []);

    // 加载平台的所有场景列表（用于确定图表数量）
    useEffect(() => {
        const loadPlatformScenes = async () => {
            if (page === "arm" || page === "x86") {
                const platform = page;
                setCurrentPlatform(platform);
                try {
                    const response = await getAllScenes({
                        platform: platform
                    });
                    const sceneNames = response.rows.map(row => row.scene_name).filter(Boolean);
                    setPlatformScenes(sceneNames);

                    // 初始化场景数据状态
                    const initialScenesData: SceneData[] = sceneNames.map(sceneName => ({
                        scene_name: sceneName,
                        data: [],
                        loading: true
                    }));
                    setScenesData(initialScenesData);
                } catch (error) {
                    console.error(`加载${platform}场景列表失败:`, error);
                    setPlatformScenes([]);
                    setScenesData([]);
                }
            } else {
                setPlatformScenes([]);
                setCurrentPlatform("");
                setScenesData([]);
                setAllSceneData([]);
            }
        };
        loadPlatformScenes();
    }, [page, refreshTrigger]);

    // 加载所有场景的数据（一次性获取所有数据）
    useEffect(() => {
        const loadAllSceneData = async () => {
            if ((page === "arm" || page === "x86") && platformScenes.length > 0) {
                const platform = page;

                try {
                    // 只有在多版本模式下且选择了版本时才使用多版本查询
                    if (useMultiVersionMode && selectedOdVersions.length > 0) {
                        const response = await getMultiVersionSceneData({
                            od_versions: selectedOdVersions,
                            baseinfo: { platform: platform, data_fix: "_FK_" }
                        });

                        setAllSceneData(response.rows);

                        // 前端根据场景名称筛选和分配数据
                        const filteredScenesData = platformScenes.map(sceneName => {
                            const sceneData = response.rows.filter(row =>
                                row.scene_name === sceneName
                            );

                            return {
                                scene_name: sceneName,
                                data: sceneData,
                                loading: false
                            };
                        });

                        setScenesData(filteredScenesData);
                    } else {
                        // 否则使用默认的单版本查询（保持原有逻辑）
                        const response = await getSceneData({
                            od_version: "latest",
                            baseinfo: { platform: platform, data_fix: "_FK_" }
                        });

                        setAllSceneData(response.rows);

                        const filteredScenesData = platformScenes.map(sceneName => {
                            const sceneData = response.rows.filter(row =>
                                row.scene_name === sceneName
                            );

                            return {
                                scene_name: sceneName,
                                data: sceneData,
                                loading: false
                            };
                        });

                        setScenesData(filteredScenesData);
                    }
                } catch (error) {
                    console.error(`加载场景数据失败:`, error);
                    const errorScenesData = platformScenes.map(sceneName => ({
                        scene_name: sceneName,
                        data: [],
                        loading: false,
                        error: `加载失败: ${error}`
                    }));
                    setScenesData(errorScenesData);
                }
            }
        };

        loadAllSceneData();
    }, [page, platformScenes, selectedOdVersion, refreshTrigger, useMultiVersionMode, selectedOdVersions]);

    // 刷新当前页面数据的函数（不刷新整个页面）
    const handleRefresh = () => {
        if (page === "arm" || page === "x86") {
            // 设置加载状态
            const loadingScenesData = platformScenes.map(sceneName => ({
                scene_name: sceneName,
                data: [],
                loading: true
            }));
            setScenesData(loadingScenesData);

            // 触发重新加载数据
            setRefreshTrigger(prev => prev + 1);
        } else if (page === "selftest") {
            // 自测页面刷新：重置所有状态
            handleSelfTestReset();
        } else {
            // 对于其他页面，保持原来的刷新行为
            window.location.reload();
        }
    };

    // 渲染卡片网格布局 - 首页使用
    const renderCardGrid = (configs: typeof BASEINFO_CONFIGS) => (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {configs.map((cfg) => (
                <BaseInfoDrillCard
                    key={cfg.key}
                    title={cfg.title}
                    baseinfo={cfg.baseinfo}
                    selectedOdVersion={selectedOdVersion}
                />
            ))}
        </div>
    );

    // 渲染动态场景图表 - arm/x86页面专用
    const renderDynamicScenes = () => {
        if (platformScenes.length === 0 && (page === "arm" || page === "x86")) {
            return <div style={{ padding: 16, textAlign: "center" }}>正在加载场景数据...</div>;
        }

        if (platformScenes.length === 0) {
            return null;
        }

        return (
            <div style={{
                padding: 16,
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 16
            }}>
                {scenesData.map((sceneData, index) => (
                    <SceneChartCard
                        key={sceneData.scene_name}
                        sceneName={sceneData.scene_name}
                        platform={currentPlatform as "arm" | "x86"}
                        sceneData={sceneData.data}  // 这里传入的是当前场景的数据
                        index={index}
                        totalScenes={platformScenes.length}
                        loading={sceneData.loading}
                        error={sceneData.error}
                        selectedOdVersion={selectedOdVersion}
                    />
                ))}
            </div>
        );
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, Arial" }}>
            <div style={{
                position: "sticky",
                top: 0,
                height: "100vh",
                overflowY: "auto"
            }}>
                <Sidebar active={page} onSelect={setPage} />
            </div>

            <div style={{ flex: 1, background: "#fafafa" }}>
                <div style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2000,
                    padding: 16,
                    borderBottom: "1px solid #eee",
                    background: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                            {page === "home" ? "首页" : page === "arm" ? "arm评测" : page === "x86" ? "x86评测" : page === "selftest" ? "自测" : ""}
                        </div>
                        <div style={{ color: "#666", marginTop: 4, fontSize: 12 }}>
                            {(page === "arm" || page === "x86") && platformScenes.length > 0
                                ? `${currentPlatform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条${useMultiVersionMode && selectedOdVersions.length > 0
                                    ? `，显示版本: ${selectedOdVersions.join(", ")}`
                                    : "，默认显示最新版本"
                                }`
                                : page === "selftest"
                                    ? "自测数据对比分析"
                                    : "默认显示OD最近版本的评测结果"}
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* 只在arm和x86页面显示多选OD版本下拉框 - 优化为紧凑形式 */}
                        {(page === "arm" || page === "x86") && (
                            <MultiSelectDropdown
                                label="OD版本:"
                                items={odVersions.map((it) => ({ value: it.od_version_minute }))}
                                selected={selectedOdVersions}
                                onChange={setSelectedOdVersions}
                                open={isDropdownOpen}
                                setOpen={setIsDropdownOpen}
                                onConfirm={handleMultiVersionConfirm}
                                onReset={useMultiVersionMode ? resetMultiVersionMode : undefined}
                                width={220}
                            />
                        )}


                        {/* 只在首页显示OD版本下拉框 */}
                        {page === "home" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500 }}>OD版本:</label>
                                <select
                                    value={selectedOdVersion}
                                    onChange={(e) => setSelectedOdVersion(e.target.value)}
                                    style={{
                                        padding: "6px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        minWidth: "200px"
                                    }}
                                >
                                    {odVersions.map((item) => (
                                        <option key={item.od_version_minute} value={item.od_version_minute}>
                                            {item.od_version_minute}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handleRefresh}
                            style={{
                                padding: "8px 16px",
                                background: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500"
                            }}
                        >
                            刷新
                        </button>
                    </div>
                </div>

                {/* 自测页面容器A */}
                {page === "selftest" && (
                    <div style={{
                        padding: "16px",
                        background: "white",
                        borderBottom: "1px solid #eee",
                        marginBottom: "16px"
                    }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "16px",
                            alignItems: "end"
                        }}>
                            {/* 数据导入按钮 */}
                            <div>
                                <button
                                    onClick={() => setShowTriggerLinkModal(true)}
                                    style={{
                                        padding: "8px 16px",
                                        background: "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        width: "100%"
                                    }}
                                >
                                    数据导入
                                </button>
                            </div>

                            {/* test版本下拉框 */}
                            <div>
                                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                    test版本:
                                </label>
                                <select
                                    value={testVersion}
                                    onChange={(e) => setTestVersion(e.target.value)}
                                    style={{
                                        padding: "6px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        width: "100%"
                                    }}
                                >
                                    <option value="">请选择版本</option>
                                    {odVersions.map((item) => (
                                        <option key={item.od_version_minute} value={item.od_version_minute}>
                                            {item.od_version_minute}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* baseline版本下拉框 */}
                            <div>
                                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                    baseline版本:
                                </label>
                                <select
                                    value={baselineVersion}
                                    onChange={(e) => setBaselineVersion(e.target.value)}
                                    style={{
                                        padding: "6px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        width: "100%"
                                    }}
                                >
                                    <option value="">请选择版本</option>
                                    {odVersions.map((item) => (
                                        <option key={item.od_version_minute} value={item.od_version_minute}>
                                            {item.od_version_minute}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* scene多选下拉框 */}
                            <div style={{ position: "relative" }}>
                                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                    scene选择:
                                </label>

                                {/* 下拉框触发按钮 */}
                                <button
                                    onClick={() => setIsSceneDropdownOpen(!isSceneDropdownOpen)}
                                    style={{
                                        padding: "6px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        width: "100%",
                                        background: "white",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <span>
                                        {selectedScenes.length === 0
                                            ? "选择场景"
                                            : selectedScenes.length === 1
                                                ? selectedScenes[0]
                                                : `已选 ${selectedScenes.length} 个场景`
                                        }
                                    </span>
                                    <span style={{ transform: isSceneDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                        ▼
                                    </span>
                                </button>

                                {/* 下拉菜单 */}
                                {isSceneDropdownOpen && (
                                    <div style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        background: "white",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                        zIndex: 1000,
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                        marginTop: "2px"
                                    }}>
                                        {/* 全选选项 */}
                                        <div
                                            style={{
                                                padding: "6px 12px",
                                                borderBottom: "1px solid #eee",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                background: selectedScenes.length === platformScenes.length ? "#f0f8ff" : "white"
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelectAllScenes();
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedScenes.length === platformScenes.length}
                                                readOnly
                                                style={{ margin: 0, pointerEvents: "none" }}
                                            />
                                            <span style={{ fontSize: "12px", fontWeight: "500" }}>
                                                全选 ({platformScenes.length})
                                            </span>
                                        </div>

                                        {/* 场景列表 */}
                                        {platformScenes.map((scene) => (
                                            <div
                                                key={scene}
                                                style={{
                                                    padding: "6px 12px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    background: selectedScenes.includes(scene) ? "#f0f8ff" : "white"
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSceneSelection(scene);
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedScenes.includes(scene)}
                                                    readOnly
                                                    style={{ margin: 0, pointerEvents: "none" }}
                                                />
                                                <span style={{ fontSize: "12px" }}>
                                                    {scene}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* trigger link模态框 */}
                {showTriggerLinkModal && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 3000
                    }}>
                        <div style={{
                            background: "white",
                            padding: "24px",
                            borderRadius: "8px",
                            width: "500px", // 增加宽度以容纳更多内容
                            maxWidth: "90vw"
                        }}>
                            <h3 style={{ marginBottom: "16px" }}>数据导入配置</h3>

                            {/* trigger link输入框 */}
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                    trigger link:
                                </label>
                                <input
                                    type="text"
                                    value={triggerLink}
                                    onChange={(e) => setTriggerLink(e.target.value)}
                                    placeholder="请输入trigger link"
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px"
                                    }}
                                />
                            </div>

                            {/* 测试平台下拉框 */}
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                    测试平台:
                                </label>
                                <select
                                    value={testPlatform}
                                    onChange={(e) => setTestPlatform(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        background: "white"
                                    }}
                                >
                                    <option value="">请选择测试平台</option>
                                    <option value="arm">arm</option>
                                    <option value="x86">x86</option>
                                </select>
                            </div>

                            {/* 应用数据下拉框 */}
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                    应用数据:
                                </label>
                                <select
                                    value={appData}
                                    onChange={(e) => setAppData(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        background: "white"
                                    }}
                                >
                                    <option value="">请选择应用数据</option>
                                    <option value="stop_bar_statistic_with_time">stop_bar_statistic_with_time</option>
                                    <option value="stop_bar_statistic_without_time">stop_bar_statistic_without_time</option>
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => {
                                        setShowTriggerLinkModal(false);
                                        setTriggerLink(""); // 清空输入框
                                        setTestPlatform(""); // 重置测试平台
                                        setAppData(""); // 重置应用数据
                                    }}
                                    style={{
                                        padding: "8px 16px",
                                        background: "#6c757d",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleTriggerLinkConfirm}
                                    disabled={!triggerLink.trim() || !testPlatform || !appData}
                                    style={{
                                        padding: "8px 16px",
                                        background: (triggerLink.trim() && testPlatform && appData) ? "#28a745" : "#ccc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: (triggerLink.trim() && testPlatform && appData) ? "pointer" : "not-allowed"
                                    }}
                                >
                                    确认
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ paddingTop: 16 }}>
                    {page === "home" && renderCardGrid(BASEINFO_CONFIGS)}
                    {(page === "x86" || page === "arm") && renderDynamicScenes()}
                    {page === "selftest" && (
                        <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                            {testVersion && baselineVersion && selectedScenes.length > 0 ? (
                                <div>
                                    <h3>自测数据对比</h3>
                                    <p>test版本: {testVersion}</p>
                                    <p>baseline版本: {baselineVersion}</p>
                                    <p>选中的场景: {selectedScenes.join(", ")}</p>
                                    <p>trigger link: {triggerLink || "未设置"}</p>
                                    {/* 这里可以添加数据对比图表 */}
                                </div>
                            ) : (
                                <div>
                                    <h3>自测页面</h3>
                                    <p>请选择test版本、baseline版本和场景开始自测</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}