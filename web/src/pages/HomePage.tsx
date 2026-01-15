import React, { useEffect, useState } from "react";
import BaseInfoDrillCard from "../components/BaseInfoDrillCard";
import PageHeader from "../layout/PageHeader";
import type { BaseInfo, ODVersionItem } from "../api";

const BASEINFO_CONFIGS: { key: string; baseinfo: BaseInfo; title: string }[] = [
    { key: "arm_fk", baseinfo: { platform: "arm", data_fix: "_FK_" }, title: "arm _FK" },
    { key: "arm_rw", baseinfo: { platform: "arm", data_fix: "_RW_" }, title: "arm _RW" },
    { key: "arm_re1x", baseinfo: { platform: "arm", data_fix: "_RE1X_" }, title: "arm _RE1X" },
    { key: "x86_fk", baseinfo: { platform: "x86", data_fix: "_FK_" }, title: "x86 _FK" },
    { key: "x86_rw", baseinfo: { platform: "x86", data_fix: "_RW_" }, title: "x86 _RW" },
    { key: "x86_re1x", baseinfo: { platform: "x86", data_fix: "_RE1X_" }, title: "x86 _RE1X" },
];

export default function HomePage(props: { odVersions: ODVersionItem[] }) {
    const { odVersions } = props;
    const [selectedOdVersion, setSelectedOdVersion] = useState("");

    useEffect(() => {
        if (!selectedOdVersion && odVersions.length > 0) {
            setSelectedOdVersion(odVersions[0].od_version_minute);
        }
    }, [odVersions, selectedOdVersion]);

    return (
        <>
            <PageHeader
                title="首页"
                subtitle="默认显示OD最近版本的评测结果"
                right={
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
                                minWidth: "200px",
                            }}
                        >
                            {odVersions.map((item) => (
                                <option key={item.od_version_minute} value={item.od_version_minute}>
                                    {item.od_version_minute}
                                </option>
                            ))}
                        </select>
                    </div>
                }
            />

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
        </>
    );
}
