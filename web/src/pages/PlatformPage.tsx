import React, { useMemo, useState } from "react";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import SceneChartCard from "../components/SceneChartCard";
import PageHeader from "../layout/PageHeader";
import type { ODVersionItem } from "../api";
import type { Platform } from "../types/eval";
import { usePlatformEval } from "../hooks/usePlatformEval";

export default function PlatformPage(props: { platform: Platform; odVersions: ODVersionItem[] }) {
    const { platform, odVersions } = props;

    const [selectedOdVersions, setSelectedOdVersions] = useState<string[]>([]);
    const [useMultiVersionMode, setUseMultiVersionMode] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [refreshNonce, setRefreshNonce] = useState(0);

    const { platformScenes, scenesData, allSceneData, summaryText } = usePlatformEval({
        platform,
        useMultiVersionMode,
        selectedOdVersions,
        refreshNonce,
    });

    const handleRefresh = () => {
        // 保持你原来的体验：刷新只影响当前页
        setScenesDataLoadingLike(platformScenes, setRefreshNonce);
    };

    function setScenesDataLoadingLike(_scenes: string[], bump: (fn: (x: number) => number) => void) {
        bump((x) => x + 1);
    }

    const handleMultiVersionConfirm = () => {
        if (selectedOdVersions.length > 0) {
            setUseMultiVersionMode(true);
            setRefreshNonce((x) => x + 1);
        }
    };

    const resetMultiVersionMode = () => {
        setUseMultiVersionMode(false);
        setSelectedOdVersions([]);
        setIsDropdownOpen(false);
        setRefreshNonce((x) => x + 1);
    };

    const headerRight = useMemo(() => {
        return (
            <>
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
            </>
        );
    }, [odVersions, selectedOdVersions, isDropdownOpen, useMultiVersionMode]);

    return (
        <>
            <PageHeader
                title={platform === "arm" ? "arm评测" : "x86评测"}
                subtitle={summaryText}
                right={headerRight}
            />

            <div
                style={{
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 16,
                }}
            >
                {scenesData.map((scene, index) => (
                    <SceneChartCard
                        key={`${platform}:${scene.scene_name}`} // 建议加平台避免复用状态
                        sceneName={scene.scene_name}
                        platform={platform}
                        sceneData={scene.data}
                        index={index}
                        totalScenes={platformScenes.length}
                        loading={scene.loading}
                        error={scene.error}
                    />
                ))}
            </div>
        </>
    );
}
