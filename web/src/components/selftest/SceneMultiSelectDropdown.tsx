import React, { useEffect, useRef } from "react";

export default function SceneMultiSelectDropdown(props: {
    label: string;
    scenes: string[];
    selected: string[];
    onChange: (next: string[]) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
    placeholder?: string;
}) {
    const { label, scenes, selected, onChange, open, setOpen, placeholder } = props;
    const rootRef = useRef<HTMLDivElement | null>(null);

    // 点击外部自动关闭
    useEffect(() => {
        if (!open) return;

        const onDocClick = (e: MouseEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) setOpen(false);
        };

        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open, setOpen]);

    const toggleScene = (scene: string) => {
        if (selected.includes(scene)) {
            onChange(selected.filter((s) => s !== scene));
        } else {
            onChange([...selected, scene]);
        }
    };

    const toggleSelectAll = () => {
        if (selected.length === scenes.length) onChange([]);
        else onChange([...scenes]);
    };

    const summaryText =
        selected.length === 0
            ? placeholder ?? "选择场景"
            : selected.length === 1
                ? selected[0]
                : `已选 ${selected.length} 个场景`;

    return (
        <div ref={rootRef} style={{ position: "relative" }}>
            <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                {label}
            </label>

            <button
                type="button"
                onClick={() => setOpen(!open)}
                disabled={scenes.length === 0}
                style={{
                    padding: "6px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 12,
                    width: "100%",
                    background: scenes.length === 0 ? "#f5f5f5" : "white",
                    cursor: scenes.length === 0 ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <span style={{ color: scenes.length === 0 ? "#999" : "#111" }}>
                    {scenes.length === 0 ? "暂无可选场景（请先选择平台）" : summaryText}
                </span>
                <span style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    ▼
                </span>
            </button>

            {open && scenes.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "white",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        maxHeight: 240,
                        overflowY: "auto",
                        marginTop: 2,
                    }}
                >
                    {/* 全选 */}
                    <div
                        style={{
                            padding: "6px 12px",
                            borderBottom: "1px solid #eee",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: selected.length === scenes.length ? "#f0f8ff" : "white",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectAll();
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selected.length === scenes.length}
                            readOnly
                            style={{ margin: 0, pointerEvents: "none" }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>全选 ({scenes.length})</span>
                    </div>

                    {/* 列表 */}
                    {scenes.map((scene) => (
                        <div
                            key={scene}
                            style={{
                                padding: "6px 12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: selected.includes(scene) ? "#f0f8ff" : "white",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleScene(scene);
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(scene)}
                                readOnly
                                style={{ margin: 0, pointerEvents: "none" }}
                            />
                            <span style={{ fontSize: 12 }}>{scene}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
