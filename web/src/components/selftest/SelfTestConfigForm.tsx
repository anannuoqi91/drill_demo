import React from "react";
import type { ODVersionItem } from "../../api";
import SceneMultiSelectDropdown from "./SceneMultiSelectDropdown";

export default function SelfTestConfigForm(props: {
    odVersions: ODVersionItem[];

    platform: "" | "arm" | "x86";
    onPlatformChange: (p: "" | "arm" | "x86") => void;

    testVersion: string;
    onTestVersionChange: (v: string) => void;

    baselineVersion: string;
    onBaselineVersionChange: (v: string) => void;

    scenes: string[];
    selectedScenes: string[];
    onSelectedScenesChange: (v: string[]) => void;

    sceneDropdownOpen: boolean;
    setSceneDropdownOpen: (v: boolean) => void;

    onClickImport: () => void;
}) {
    const {
        odVersions,
        platform,
        onPlatformChange,
        testVersion,
        onTestVersionChange,
        baselineVersion,
        onBaselineVersionChange,
        scenes,
        selectedScenes,
        onSelectedScenesChange,
        sceneDropdownOpen,
        setSceneDropdownOpen,
        onClickImport,
    } = props;

    return (
        <div
            style={{
                padding: 16,
                background: "white",
                borderBottom: "1px solid #eee",
                marginBottom: 16,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    alignItems: "end",
                }}
            >
                {/* 数据导入 */}
                <div>
                    <button
                        onClick={onClickImport}
                        style={{
                            padding: "8px 16px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            width: "100%",
                        }}
                    >
                        数据导入
                    </button>
                </div>

                {/* 平台选择（关键：自测页用它来拉 scenes 列表） */}
                <div>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        平台:
                    </label>
                    <select
                        value={platform}
                        onChange={(e) => onPlatformChange(e.target.value as any)}
                        style={{
                            padding: "6px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 14,
                            width: "100%",
                            background: "white",
                        }}
                    >
                        <option value="">请选择平台</option>
                        <option value="arm">arm</option>
                        <option value="x86">x86</option>
                    </select>
                </div>

                {/* test版本 */}
                <div>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        test版本:
                    </label>
                    <select
                        value={testVersion}
                        onChange={(e) => onTestVersionChange(e.target.value)}
                        style={{
                            padding: "6px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 14,
                            width: "100%",
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

                {/* baseline版本 */}
                <div>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        baseline版本:
                    </label>
                    <select
                        value={baselineVersion}
                        onChange={(e) => onBaselineVersionChange(e.target.value)}
                        style={{
                            padding: "6px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 14,
                            width: "100%",
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

                {/* scene多选 */}
                <SceneMultiSelectDropdown
                    label="scene选择:"
                    scenes={scenes}
                    selected={selectedScenes}
                    onChange={onSelectedScenesChange}
                    open={sceneDropdownOpen}
                    setOpen={setSceneDropdownOpen}
                    placeholder="选择场景"
                />
            </div>
        </div>
    );
}
