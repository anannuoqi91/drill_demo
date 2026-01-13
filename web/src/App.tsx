import React, { useEffect, useState } from "react";
import Sidebar, { NavKey } from "./components/Sidebar";
import BaseInfoDrillCard from "./components/BaseInfoDrillCard";
import SceneChartCard from "./components/SceneChartCard";
import type { BaseInfo, ODVersionItem, ODVersionsResponse } from "./api";
import { getODVersions, getAllScenes, getSceneData } from "./api/home";

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
                    // 调用一次getSceneData获取所有场景的数据
                    const response = await getSceneData({
                        od_version: "latest",
                        baseinfo: { platform: platform, data_fix: "_FK_" } // 使用默认的data_fix
                    });

                    setAllSceneData(response.rows);

                    // 前端根据场景名称筛选和分配数据
                    const filteredScenesData = platformScenes.map(sceneName => {
                        // 从所有数据中筛选出属于当前场景的数据
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
                } catch (error) {
                    console.error(`加载场景数据失败:`, error);
                    // 设置错误状态
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
    }, [page, platformScenes, selectedOdVersion, refreshTrigger]);

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
                    zIndex: 100,
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
                                ? `${currentPlatform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条`
                                : "默认显示OD最近版本的评测结果"}
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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

                <div style={{ paddingTop: 16 }}>
                    {page === "home" && renderCardGrid(BASEINFO_CONFIGS)}
                    {(page === "x86" || page === "arm") && renderDynamicScenes()}
                </div>
            </div>
        </div>
    );
}