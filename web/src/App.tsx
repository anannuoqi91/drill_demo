import React, { useEffect, useState } from "react";
import Sidebar, { NavKey } from "./components/Sidebar";
import BaseInfoDrillCard from "./components/BaseInfoDrillCard";
import SceneChartCard from "./components/SceneChartCard";
import MultiSelectDropdown from "./components/MultiSelectDropdown";
import SelfTestPanel from "./components/selftest/SelfTestPanel";

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

const ENABLE_SELFTEST = false;

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

    // 多选OD版本
    const [selectedOdVersions, setSelectedOdVersions] = useState<string[]>([]);
    const [useMultiVersionMode, setUseMultiVersionMode] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // selftest：用于触发子组件 reset
    const [selfTestResetNonce, setSelfTestResetNonce] = useState(0);

    useEffect(() => {
        if (!ENABLE_SELFTEST && page === "selftest") {
            setPage("home");
        }
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

    // 多版本确定
    const handleMultiVersionConfirm = () => {
        if (selectedOdVersions.length > 0) {
            setUseMultiVersionMode(true);

            // 设置 loading
            const loadingScenesData = platformScenes.map((sceneName) => ({
                scene_name: sceneName,
                data: [],
                loading: true,
            }));
            setScenesData(loadingScenesData);

            setRefreshTrigger((prev) => prev + 1);
        }
    };

    const resetMultiVersionMode = () => {
        setUseMultiVersionMode(false);
        setSelectedOdVersions([]);
        setIsDropdownOpen(false);

        const loadingScenesData = platformScenes.map((sceneName) => ({
            scene_name: sceneName,
            data: [],
            loading: true,
        }));
        setScenesData(loadingScenesData);

        setRefreshTrigger((prev) => prev + 1);
    };

    // 加载平台场景列表（arm/x86 页）
    useEffect(() => {
        const loadPlatformScenes = async () => {
            if (page === "arm" || page === "x86") {
                const platform = page;
                setCurrentPlatform(platform);

                try {
                    const response = await getAllScenes({ platform });
                    const sceneNames = response.rows.map((row: any) => row.scene_name).filter(Boolean);
                    setPlatformScenes(sceneNames);

                    const initialScenesData: SceneData[] = sceneNames.map((sceneName: string) => ({
                        scene_name: sceneName,
                        data: [],
                        loading: true,
                    }));
                    setScenesData(initialScenesData);
                } catch (error) {
                    console.error(`加载${platform}场景列表失败:`, error);
                    setPlatformScenes([]);
                    setScenesData([]);
                }
            } else {
                // 注意：selftest 页不依赖 platformScenes 了，可以继续清空
                setPlatformScenes([]);
                setCurrentPlatform("");
                setScenesData([]);
                setAllSceneData([]);
            }
        };

        loadPlatformScenes();
    }, [page, refreshTrigger]);

    // 加载所有场景数据（arm/x86 页）
    useEffect(() => {
        const loadAllSceneData = async () => {
            if ((page === "arm" || page === "x86") && platformScenes.length > 0) {
                const platform = page;

                try {
                    if (useMultiVersionMode && selectedOdVersions.length > 0) {
                        const response = await getMultiVersionSceneData({
                            od_versions: selectedOdVersions,
                            baseinfo: { platform, data_fix: "_FK_" },
                        });

                        setAllSceneData(response.rows);

                        const filteredScenesData = platformScenes.map((sceneName) => {
                            const sceneData = response.rows.filter((row: any) => row.scene_name === sceneName);
                            return { scene_name: sceneName, data: sceneData, loading: false };
                        });

                        setScenesData(filteredScenesData);
                    } else {
                        const response = await getSceneData({
                            od_version: "latest",
                            baseinfo: { platform, data_fix: "_FK_" },
                        });

                        setAllSceneData(response.rows);

                        const filteredScenesData = platformScenes.map((sceneName) => {
                            const sceneData = response.rows.filter((row: any) => row.scene_name === sceneName);
                            return { scene_name: sceneName, data: sceneData, loading: false };
                        });

                        setScenesData(filteredScenesData);
                    }
                } catch (error) {
                    console.error(`加载场景数据失败:`, error);
                    const errorScenesData = platformScenes.map((sceneName) => ({
                        scene_name: sceneName,
                        data: [],
                        loading: false,
                        error: `加载失败: ${error}`,
                    }));
                    setScenesData(errorScenesData);
                }
            }
        };

        loadAllSceneData();
    }, [page, platformScenes, selectedOdVersion, refreshTrigger, useMultiVersionMode, selectedOdVersions]);

    // 刷新按钮
    const handleRefresh = () => {
        if (page === "arm" || page === "x86") {
            const loadingScenesData = platformScenes.map((sceneName) => ({
                scene_name: sceneName,
                data: [],
                loading: true,
            }));
            setScenesData(loadingScenesData);
            setRefreshTrigger((prev) => prev + 1);
        } else if (page === "selftest") {
            setSelfTestResetNonce((x) => x + 1);
        } else {
            window.location.reload();
        }
    };

    const renderCardGrid = (configs: typeof BASEINFO_CONFIGS) => (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {configs.map((cfg) => (
                <BaseInfoDrillCard key={cfg.key} title={cfg.title} baseinfo={cfg.baseinfo} selectedOdVersion={selectedOdVersion} />
            ))}
        </div>
    );

    const renderDynamicScenes = () => {
        if (platformScenes.length === 0 && (page === "arm" || page === "x86")) {
            return <div style={{ padding: 16, textAlign: "center" }}>正在加载场景数据...</div>;
        }
        if (platformScenes.length === 0) return null;

        return (
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {scenesData.map((sceneData, index) => (
                    <SceneChartCard
                        key={`${currentPlatform}:${sceneData.scene_name}`}
                        sceneName={sceneData.scene_name}
                        platform={currentPlatform as "arm" | "x86"}
                        sceneData={sceneData.data}
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

    const headerSubtext =
        (page === "arm" || page === "x86") && platformScenes.length > 0
            ? `${currentPlatform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条${useMultiVersionMode && selectedOdVersions.length > 0 ? `，显示版本: ${selectedOdVersions.join(", ")}` : "，默认显示最新版本"
            }`
            : page === "selftest"
                ? "自测数据对比分析"
                : "默认显示OD最近版本的评测结果";

    return (
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, Arial" }}>
            <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
                <Sidebar active={page} onSelect={setPage} />
            </div>

            <div style={{ flex: 1, background: "#fafafa" }}>
                {/* 顶栏 */}
                <div
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2000,
                        padding: 16,
                        borderBottom: "1px solid #eee",
                        background: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                            {page === "home" ? "首页" : page === "arm" ? "arm评测" : page === "x86" ? "x86评测" : page === "selftest" ? "自测" : ""}
                        </div>
                        <div style={{ color: "#666", marginTop: 4, fontSize: 12 }}>{headerSubtext}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* arm/x86 多选OD版本 */}
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

                        {/* home 单选OD版本 */}
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
                                        minWidth: "200px",
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
                                fontWeight: "500",
                            }}
                        >
                            刷新
                        </button>
                    </div>
                </div>

                {/* 内容区 */}
                <div style={{ paddingTop: 16 }}>
                    {page === "home" && renderCardGrid(BASEINFO_CONFIGS)}
                    {(page === "x86" || page === "arm") && renderDynamicScenes()}

                    {page === "selftest" && (
                        <div style={{ padding: 16 }}>
                            <SelfTestPanel odVersions={odVersions} resetNonce={selfTestResetNonce} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
