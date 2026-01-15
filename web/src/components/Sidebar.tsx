// Sidebar.tsx
import React from "react";

export type NavKey = "home" | "x86" | "arm" | "selftest" | "scene";

// ✅ 一行开关
const ENABLE_SELFTEST = false;

export default function Sidebar(props: {
    active: NavKey;
    onSelect: (k: NavKey) => void;
}) {
    const { active, onSelect } = props;

    const items: { key: NavKey; label: string }[] = [
        { key: "home", label: "首页" },
        { key: "arm", label: "arm评测" },
        { key: "x86", label: "x86评测" },
        ...(ENABLE_SELFTEST ? [{ key: "selftest" as const, label: "自测" }] : []),
    ];

    return (
        <div style={{ width: 220, borderRight: "1px solid #eee", padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Drill Demo</div>

            {items.map((it) => (
                <button
                    key={it.key}
                    onClick={() => onSelect(it.key)}
                    style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        marginBottom: 8,
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        background: active === it.key ? "#f4f6ff" : "white",
                        cursor: "pointer",
                    }}
                >
                    {it.label}
                </button>
            ))}
        </div>
    );
}
