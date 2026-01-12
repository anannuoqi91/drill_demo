import React from "react";

export type NavKey = "home" | "x86" | "arm" | "scene";

export default function Sidebar(props: {
    active: NavKey;
    onSelect: (k: NavKey) => void;
}) {
    const { active, onSelect } = props;

    const items: { key: NavKey; label: string }[] = [
        { key: "home", label: "首页" },
        { key: "x86", label: "x86" },
        { key: "arm", label: "arm" },
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
