import React from "react";

export default function ImportDataModal(props: {
    open: boolean;
    triggerLink: string;
    testPlatform: "" | "arm" | "x86";
    appData: string;
    onChangeTriggerLink: (v: string) => void;
    onChangeTestPlatform: (v: "" | "arm" | "x86") => void;
    onChangeAppData: (v: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const {
        open,
        triggerLink,
        testPlatform,
        appData,
        onChangeTriggerLink,
        onChangeTestPlatform,
        onChangeAppData,
        onCancel,
        onConfirm,
    } = props;

    if (!open) return null;

    const okEnabled = !!triggerLink.trim() && !!testPlatform && !!appData;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 3000,
            }}
        >
            <div
                style={{
                    background: "white",
                    padding: 24,
                    borderRadius: 8,
                    width: 520,
                    maxWidth: "90vw",
                }}
            >
                <h3 style={{ marginBottom: 16 }}>数据导入配置</h3>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        trigger link:
                    </label>
                    <input
                        type="text"
                        value={triggerLink}
                        onChange={(e) => onChangeTriggerLink(e.target.value)}
                        placeholder="请输入trigger link"
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 14,
                        }}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        测试平台:
                    </label>
                    <select
                        value={testPlatform}
                        onChange={(e) => onChangeTestPlatform(e.target.value as any)}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 14,
                            background: "white",
                        }}
                    >
                        <option value="">请选择测试平台</option>
                        <option value="arm">arm</option>
                        <option value="x86">x86</option>
                    </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        应用数据:
                    </label>
                    <select
                        value={appData}
                        onChange={(e) => onChangeAppData(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            fontSize: 14,
                            background: "white",
                        }}
                    >
                        <option value="">请选择应用数据</option>
                        <option value="stop_bar_statistic_with_time">stop_bar_statistic_with_time</option>
                        <option value="stop_bar_statistic_without_time">stop_bar_statistic_without_time</option>
                    </select>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: "8px 16px",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!okEnabled}
                        style={{
                            padding: "8px 16px",
                            background: okEnabled ? "#28a745" : "#ccc",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: okEnabled ? "pointer" : "not-allowed",
                        }}
                    >
                        确认
                    </button>
                </div>
            </div>
        </div>
    );
}
