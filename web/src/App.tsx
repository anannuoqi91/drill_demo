import React, { useEffect, useMemo, useRef, useState } from "react";
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

type Platform = "arm" | "x86";

export default function App() {
    const [page, setPage] = useState<NavKey>("home");

    // OD versions
    const [odVersions, setOdVersions] = useState<ODVersionItem[]>([]);
    const [selectedOdVersion, setSelectedOdVersion] = useState<string>("");

    // arm/x86 页面数据
    const [currentPlatform, setCurrentPlatform] = useState<Platform | "">("");
    const [platformScenes, setPlatformScenes] = useState<string[]>([]);
    const [allSceneData, setAllSceneData] = useState<Record<string, any>[]>([]);
    const [scenesData, setScenesData] = useState<SceneData[]>([]);

    // 多版本：UI选中（勾选过程不触发请求）
    const [selectedOdVersions, setSelectedOdVersions] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 多版本：实际生效查询（只有 Confirm/Reset/Refresh 才会改变 -> 触发请求）
    const [activeMultiMode, setActiveMultiMode] = useState(false);
    const [activeOdVersions, setActiveOdVersions] = useState<string[]>([]);

    // 触发 arm/x86 数据整体重载
    const [platformReloadNonce, setPlatformReloadNonce] = useState(0);

    // selftest reset
    const [selfTestResetNonce, setSelfTestResetNonce] = useState(0);

    // 场景列表缓存：避免重复请求 getAllScenes
    const scenesCacheRef = useRef<Record<Platform, string[]>>({ arm: [], x86: [] });
    const scenesLoadedRef = useRef<Record<Platform, boolean>>({ arm: false, x86: false });

    // 防并发回写
    const requestSeqRef = useRef(0);

    const isPlatformPage = page === "arm" || page === "x86";
    const platform: Platform | null = isPlatformPage ? (page as Platform) : null;

    // selftest 开关保护
    useEffect(() => {
        if (!ENABLE_SELFTEST && page === "selftest") {
            setPage("home");
        }
    }, [page]);

    // 只加载一次 OD versions
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const response: ODVersionsResponse = await getODVersions();
                if (cancelled) return;
                setOdVersions(response.rows);
                if (response.rows.length > 0) {
                    setSelectedOdVersion(response.rows[0].od_version_minute);
                }
            } catch (e) {
                console.error("加载OD版本列表失败:", e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // ========== 核心重构：arm/x86 只用一个 useEffect，串行完成 scenes + data ==========
    useEffect(() => {
        if (!platform) {
            // 离开 arm/x86 页时清空（selftest 不依赖这些）
            setCurrentPlatform("");
            setPlatformScenes([]);
            setAllSceneData([]);
            setScenesData([]);
            return;
        }

        setCurrentPlatform(platform);

        const seq = ++requestSeqRef.current;
        const controller = new AbortController();

        const run = async () => {
            try {
                // 1) scenes：优先走缓存
                let sceneNames: string[] = [];
                const cached = scenesLoadedRef.current[platform];
                if (cached) {
                    sceneNames = scenesCacheRef.current[platform];
                } else {
                    const resp = await getAllScenes({ platform });
                    if (controller.signal.aborted) return;
                    sceneNames = (resp.rows ?? []).map((r: any) => r.scene_name).filter(Boolean);
                    scenesCacheRef.current[platform] = sceneNames;
                    scenesLoadedRef.current[platform] = true;
                }

                // 如果这次请求已经过期，直接退出
                if (controller.signal.aborted || seq !== requestSeqRef.current) return;

                setPlatformScenes(sceneNames);

                // 2) 先把每个场景置为 loading（用户体验）
                setScenesData(
                    sceneNames.map((name) => ({
                        scene_name: name,
                        data: [],
                        loading: true,
                    }))
                );

                // 3) data：按 activeQuery 决定用哪个 API
                const resp =
                    activeMultiMode && activeOdVersions.length > 0
                        ? await getMultiVersionSceneData({
                            od_versions: activeOdVersions,
                            baseinfo: { platform, data_fix: "_FK_" },
                        })
                        : await getSceneData({
                            od_version: "latest",
                            baseinfo: { platform, data_fix: "_FK_" },
                        });

                if (controller.signal.aborted || seq !== requestSeqRef.current) return;

                const rows = resp.rows ?? [];
                setAllSceneData(rows);

                // 4) 高效分组（避免 N 个场景 * filter 全量 rows）
                const byScene = new Map<string, Record<string, any>[]>();
                for (const r of rows) {
                    const name = r?.scene_name;
                    if (!name) continue;
                    const arr = byScene.get(name);
                    if (arr) arr.push(r);
                    else byScene.set(name, [r]);
                }

                const merged: SceneData[] = sceneNames.map((name) => ({
                    scene_name: name,
                    data: byScene.get(name) ?? [],
                    loading: false,
                }));

                setScenesData(merged);
            } catch (e: any) {
                if (controller.signal.aborted || seq !== requestSeqRef.current) return;

                console.error(`加载${platform}数据失败:`, e);

                const sceneNames =
                    scenesLoadedRef.current[platform] ? scenesCacheRef.current[platform] : [];

                setPlatformScenes(sceneNames);
                setAllSceneData([]);
                setScenesData(
                    sceneNames.map((name) => ({
                        scene_name: name,
                        data: [],
                        loading: false,
                        error: `加载失败: ${String(e)}`,
                    }))
                );
            }
        };

        run();

        return () => {
            controller.abort();
        };
    }, [platform, platformReloadNonce, activeMultiMode, activeOdVersions]);

    // Confirm：让当前勾选的版本变成“生效查询”，并触发 reload
    const handleMultiVersionConfirm = () => {
        if (selectedOdVersions.length === 0) return;
        setActiveMultiMode(true);
        setActiveOdVersions([...selectedOdVersions]);
        setPlatformReloadNonce((x) => x + 1);
    };

    // Reset：退出多版本模式并触发 reload
    const resetMultiVersionMode = () => {
        setActiveMultiMode(false);
        setActiveOdVersions([]);
        setSelectedOdVersions([]);
        setIsDropdownOpen(false);
        setPlatformReloadNonce((x) => x + 1);
    };

    // 顶栏刷新
    const handleRefresh = () => {
        if (page === "arm" || page === "x86") {
            setPlatformReloadNonce((x) => x + 1);
        } else if (page === "selftest") {
            setSelfTestResetNonce((x) => x + 1);
        } else {
            window.location.reload();
        }
    };

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

    const renderDynamicScenes = () => {
        if (!platform) return null;

        if (platformScenes.length === 0 && scenesData.length === 0) {
            return <div style={{ padding: 16, textAlign: "center" }}>正在加载场景数据...</div>;
        }

        return (
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {scenesData.map((sceneData, index) => (
                    <SceneChartCard
                        key={`${platform}:${sceneData.scene_name}`}
                        sceneName={sceneData.scene_name}
                        platform={platform}
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

    const headerSubtext = useMemo(() => {
        if ((page === "arm" || page === "x86") && platformScenes.length > 0) {
            const modeText =
                activeMultiMode && activeOdVersions.length > 0
                    ? `，显示版本: ${activeOdVersions.join(", ")}`
                    : "，默认显示最新版本";

            return `${currentPlatform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条${modeText}`;
        }
        if (page === "selftest") return "自测数据对比分析";
        return "默认显示OD最近版本的评测结果";
    }, [page, platformScenes.length, activeMultiMode, activeOdVersions, currentPlatform, allSceneData.length]);

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
                            {page === "home"
                                ? "首页"
                                : page === "arm"
                                    ? "arm评测"
                                    : page === "x86"
                                        ? "x86评测"
                                        : page === "selftest"
                                            ? "自测"
                                            : ""}
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
                                onReset={activeMultiMode ? resetMultiVersionMode : undefined}
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
