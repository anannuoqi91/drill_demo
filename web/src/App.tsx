import React, { useEffect, useState } from "react";
import Sidebar, { NavKey } from "./components/Sidebar";
import DrillDashboard from "./DrillDashboard";
import BaseInfoDrillCard from "./components/BaseInfoDrillCard";
import type { BaseInfo, ODVersionItem, ODVersionsResponse } from "./api";
import { getODVersions } from "./api/home";

const BASEINFO_CONFIGS: { key: string; baseinfo: BaseInfo; title: string }[] = [
    { key: "arm_fk", baseinfo: { platform: "arm", data_fix: "_FK_" }, title: "arm _FK" },
    { key: "arm_rw", baseinfo: { platform: "arm", data_fix: "_RW_" }, title: "arm _RW" },
    { key: "arm_re1x", baseinfo: { platform: "arm", data_fix: "_RE1X_" }, title: "arm _RE1X" },
    { key: "x86_fk", baseinfo: { platform: "x86", data_fix: "_FK_" }, title: "x86 _FK" },
    { key: "x86_rw", baseinfo: { platform: "x86", data_fix: "_RW_" }, title: "x86 _RW" },
    { key: "x86_re1x", baseinfo: { platform: "x86", data_fix: "_RE1X_" }, title: "x86 _RE1X" },
];

export default function App() {
    const [page, setPage] = useState<NavKey>("home");
    const [odVersions, setOdVersions] = useState<ODVersionItem[]>([]);
    const [selectedOdVersion, setSelectedOdVersion] = useState<string>("");

    useEffect(() => {
        // 每张卡片自己会 load，不需要 App 统一 load
    }, [page]);

    // 加载OD版本列表
    useEffect(() => {
        const loadODVersions = async () => {
            try {
                const response: ODVersionsResponse = await getODVersions();
                setOdVersions(response.rows);
                if (response.rows.length > 0) {
                    setSelectedOdVersion(response.rows[0].od_version_minute);
                }
            } catch (error) {
                console.error("加载OD版本列表失败:", error);
            }
        };
        loadODVersions();
    }, []);

    // 刷新整个页面的函数
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, Arial" }}>
            <div style={{
                position: "sticky",
                top: 0,
                height: "100vh",
                overflowY: "auto"
            }}>
                <Sidebar active={page} onSelect={setPage} />
            </div>

            <div style={{ flex: 1, background: "#fafafa" }}>
                <div style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    padding: 16,
                    borderBottom: "1px solid #eee",
                    background: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                            {page === "home" ? "首页" : page === "arm" ? "arm评测" : page === "x86" ? "x86评测" : page === "selftest" ? "自测" : ""}
                        </div>
                        <div style={{ color: "#666", marginTop: 4, fontSize: 12 }}>
                            默认显示OD最近版本的评测结果
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ fontSize: 14, fontWeight: 500 }}>OD版本:</label>
                            <select
                                value={selectedOdVersion}
                                onChange={(e) => setSelectedOdVersion(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    minWidth: "200px"
                                }}
                            >
                                {odVersions.map((item) => (
                                    <option key={item.od_version_minute} value={item.od_version_minute}>
                                        {item.od_version_minute}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                fontWeight: "500"
                            }}
                        >
                            刷新
                        </button>
                    </div>
                </div>

                <div style={{ paddingTop: 16 }}>
                    {page === "home" && (
                        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                            {BASEINFO_CONFIGS.map((cfg) => (
                                <BaseInfoDrillCard
                                    key={cfg.key}
                                    title={cfg.title}
                                    baseinfo={cfg.baseinfo}
                                    selectedOdVersion={selectedOdVersion}
                                />
                            ))}
                        </div>
                    )}

                    {page === "x86" && <DrillDashboard title="x86 - 钻取分析" />}
                    {page === "arm" && <DrillDashboard title="arm - 钻取分析" />}
                </div>
            </div>
        </div>
    );
}