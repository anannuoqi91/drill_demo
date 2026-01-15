import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar, { NavKey, type Platform, type EvalModule } from "./components/Sidebar";
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

interface SceneDataState {
    scene_name: string;
    data: Record<string, any>[];
    loading: boolean;
    error?: string;
}

function parsePage(page: NavKey): { kind: "home" } | { kind: "eval"; evalModule: EvalModule; platform: Platform } {
    if (page === "home") return { kind: "home" };

    // 兼容旧链接：arm/x86 -> stopbar_pr:*
    if (page === "arm") return { kind: "eval", evalModule: "stopbar_pr", platform: "arm" };
    if (page === "x86") return { kind: "eval", evalModule: "stopbar_pr", platform: "x86" };

    const [m, p] = page.split(":");
    return { kind: "eval", evalModule: m as EvalModule, platform: p as Platform };
}

export default function App() {
    const [page, setPage] = useState<NavKey>("home");
    const pageInfo = useMemo(() => parsePage(page), [page]);

    // OD versions
    const [odVersions, setOdVersions] = useState<ODVersionItem[]>([]);
    const [selectedOdVersion, setSelectedOdVersion] = useState<string>("");

    // 平台页：多选版本（pending -> confirm -> active）
    const [pendingOdVersions, setPendingOdVersions] = useState<string[]>([]);
    const [activeOdVersions, setActiveOdVersions] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const useMultiVersionMode = activeOdVersions.length > 0;

    // 平台页数据
    const [platformScenes, setPlatformScenes] = useState<string[]>([]);
    const [allSceneData, setAllSceneData] = useState<Record<string, any>[]>([]);
    const [scenesData, setScenesData] = useState<SceneDataState[]>([]);
    const [platformLoading, setPlatformLoading] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);

    // 场景列表缓存：避免来回切页重复拉 scenes
    const scenesCacheRef = useRef<Record<Platform, string[]>>({ arm: [], x86: [] });
    const scenesLoadedRef = useRef<Record<Platform, boolean>>({ arm: false, x86: false });

    // 防并发回写
    const requestSeqRef = useRef(0);

    // 加载 OD versions（一次）
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const response: ODVersionsResponse = await getODVersions();
                if (cancelled) return;
                setOdVersions(response.rows);
                if (response.rows.length > 0) setSelectedOdVersion(response.rows[0].od_version_minute);
            } catch (e) {
                console.error("加载OD版本列表失败:", e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 平台页：仅 stopbar_pr 实现；且避免闪屏（不清空列表，只做 loading 覆盖）
    useEffect(() => {
        const seq = ++requestSeqRef.current;
        const controller = new AbortController();

        // home：清空平台态
        if (pageInfo.kind !== "eval") {
            setPlatformLoading(false);
            setPlatformScenes([]);
            setAllSceneData([]);
            setScenesData([]);
            return () => controller.abort();
        }

        // ✅ 仅实现 stopbar_pr
        if (pageInfo.evalModule !== "stopbar_pr") {
            setPlatformLoading(false);
            // 不请求，给出空数据即可
            setPlatformScenes([]);
            setAllSceneData([]);
            setScenesData([]);
            return () => controller.abort();
        }

        const platform = pageInfo.platform;

        (async () => {
            try {
                setPlatformLoading(true);

                // 1) scenes：优先缓存（避免切页时“空一下”）
                let sceneNames: string[] = [];
                const cachedLoaded = scenesLoadedRef.current[platform];

                if (cachedLoaded) {
                    sceneNames = scenesCacheRef.current[platform];
                    // 如果当前 state 为空，用缓存立即填充，避免闪屏
                    if (platformScenes.length === 0) setPlatformScenes(sceneNames);
                    if (scenesData.length === 0 && sceneNames.length > 0) {
                        setScenesData(sceneNames.map((s) => ({ scene_name: s, data: [], loading: true })));
                    }
                } else {
                    const resp = await getAllScenes({ platform });
                    if (controller.signal.aborted || seq !== requestSeqRef.current) return;

                    sceneNames = (resp.rows ?? []).map((r: any) => r.scene_name).filter(Boolean);
                    scenesCacheRef.current[platform] = sceneNames;
                    scenesLoadedRef.current[platform] = true;

                    setPlatformScenes(sceneNames);
                    setScenesData(sceneNames.map((s) => ({ scene_name: s, data: [], loading: true })));
                }

                // 2) data
                const resp =
                    useMultiVersionMode && activeOdVersions.length > 0
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

                // 分组
                const byScene = new Map<string, Record<string, any>[]>();
                for (const r of rows) {
                    const name = r?.scene_name;
                    if (!name) continue;
                    const arr = byScene.get(name);
                    if (arr) arr.push(r);
                    else byScene.set(name, [r]);
                }

                const merged: SceneDataState[] = sceneNames.map((name) => ({
                    scene_name: name,
                    data: byScene.get(name) ?? [],
                    loading: false,
                }));

                setScenesData(merged);
            } catch (e: any) {
                if (controller.signal.aborted || seq !== requestSeqRef.current) return;

                console.error("加载平台页数据失败:", e);
                const msg = e instanceof Error ? e.message : String(e);

                // 保留 scenes 列表（如果有），只标记 error，避免闪屏
                const names =
                    scenesLoadedRef.current[platform] ? scenesCacheRef.current[platform] : platformScenes;

                setAllSceneData([]);
                setScenesData(
                    (names ?? []).map((name) => ({
                        scene_name: name,
                        data: [],
                        loading: false,
                        error: `加载失败: ${msg}`,
                    }))
                );
            } finally {
                if (!controller.signal.aborted && seq === requestSeqRef.current) {
                    setPlatformLoading(false);
                }
            }
        })();

        return () => controller.abort();
        // 注意：platformScenes/scenesData 不要放依赖里，否则会重复触发
    }, [pageInfo.kind, pageInfo.kind === "eval" ? pageInfo.evalModule : null, pageInfo.kind === "eval" ? pageInfo.platform : null, reloadNonce, useMultiVersionMode, activeOdVersions]);

    // Confirm/Reset
    const handleMultiVersionConfirm = () => {
        if (pendingOdVersions.length === 0) return;
        setActiveOdVersions([...pendingOdVersions]);
        setIsDropdownOpen(false);
        setReloadNonce((x) => x + 1);
    };

    const resetMultiVersionMode = () => {
        setActiveOdVersions([]);
        setPendingOdVersions([]);
        setIsDropdownOpen(false);
        setReloadNonce((x) => x + 1);
    };

    const handleRefresh = () => {
        if (pageInfo.kind === "eval" && pageInfo.evalModule === "stopbar_pr") {
            setReloadNonce((x) => x + 1);
            return;
        }
        window.location.reload();
    };

    const headerTitle = useMemo(() => {
        if (pageInfo.kind === "home") return "首页";
        if (pageInfo.evalModule !== "stopbar_pr") return "暂未实现";
        return `stopbar pr - ${pageInfo.platform}评测`;
    }, [pageInfo]);

    const headerSubText = useMemo(() => {
        if (pageInfo.kind === "home") return "默认显示OD最近版本的评测结果";
        if (pageInfo.evalModule !== "stopbar_pr") return "该模块暂未实现";
        const versions = useMultiVersionMode ? `显示版本: ${activeOdVersions.join(", ")}` : "默认显示最新版本";
        return `${pageInfo.platform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条，${versions}`;
    }, [pageInfo, useMultiVersionMode, activeOdVersions, platformScenes.length, allSceneData.length]);

    const renderHome = () => (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {BASEINFO_CONFIGS.map((cfg) => (
                <BaseInfoDrillCard key={cfg.key} title={cfg.title} baseinfo={cfg.baseinfo} selectedOdVersion={selectedOdVersion} />
            ))}
        </div>
    );

    const renderStopbarPlatform = () => {
        // 这里用 platformLoading + 保留旧数据，避免闪屏
        if (platformScenes.length === 0 && scenesData.length === 0) {
            return (
                <div style={{ padding: 16, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
                    {platformLoading ? "正在加载场景..." : "暂无场景数据"}
                </div>
            );
        }

        return (
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {scenesData.map((sceneData, idx) => (
                    <SceneChartCard
                        key={`${pageInfo.kind === "eval" ? pageInfo.platform : "na"}:${sceneData.scene_name}`}
                        sceneName={sceneData.scene_name}
                        platform={(pageInfo.kind === "eval" ? pageInfo.platform : "arm") as "arm" | "x86"}
                        sceneData={sceneData.data}
                        index={idx}
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
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{headerTitle}</div>
                        <div style={{ color: "#666", marginTop: 4, fontSize: 12 }}>{headerSubText}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* 只在 stopbar pr 平台页显示多选 */}
                        {pageInfo.kind === "eval" && pageInfo.evalModule === "stopbar_pr" && (
                            <MultiSelectDropdown
                                label="OD版本:"
                                items={odVersions.map((it) => ({ value: it.od_version_minute }))}
                                selected={pendingOdVersions}
                                onChange={setPendingOdVersions}
                                open={isDropdownOpen}
                                setOpen={setIsDropdownOpen}
                                onConfirm={handleMultiVersionConfirm}
                                onReset={useMultiVersionMode ? resetMultiVersionMode : undefined}
                                width={240}
                            />
                        )}

                        {/* 首页单选 */}
                        {pageInfo.kind === "home" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500 }}>OD版本:</label>
                                <select
                                    value={selectedOdVersion}
                                    onChange={(e) => setSelectedOdVersion(e.target.value)}
                                    style={{ padding: "6px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", minWidth: "200px" }}
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
                    {pageInfo.kind === "home" && renderHome()}
                    {pageInfo.kind === "eval" && pageInfo.evalModule !== "stopbar_pr" && (
                        <div style={{ padding: 16, color: "#666" }}>该模块暂未实现</div>
                    )}
                    {pageInfo.kind === "eval" && pageInfo.evalModule === "stopbar_pr" && renderStopbarPlatform()}
                </div>
            </div>
        </div>
    );
}
