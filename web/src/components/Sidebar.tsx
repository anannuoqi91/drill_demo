import React, { useMemo, useState } from "react";

export type Platform = "arm" | "x86";
export type EvalModule =
    | "stopbar_pr"
    | "advance_detection_pr"
    | "stopbar_absolute"
    | "advance_detection_absolute"
    | "perception_pr";

// 兼容旧 key（arm/x86）+ 新 key（module:platform）
export type NavKey = "home" | "arm" | "x86" | `${EvalModule}:${Platform}`;

const MODULES: { module: EvalModule; label: string; enabled: boolean }[] = [
    { module: "stopbar_pr", label: "stopbar pr", enabled: true },
    { module: "advance_detection_pr", label: "advance detection pr", enabled: false },
    { module: "stopbar_absolute", label: "stopbar absolute", enabled: false },
    { module: "advance_detection_absolute", label: "advance detection absolute", enabled: false },
    { module: "perception_pr", label: "perception pr", enabled: false },
];

function toKey(module: EvalModule, platform: Platform): NavKey {
    return `${module}:${platform}` as const;
}

// 用于高亮：旧 arm/x86 也当成 stopbar_pr:* 来高亮
function normalizeActiveKey(active: NavKey): NavKey {
    if (active === "arm") return "stopbar_pr:arm";
    if (active === "x86") return "stopbar_pr:x86";
    return active;
}

export default function Sidebar(props: { active: NavKey; onSelect: (k: NavKey) => void }) {
    const { active, onSelect } = props;

    const activeNormalized = useMemo(() => normalizeActiveKey(active), [active]);

    const [open, setOpen] = useState<Record<EvalModule, boolean>>({
        stopbar_pr: true,
        advance_detection_pr: false,
        stopbar_absolute: false,
        advance_detection_absolute: false,
        perception_pr: false,
    });

    const itemStyle = (selected: boolean, disabled = false): React.CSSProperties => ({
        width: "100%",
        padding: "10px 12px",
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        background: selected ? "#eaf2ff" : "transparent",
        color: disabled ? "#aaa" : selected ? "#1677ff" : "#333",
        fontWeight: selected ? 700 : 500,
        opacity: disabled ? 0.75 : 1,
    });

    const subItemStyle = (selected: boolean, disabled = false): React.CSSProperties => ({
        width: "100%",
        padding: "8px 12px",
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        background: selected ? "#eaf2ff" : "transparent",
        color: disabled ? "#aaa" : selected ? "#1677ff" : "#444",
        fontWeight: selected ? 700 : 500,
        fontSize: 13,
        opacity: disabled ? 0.75 : 1,
    });

    return (
        <div style={{ width: 240, padding: 12, background: "white", borderRight: "1px solid #eee" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Navigation</div>

            {/* 首页 */}
            <button style={itemStyle(activeNormalized === "home")} onClick={() => onSelect("home")}>
                首页
            </button>

            <div style={{ height: 12 }} />

            {/* 二级导航：模块 -> 平台 */}
            {MODULES.map((g) => {
                const groupOpen = open[g.module];
                const isGroupSelected =
                    typeof activeNormalized === "string" && activeNormalized.startsWith(`${g.module}:`);

                return (
                    <div key={g.module} style={{ marginBottom: 8 }}>
                        {/* 一级：模块 */}
                        <button
                            style={{
                                ...itemStyle(isGroupSelected, !g.enabled),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                            onClick={() => {
                                // 未实现模块：仅展开收起（不跳转）
                                setOpen((prev) => ({ ...prev, [g.module]: !prev[g.module] }));
                            }}
                        >
                            <span>{g.label}</span>
                            <span style={{ fontSize: 12, transform: groupOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                        </button>

                        {/* 二级：平台 */}
                        {groupOpen && (
                            <div style={{ marginTop: 6, paddingLeft: 14 }}>
                                <button
                                    style={subItemStyle(activeNormalized === toKey(g.module, "arm"), !g.enabled)}
                                    onClick={() => {
                                        if (!g.enabled) return;
                                        onSelect(toKey(g.module, "arm"));
                                    }}
                                    title={!g.enabled ? "暂未实现" : ""}
                                >
                                    arm评测
                                </button>

                                <button
                                    style={subItemStyle(activeNormalized === toKey(g.module, "x86"), !g.enabled)}
                                    onClick={() => {
                                        if (!g.enabled) return;
                                        onSelect(toKey(g.module, "x86"));
                                    }}
                                    title={!g.enabled ? "暂未实现" : ""}
                                >
                                    x86评测
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
