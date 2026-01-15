import React, { useEffect, useMemo, useRef } from "react";

export type MultiSelectItem = { value: string; label?: string };

type Props = {
    label?: string;

    items: MultiSelectItem[];
    selected: string[];
    onChange: (next: string[]) => void;

    // UI
    placeholder?: string;
    width?: number | string;
    maxHeight?: number;

    // actions
    onConfirm?: () => void;
    onReset?: () => void;

    // states
    disabled?: boolean;
    open: boolean;
    setOpen: (v: boolean) => void;
};

export default function MultiSelectDropdown(props: Props) {
    const {
        label,
        items,
        selected,
        onChange,
        placeholder = "选择版本",
        width = 150,
        maxHeight = 220,
        onConfirm,
        onReset,
        disabled = false,
        open,
        setOpen,
    } = props;

    const rootRef = useRef<HTMLDivElement | null>(null);

    const allValues = useMemo(() => items.map((x) => x.value), [items]);
    const allSelected = selected.length > 0 && selected.length === items.length;

    const displayText = useMemo(() => {
        if (!selected.length) return placeholder;
        if (selected.length === 1) return selected[0];
        return `已选 ${selected.length} 个版本`;
    }, [selected, placeholder]);

    const toggleValue = (v: string) => {
        if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
        else onChange([...selected, v]);
    };

    const toggleAll = () => {
        if (allSelected) onChange([]);
        else onChange(allValues);
    };

    // 点击外部关闭（不用全屏遮罩层，避免 zIndex 问题）
    useEffect(() => {
        if (!open) return;

        const onDocMouseDown = (e: MouseEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (el.contains(e.target as Node)) return;
            setOpen(false);
        };

        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [open, setOpen]);

    return (
        <div
            ref={rootRef}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                position: "relative",
                userSelect: "none",
            }}
        >
            {label && <label style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>}

            <div style={{ position: "relative", display: "inline-block" }}>
                {/* 触发按钮 */}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen(!open)}
                    style={{
                        padding: "6px 12px",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        fontSize: 12,
                        width: typeof width === "number" ? `${width}px` : width,
                        background: disabled ? "#f3f3f3" : "white",
                        cursor: disabled ? "not-allowed" : "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayText}
                    </span>
                    <span style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        ▼
                    </span>
                </button>

                {/* 菜单 */}
                {open && !disabled && (
                    <div
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "white",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                            zIndex: 2101, // 高于 sticky header/其他遮罩
                            maxHeight,
                            overflowY: "auto",
                            marginTop: 4,
                        }}
                        onClick={(e) => e.stopPropagation()} // 防止冒泡导致立即关闭
                    >
                        {/* 全选 */}
                        <div
                            style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid #eee",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: allSelected ? "#f0f8ff" : "white",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleAll();
                            }}
                        >
                            <input type="checkbox" checked={allSelected} readOnly style={{ margin: 0, pointerEvents: "none" }} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>全选 ({items.length})</span>
                        </div>

                        {/* 列表 */}
                        {items.map((it) => {
                            const checked = selected.includes(it.value);
                            return (
                                <div
                                    key={it.value}
                                    style={{
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        background: checked ? "#f0f8ff" : "white",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleValue(it.value);
                                    }}
                                >
                                    <input type="checkbox" checked={checked} readOnly style={{ margin: 0, pointerEvents: "none" }} />
                                    <span style={{ fontSize: 12 }}>{it.label ?? it.value}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 操作按钮：由外部传入 */}
            {onConfirm && (
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={disabled || selected.length === 0}
                    style={{
                        padding: "6px 12px",
                        background: disabled || selected.length === 0 ? "#ccc" : "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: disabled || selected.length === 0 ? "not-allowed" : "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    确定
                </button>
            )}

            {onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    disabled={disabled}
                    style={{
                        padding: "6px 12px",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    重置
                </button>
            )}
        </div>
    );
}
