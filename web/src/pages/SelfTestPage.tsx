import React, { useEffect, useMemo, useState } from "react";
import type { ODVersionItem } from "../api";
import { getAllScenes } from "../api/home";
import SelfTestConfigForm from "../components/selftest/SelfTestConfigForm";
import ImportDataModal from "../components/selftest/ImportDataModal";

export default function SelfTestPage(props: { odVersions: ODVersionItem[] }) {
    const { odVersions } = props;

    // ====== 状态（SelfTestPage 只保留状态和布局） ======
    const [platform, setPlatform] = useState<"" | "arm" | "x86">("");

    const [testVersion, setTestVersion] = useState("");
    const [baselineVersion, setBaselineVersion] = useState("");

    const [scenes, setScenes] = useState<string[]>([]);
    const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
    const [isSceneDropdownOpen, setIsSceneDropdownOpen] = useState(false);

    // 导入弹窗
    const [showImportModal, setShowImportModal] = useState(false);
    const [triggerLink, setTriggerLink] = useState("");
    const [importPlatform, setImportPlatform] = useState<"" | "arm" | "x86">("");
    const [appData, setAppData] = useState("");

    // ====== 拉取 scenes：平台变化时重新拉取 ======
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!platform) {
                setScenes([]);
                setSelectedScenes([]);
                return;
            }

            try {
                const resp = await getAllScenes({ platform });
                if (cancelled) return;

                const names = (resp.rows ?? []).map((r: any) => r.scene_name).filter(Boolean);
                setScenes(names);
                // 平台变更后，清空已选场景（避免跨平台脏数据）
                setSelectedScenes([]);
            } catch (e) {
                if (cancelled) return;
                setScenes([]);
                setSelectedScenes([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [platform]);

    // ====== 事件 ======
    const handleImportConfirm = () => {
        // 这里接入你后续真正的导入逻辑（现在保留日志）
        console.log("Trigger Link:", triggerLink);
        console.log("导入平台:", importPlatform);
        console.log("应用数据:", appData);

        // ✅（推荐）导入平台可同步给自测平台，省得用户再选
        if (importPlatform) setPlatform(importPlatform);

        setShowImportModal(false);
        setTriggerLink("");
        setImportPlatform("");
        setAppData("");
    };

    const handleImportCancel = () => {
        setShowImportModal(false);
        setTriggerLink("");
        setImportPlatform("");
        setAppData("");
    };

    const readyToCompare = useMemo(() => {
        return !!platform && !!testVersion && !!baselineVersion && selectedScenes.length > 0;
    }, [platform, testVersion, baselineVersion, selectedScenes]);

    // ====== 布局 ======
    return (
        <div>
            <SelfTestConfigForm
                odVersions={odVersions}
                platform={platform}
                onPlatformChange={setPlatform}
                testVersion={testVersion}
                onTestVersionChange={setTestVersion}
                baselineVersion={baselineVersion}
                onBaselineVersionChange={setBaselineVersion}
                scenes={scenes}
                selectedScenes={selectedScenes}
                onSelectedScenesChange={setSelectedScenes}
                sceneDropdownOpen={isSceneDropdownOpen}
                setSceneDropdownOpen={setIsSceneDropdownOpen}
                onClickImport={() => setShowImportModal(true)}
            />

            <ImportDataModal
                open={showImportModal}
                triggerLink={triggerLink}
                testPlatform={importPlatform}
                appData={appData}
                onChangeTriggerLink={setTriggerLink}
                onChangeTestPlatform={setImportPlatform}
                onChangeAppData={setAppData}
                onCancel={handleImportCancel}
                onConfirm={handleImportConfirm}
            />

            <div style={{ padding: 16, textAlign: "center", color: "#666" }}>
                {readyToCompare ? (
                    <div>
                        <h3>自测数据对比</h3>
                        <p>平台: {platform}</p>
                        <p>test版本: {testVersion}</p>
                        <p>baseline版本: {baselineVersion}</p>
                        <p>选中的场景: {selectedScenes.join(", ")}</p>
                        <p>trigger link: {triggerLink || "未设置"}</p>
                        {/* TODO: 这里接你后续的对比图表/表格 */}
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
