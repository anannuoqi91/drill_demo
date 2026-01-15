import React, { useEffect, useMemo, useState } from "react";
import type { ODVersionItem } from "../../api";
import { getAllScenes } from "../../api/home";

export default function SelfTestPanel(props: {
    odVersions: ODVersionItem[];
    resetNonce: number;
    onResetSelfTest?: () => void; // 可选：App层刷新时调用
}) {
    const { odVersions, resetNonce, onResetSelfTest } = props;

    // ===== 新增：自测页面内部决定平台与场景列表 =====
    const [platform, setPlatform] = useState<"" | "arm" | "x86">("");
    const [scenes, setScenes] = useState<string[]>([]);
    const [scenesLoading, setScenesLoading] = useState(false);
    const [scenesError, setScenesError] = useState<string>("");

    // ===== 自测页面专用状态 =====
    const [triggerLink, setTriggerLink] = useState("");
    const [showTriggerLinkModal, setShowTriggerLinkModal] = useState(false);
    const [testVersion, setTestVersion] = useState("");
    const [baselineVersion, setBaselineVersion] = useState("");
    const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
    const [isSceneDropdownOpen, setIsSceneDropdownOpen] = useState(false);

    // 数据导入模态框下拉框
    const [testPlatform, setTestPlatform] = useState(""); // arm/x86
    const [appData, setAppData] = useState("");

    // ===== 外部触发 reset（方案A关键点） =====
    useEffect(() => {
        reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetNonce]);

    // ===== 平台变化 -> 拉场景列表 =====
    useEffect(() => {
        let cancelled = false;

        async function loadScenes() {
            if (!platform) {
                setScenes([]);
                setSelectedScenes([]);
                setScenesError("");
                setScenesLoading(false);
                return;
            }

            setScenesLoading(true);
            setScenesError("");

            try {
                const resp = await getAllScenes({ platform });
                if (cancelled) return;

                const names = (resp.rows ?? [])
                    .map((r: any) => r.scene_name)
                    .filter(Boolean) as string[];

                setScenes(names);
                setSelectedScenes([]); // 切平台后清空已选
            } catch (e: any) {
                if (cancelled) return;
                setScenes([]);
                setSelectedScenes([]);
                setScenesError(String(e));
            } finally {
                if (!cancelled) setScenesLoading(false);
            }
        }

        loadScenes();
        return () => {
            cancelled = true;
        };
    }, [platform]);

    // ===== 事件 =====
    const toggleSceneSelection = (scene: string) => {
        setSelectedScenes((prev) => {
            if (prev.includes(scene)) return prev.filter((s) => s !== scene);
            return [...prev, scene];
        });
    };

    const toggleSelectAllScenes = () => {
        if (selectedScenes.length === scenes.length) setSelectedScenes([]);
        else setSelectedScenes([...scenes]);
    };

    const handleTriggerLinkConfirm = () => {
        console.log("Trigger Link:", triggerLink);
        console.log("测试平台:", testPlatform);
        console.log("应用数据:", appData);

        setShowTriggerLinkModal(false);
        setTriggerLink("");
        setTestPlatform("");
        setAppData("");
    };

    function reset() {
        setTriggerLink("");
        setShowTriggerLinkModal(false);
        setTestVersion("");
        setBaselineVersion("");
        setSelectedScenes([]);
        setIsSceneDropdownOpen(false);
        setTestPlatform("");
        setAppData("");

        // reset 平台&场景（让自测彻底“回到初始态”）
        setPlatform("");
        setScenes([]);
        setScenesLoading(false);
        setScenesError("");

        onResetSelfTest?.();
    }

    const canSubmitImport = useMemo(() => {
        return !!triggerLink.trim() && !!testPlatform && !!appData;
    }, [triggerLink, testPlatform, appData]);

    const readyToCompare = !!platform && testVersion && baselineVersion && selectedScenes.length > 0;

    const sceneDropdownDisabled = !platform || scenesLoading || scenes.length === 0;

    // ===== UI =====
    return (
        <div>
            {/* 容器A：配置区 */}
            <div
                style={{
                    padding: "16px",
                    background: "white",
                    borderBottom: "1px solid #eee",
                    marginBottom: "16px",
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "16px",
                        alignItems: "end",
                    }}
                >
                    {/* 数据导入按钮 */}
                    <div>
                        <button
                            onClick={() => setShowTriggerLinkModal(true)}
                            style={{
                                padding: "8px 16px",
                                background: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                width: "100%",
                            }}
                        >
                            数据导入
                        </button>
                    </div>

                    {/* 新增：平台选择（决定 scene 列表） */}
                    <div>
                        <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                            平台:
                        </label>
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value as "" | "arm" | "x86")}
                            style={{
                                padding: "6px 12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "14px",
                                width: "100%",
                                background: "white",
                            }}
                        >
                            <option value="">请选择平台</option>
                            <option value="arm">arm</option>
                            <option value="x86">x86</option>
                        </select>
                    </div>

                    {/* test版本下拉框 */}
                    <div>
                        <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                            test版本:
                        </label>
                        <select
                            value={testVersion}
                            onChange={(e) => setTestVersion(e.target.value)}
                            style={{
                                padding: "6px 12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "14px",
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

                    {/* baseline版本下拉框 */}
                    <div>
                        <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                            baseline版本:
                        </label>
                        <select
                            value={baselineVersion}
                            onChange={(e) => setBaselineVersion(e.target.value)}
                            style={{
                                padding: "6px 12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "14px",
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

                    {/* scene多选下拉框 */}
                    <div style={{ position: "relative" }}>
                        <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                            scene选择:
                        </label>

                        <button
                            onClick={() => !sceneDropdownDisabled && setIsSceneDropdownOpen(!isSceneDropdownOpen)}
                            disabled={sceneDropdownDisabled}
                            style={{
                                padding: "6px 12px",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "12px",
                                width: "100%",
                                background: sceneDropdownDisabled ? "#f5f5f5" : "white",
                                color: sceneDropdownDisabled ? "#999" : "#111",
                                cursor: sceneDropdownDisabled ? "not-allowed" : "pointer",
                                textAlign: "left",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <span>
                                {!platform
                                    ? "请先选择平台"
                                    : scenesLoading
                                        ? "加载场景中..."
                                        : scenes.length === 0
                                            ? "暂无场景"
                                            : selectedScenes.length === 0
                                                ? "选择场景"
                                                : selectedScenes.length === 1
                                                    ? selectedScenes[0]
                                                    : `已选 ${selectedScenes.length} 个场景`}
                            </span>
                            <span
                                style={{
                                    transform: isSceneDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s",
                                }}
                            >
                                ▼
                            </span>
                        </button>

                        {!!scenesError && (
                            <div style={{ marginTop: 6, fontSize: 12, color: "#ff4d4f" }}>
                                场景加载失败：{scenesError}
                            </div>
                        )}

                        {isSceneDropdownOpen && !sceneDropdownDisabled && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "white",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    zIndex: 1000,
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    marginTop: "2px",
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
                                        gap: "8px",
                                        background: selectedScenes.length === scenes.length ? "#f0f8ff" : "white",
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelectAllScenes();
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedScenes.length === scenes.length && scenes.length > 0}
                                        readOnly
                                        style={{ margin: 0, pointerEvents: "none" }}
                                    />
                                    <span style={{ fontSize: "12px", fontWeight: "500" }}>
                                        全选 ({scenes.length})
                                    </span>
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
                                            gap: "8px",
                                            background: selectedScenes.includes(scene) ? "#f0f8ff" : "white",
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSceneSelection(scene);
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedScenes.includes(scene)}
                                            readOnly
                                            style={{ margin: 0, pointerEvents: "none" }}
                                        />
                                        <span style={{ fontSize: "12px" }}>{scene}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 重置按钮 */}
                    <div>
                        <button
                            onClick={reset}
                            style={{
                                padding: "8px 16px",
                                background: "#6c757d",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                width: "100%",
                            }}
                        >
                            重置
                        </button>
                    </div>
                </div>
            </div>

            {/* trigger link 模态框 */}
            {showTriggerLinkModal && (
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
                            padding: "24px",
                            borderRadius: "8px",
                            width: "500px",
                            maxWidth: "90vw",
                        }}
                    >
                        <h3 style={{ marginBottom: "16px" }}>数据导入配置</h3>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                trigger link:
                            </label>
                            <input
                                type="text"
                                value={triggerLink}
                                onChange={(e) => setTriggerLink(e.target.value)}
                                placeholder="请输入trigger link"
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                测试平台:
                            </label>
                            <select
                                value={testPlatform}
                                onChange={(e) => setTestPlatform(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    background: "white",
                                }}
                            >
                                <option value="">请选择测试平台</option>
                                <option value="arm">arm</option>
                                <option value="x86">x86</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: "4px" }}>
                                应用数据:
                            </label>
                            <select
                                value={appData}
                                onChange={(e) => setAppData(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    background: "white",
                                }}
                            >
                                <option value="">请选择应用数据</option>
                                <option value="stop_bar_statistic_with_time">stop_bar_statistic_with_time</option>
                                <option value="stop_bar_statistic_without_time">stop_bar_statistic_without_time</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => {
                                    setShowTriggerLinkModal(false);
                                    setTriggerLink("");
                                    setTestPlatform("");
                                    setAppData("");
                                }}
                                style={{
                                    padding: "8px 16px",
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                }}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleTriggerLinkConfirm}
                                disabled={!canSubmitImport}
                                style={{
                                    padding: "8px 16px",
                                    background: canSubmitImport ? "#28a745" : "#ccc",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: canSubmitImport ? "pointer" : "not-allowed",
                                }}
                            >
                                确认
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 结果区 */}
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                {readyToCompare ? (
                    <div>
                        <h3>自测数据对比</h3>
                        <p>平台: {platform}</p>
                        <p>test版本: {testVersion}</p>
                        <p>baseline版本: {baselineVersion}</p>
                        <p>选中的场景: {selectedScenes.join(", ")}</p>
                        <p>trigger link: {triggerLink || "未设置"}</p>
                        {/* TODO: 这里可以添加数据对比图表 */}
                    </div>
                ) : (
                    <div>
                        <h3>自测页面</h3>
                        <p>请选择平台、test版本、baseline版本和场景开始自测</p>
                    </div>
                )}
            </div>
        </div>
    );
}
