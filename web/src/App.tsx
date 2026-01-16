import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar, { NavKey, type Platform, type EvalModule } from "./components/Sidebar";
import BaseInfoDrillCard from "./components/BaseInfoDrillCard";
import SceneChartCard from "./components/SceneChartCard";
import StopbarAbsoluteCard from "./components/StopbarAbsoluteCard";
import AdbsoluteCard from "./components/AdAbsoluteCard";
import ScenesPlatformView, { type SceneDataState } from "./components/ScenesPlatformView";
import MultiSelectDropdown from "./components/MultiSelectDropdown";
import type { BaseInfo, ODVersionItem, ODVersionsResponse } from "./api";
import {
    getODVersions,
    getAllScenes,
    getSceneData,
    getMultiVersionSceneData,
    getSceneDataSpSummary,
    getMultiVersionSceneDataSpSummary,
    getSceneDataAdSummary,
    getMultiVersionSceneDataAdSummary,
} from "./api/home";

const BASEINFO_CONFIGS: { key: string; baseinfo: BaseInfo; title: string }[] = [
    { key: "arm_fk", baseinfo: { platform: "arm", data_fix: "_FK_" }, title: "arm _FK" },
    { key: "arm_rw", baseinfo: { platform: "arm", data_fix: "_RW_" }, title: "arm _RW" },
    { key: "arm_re1x", baseinfo: { platform: "arm", data_fix: "_RE1X_" }, title: "arm _RE1X" },
    { key: "x86_fk", baseinfo: { platform: "x86", data_fix: "_FK_" }, title: "x86 _FK" },
    { key: "x86_rw", baseinfo: { platform: "x86", data_fix: "_RW_" }, title: "x86 _RW" },
    { key: "x86_re1x", baseinfo: { platform: "x86", data_fix: "_RE1X_" }, title: "x86 _RE1X" },
];

// 当前前端已实现的评测模块（Sidebar.tsx 里需要同步开启 enabled）
const IMPLEMENTED_EVAL_MODULES = new Set<EvalModule>([
    "stopbar_pr",
    "stopbar_absolute",
    "advance_detection_absolute",
]);

function parsePage(
    page: NavKey
): { kind: "home" } | { kind: "eval"; evalModule: EvalModule; platform: Platform } {
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

    // 每个 eval 页面（evalModule + platform）独立的场景导航选中状态
    const [selectedSceneByPage, setSelectedSceneByPage] = useState<Record<string, string | null>>({});


    const useMultiVersionMode = activeOdVersions.length > 0;

    // 平台页数据
    const [platformScenes, setPlatformScenes] = useState<string[]>([]);
    const [allSceneData, setAllSceneData] = useState<Record<string, any>[]>([]);
    const [scenesData, setScenesData] = useState<SceneDataState[]>([]);
    const [platformLoading, setPlatformLoading] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);

    // 场景列表缓存：避免来回切页重复拉 scenes
    // ⚠️ 场景集合与 evalModule + platform 相关，因此 cacheKey = `${evalModule}:${platform}`
    const scenesCacheRef = useRef<Record<string, string[]>>({});
    const scenesLoadedRef = useRef<Record<string, boolean>>({});

    // 防并发回写
    const requestSeqRef = useRef(0);

    // 用于判断是否切换了 evalModule/platform（避免沿用上一页的 scene 列表/数据）
    const lastEvalKeyRef = useRef<string>("");

    // 当前 eval 页的唯一 key（evalModule + platform）
    const currentEvalKey = useMemo(
        () =>
            pageInfo.kind === "eval"
                ? `${pageInfo.evalModule}:${pageInfo.platform}`
                : "",
        [pageInfo]
    );

    // 当前页面对应的选中 scene（其他页面互不影响）
    const selectedScene = useMemo(
        () =>
            pageInfo.kind === "eval"
                ? selectedSceneByPage[currentEvalKey] ?? null
                : null,
        [pageInfo, currentEvalKey, selectedSceneByPage]
    );

    // 场景点击时，只更新当前页面自己的选中项
    const handleSelectScene = (sceneName: string) => {
        if (pageInfo.kind !== "eval") return;
        const key = `${pageInfo.evalModule}:${pageInfo.platform}`;
        setSelectedSceneByPage((prev) => ({
            ...prev,
            [key]: sceneName,
        }));
    };

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

    // 平台页：stopbar_pr / stopbar_absolute / advance_detection_absolute
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

        // 未实现模块：不请求，给出空数据即可
        if (!IMPLEMENTED_EVAL_MODULES.has(pageInfo.evalModule)) {
            setPlatformLoading(false);
            setPlatformScenes([]);
            setAllSceneData([]);
            setScenesData([]);
            return () => controller.abort();
        }

        const evalModule = pageInfo.evalModule;
        const platform = pageInfo.platform;
        const cacheKey = `${evalModule}:${platform}`;
        const switchedPage = lastEvalKeyRef.current !== cacheKey;
        lastEvalKeyRef.current = cacheKey;

        (async () => {
            try {
                setPlatformLoading(true);

                // 1) scenes：优先缓存（避免切页时“空一下”）
                let sceneNames: string[] = [];
                const cachedLoaded = scenesLoadedRef.current[cacheKey];

                if (cachedLoaded) {
                    sceneNames = scenesCacheRef.current[cacheKey] ?? [];
                    // 切换页：立刻用缓存填充，避免沿用上一页的数据
                    if (switchedPage || platformScenes.length === 0) setPlatformScenes(sceneNames);
                    if ((switchedPage || scenesData.length === 0) && sceneNames.length > 0) {
                        setScenesData(sceneNames.map((s) => ({ scene_name: s, data: [], loading: true })));
                    }
                } else {
                    const resp = await getAllScenes({ platform, eval_module: evalModule });
                    if (controller.signal.aborted || seq !== requestSeqRef.current) return;

                    sceneNames = (resp.rows ?? []).map((r: any) => r.scene_name).filter(Boolean);
                    scenesCacheRef.current[cacheKey] = sceneNames;
                    scenesLoadedRef.current[cacheKey] = true;

                    setPlatformScenes(sceneNames);
                    setScenesData(sceneNames.map((s) => ({ scene_name: s, data: [], loading: true })));
                }

                // 2) data
                const baseinfo = { platform, data_fix: "_FK_" as const };

                const resp =
                    useMultiVersionMode && activeOdVersions.length > 0
                        ? evalModule === "stopbar_absolute"
                            ? await getMultiVersionSceneDataSpSummary({
                                od_versions: activeOdVersions,
                                baseinfo,
                                eval_module: evalModule,
                            })
                            : evalModule === "advance_detection_absolute"
                                ? await getMultiVersionSceneDataAdSummary({
                                    od_versions: activeOdVersions,
                                    baseinfo,
                                    eval_module: evalModule,
                                })
                                : await getMultiVersionSceneData({
                                    od_versions: activeOdVersions,
                                    baseinfo,
                                    eval_module: evalModule,
                                })
                        : evalModule === "stopbar_absolute"
                            ? await getSceneDataSpSummary({
                                od_version: "latest",
                                baseinfo,
                                eval_module: evalModule,
                            })
                            : evalModule === "advance_detection_absolute"
                                ? await getSceneDataAdSummary({
                                    od_version: "latest",
                                    baseinfo,
                                    eval_module: evalModule,
                                })
                                : await getSceneData({
                                    od_version: "latest",
                                    baseinfo,
                                    eval_module: evalModule,
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
                const names = scenesLoadedRef.current[cacheKey]
                    ? scenesCacheRef.current[cacheKey]
                    : platformScenes;

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
    }, [
        pageInfo.kind,
        pageInfo.kind === "eval" ? pageInfo.evalModule : null,
        pageInfo.kind === "eval" ? pageInfo.platform : null,
        reloadNonce,
        useMultiVersionMode,
        activeOdVersions,
    ]);

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
        if (pageInfo.kind === "eval" && IMPLEMENTED_EVAL_MODULES.has(pageInfo.evalModule)) {
            setReloadNonce((x) => x + 1);
            return;
        }
        window.location.reload();
    };

    const headerTitle = useMemo(() => {
        if (pageInfo.kind === "home") return "首页";
        if (!IMPLEMENTED_EVAL_MODULES.has(pageInfo.evalModule)) return "暂未实现";
        const label =
            pageInfo.evalModule === "stopbar_pr"
                ? "stopbar pr"
                : pageInfo.evalModule === "stopbar_absolute"
                    ? "stopbar absolute"
                    : pageInfo.evalModule === "advance_detection_absolute"
                        ? "advance detection absolute"
                        : pageInfo.evalModule;
        return `${label} - ${pageInfo.platform}评测`;
    }, [pageInfo]);

    const headerSubText = useMemo(() => {
        if (pageInfo.kind === "home") return "默认显示OD最近版本的评测结果";
        if (!IMPLEMENTED_EVAL_MODULES.has(pageInfo.evalModule)) return "该模块暂未实现";
        const versions = useMultiVersionMode ? `显示版本: ${activeOdVersions.join(", ")}` : "默认显示最新版本";
        return `${pageInfo.platform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条，${versions}，模块: ${pageInfo.evalModule}`;
    }, [pageInfo, useMultiVersionMode, activeOdVersions, platformScenes.length, allSceneData.length]);

    const renderHome = () => (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {BASEINFO_CONFIGS.map((cfg) => (
                <BaseInfoDrillCard
                    key={cfg.key}
                    title={cfg.title}
                    baseinfo={cfg.baseinfo}
                    selectedOdVersion={selectedOdVersion}
                />
            ))}
        </div>
    );

    const activePlatform = (pageInfo.kind === "eval" ? pageInfo.platform : "arm") as "arm" | "x86";

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
                        {/* 只在已实现的评测模块页显示多选 */}
                        {pageInfo.kind === "eval" && IMPLEMENTED_EVAL_MODULES.has(pageInfo.evalModule) && (
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
                    {pageInfo.kind === "home" && renderHome()}
                    {pageInfo.kind === "eval" && !IMPLEMENTED_EVAL_MODULES.has(pageInfo.evalModule) && (
                        <div style={{ padding: 16, color: "#666" }}>该模块暂未实现</div>
                    )}

                    {pageInfo.kind === "eval" && pageInfo.evalModule === "stopbar_pr" && (
                        <ScenesPlatformView
                            platform={activePlatform}
                            platformLoading={platformLoading}
                            platformScenes={platformScenes}
                            scenesData={scenesData}
                            enableSceneNav
                            selectedScene={selectedScene}
                            onSelectScene={handleSelectScene}
                            keyPrefix={`stopbar_pr:${activePlatform}`}
                            renderItem={(sceneData, idx) => (
                                <SceneChartCard
                                    sceneName={sceneData.scene_name}
                                    platform={activePlatform}
                                    sceneData={sceneData.data}
                                    index={idx}
                                    totalScenes={platformScenes.length}
                                    loading={!!sceneData.loading}
                                    error={sceneData.error}
                                    selectedOdVersion={selectedOdVersion}
                                />
                            )}
                        />
                    )}

                    {pageInfo.kind === "eval" && pageInfo.evalModule === "stopbar_absolute" && (
                        <ScenesPlatformView
                            platform={activePlatform}
                            platformLoading={platformLoading}
                            platformScenes={platformScenes}
                            scenesData={scenesData}
                            enableSceneNav
                            selectedScene={selectedScene}
                            onSelectScene={handleSelectScene}
                            keyPrefix={`stopbar_absolute:${activePlatform}`}
                            renderItem={(sceneData, idx) => (
                                <StopbarAbsoluteCard
                                    sceneName={sceneData.scene_name}
                                    platform={activePlatform}
                                    sceneData={sceneData.data}
                                    index={idx}
                                    totalScenes={platformScenes.length}
                                    loading={!!sceneData.loading}
                                    error={sceneData.error}
                                    selectedOdVersion={selectedOdVersion}
                                />
                            )}
                        />
                    )}

                    {pageInfo.kind === "eval" && pageInfo.evalModule === "advance_detection_absolute" && (
                        <ScenesPlatformView
                            platform={activePlatform}
                            platformLoading={platformLoading}
                            platformScenes={platformScenes}
                            scenesData={scenesData}
                            enableSceneNav
                            selectedScene={selectedScene}
                            onSelectScene={handleSelectScene}
                            keyPrefix={`advance_detection_absolute:${activePlatform}`}
                            renderItem={(sceneData, idx) => (
                                <AdbsoluteCard
                                    sceneName={sceneData.scene_name}
                                    platform={activePlatform}
                                    sceneData={sceneData.data}
                                    index={idx}
                                    totalScenes={platformScenes.length}
                                    loading={!!sceneData.loading}
                                    error={sceneData.error}
                                    selectedOdVersion={selectedOdVersion}
                                />
                            )}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
