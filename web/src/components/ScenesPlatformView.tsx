import React from "react";
import type { Platform } from "./Sidebar";

export interface SceneDataState {
    scene_name: string;
    data: Record<string, any>[];
    loading?: boolean;
    error?: string;
}

export default function ScenesPlatformView(props: {
    platform: Platform;
    platformLoading: boolean;
    platformScenes: string[];
    scenesData: SceneDataState[];
    /** 是否显示“场景导航”粘性导航条（用于快速跳转） */
    enableSceneNav?: boolean;
    /** 当前高亮的场景（由外部 state 控制） */
    selectedScene?: string | null;
    /** 点击场景导航条时回调（由外部 state 控制） */
    onSelectScene?: (sceneName: string) => void;
    /** 顶栏 sticky 的高度（用于滚动定位与 nav 的 top），默认 80 */
    headerStickyHeight?: number;
    /** 场景导航条高度（用于滚动定位），默认 60 */
    sceneNavHeight?: number;
    /** list item 的 key 前缀（避免不同模块/平台复用导致的 key 冲突） */
    keyPrefix?: string;
    /** 渲染每个 scene 的内容卡片 */
    renderItem: (sceneData: SceneDataState, index: number) => React.ReactNode;
}) {
    const {
        platform,
        platformLoading,
        platformScenes,
        scenesData,
        enableSceneNav,
        selectedScene,
        onSelectScene,
        headerStickyHeight = 80,
        sceneNavHeight = 60,
        keyPrefix = "",
        renderItem,
    } = props;

    // 空态（同时兼容“加载中”）
    if (platformScenes.length === 0 && scenesData.length === 0) {
        return (
            <div
                style={{
                    padding: 16,
                    minHeight: 240,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                }}
            >
                {platformLoading ? "正在加载场景..." : "暂无场景数据"}
            </div>
        );
    }
    scenesData.sort((a, b) => a.scene_name.localeCompare(b.scene_name));

    const totalOffset = headerStickyHeight + (enableSceneNav ? sceneNavHeight : 0);

    const handleSceneLinkClick = (sceneName: string) => {
        onSelectScene?.(sceneName);
        const element = document.getElementById(`scene-${sceneName}`);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - totalOffset,
                behavior: "smooth",
            });
        }
    };

    const navBtnStyle = (active: boolean): React.CSSProperties => ({
        padding: "4px 12px",
        background: active ? "#007bff" : "transparent",
        border: "1px solid #007bff",
        borderRadius: 16,
        color: active ? "white" : "#007bff",
        fontSize: 12,
        cursor: "pointer",
        transition: "all 0.2s",
        fontWeight: active ? "600" : "normal",
    });

    return (
        <>
            {/* 场景导航栏 */}
            {enableSceneNav && (
                <div
                    style={{
                        position: "sticky",
                        top: headerStickyHeight,
                        zIndex: 1000,
                        background: "#f8f9fa",
                        padding: "12px 16px",
                        borderBottom: "1px solid #e9ecef",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                    }}
                >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#495057", marginRight: 8 }}>
                        场景导航:
                    </span>

                    {scenesData.map((scene) => {
                        const active = selectedScene === scene.scene_name;
                        return (
                            <button
                                key={`nav:${keyPrefix}:${platform}:${scene.scene_name}`}
                                onClick={() => handleSceneLinkClick(scene.scene_name)}
                                style={navBtnStyle(active)}
                                onMouseEnter={(e) => {
                                    if (selectedScene !== scene.scene_name) {
                                        e.currentTarget.style.background = "#007bff";
                                        e.currentTarget.style.color = "white";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedScene !== scene.scene_name) {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#007bff";
                                    }
                                }}
                            >
                                {scene.scene_name}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 场景图表区域 */}
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {scenesData.map((sceneData, idx) => (
                    <div
                        key={`${keyPrefix}:${platform}:${sceneData.scene_name}`}
                        id={`scene-${sceneData.scene_name}`}
                    >
                        {renderItem(sceneData, idx)}
                    </div>
                ))}
            </div>
        </>
    );
}
