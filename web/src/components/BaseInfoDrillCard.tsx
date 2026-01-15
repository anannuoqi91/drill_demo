import React, { useEffect, useState } from "react";
import HomeLineChart from "./HomeLineChart";
import { queryHomeSeries, querySceneDirectionsPR, queryDirectionLanesPR, type BaseInfo } from "../api";

type HomeLevel = "scene" | "direction" | "lane";


interface Props {
    title: string;
    baseinfo: BaseInfo;
    selectedOdVersion?: string; // 新增参数
}


export default function BaseInfoDrillCard(props: Props) {
    const { title, baseinfo, selectedOdVersion } = props;

    const [level, setLevel] = useState<HomeLevel>("scene");
    const [odVersion, setOdVersion] = useState("");

    const [sceneRows, setSceneRows] = useState<Record<string, any>[]>([]);
    const [directionRows, setDirectionRows] = useState<Record<string, any>[]>([]);
    const [laneRows, setLaneRows] = useState<Record<string, any>[]>([]);

    const [selectedScene, setSelectedScene] = useState("");
    const [selectedDirection, setSelectedDirection] = useState("");

    async function loadScene() {
        // 如果提供了 selectedOdVersion，使用它；否则使用默认逻辑
        const ov = selectedOdVersion ? selectedOdVersion : "";

        const res = await queryHomeSeries({
            od_version: ov,
            baseinfo,
        });

        const rows = res.rows || [];
        if (!rows.length) {
            setSceneRows([]);
            setOdVersion("");
            setLevel("scene");
            setSelectedScene("");
            setSelectedDirection("");
            setDirectionRows([]);
            setLaneRows([]);
            return;
        }

        const minutes = rows
            .map((r: any) => String(r.od_time_minute ?? ""))
            .filter((x: string) => x);

        if (!minutes.length) {
            setSceneRows([]);
            setOdVersion(ov);
            setLevel("scene");
            return;
        }

        const sortedRows = [...rows].sort((a: any, b: any) =>
            String(a.scene_name ?? "").localeCompare(String(b.scene_name ?? ""))
        );

        setOdVersion(ov);
        setSceneRows(sortedRows);

        // reset drill
        setLevel("scene");
        setSelectedScene("");
        setSelectedDirection("");
        setDirectionRows([]);
        setLaneRows([]);
    }

    async function drillSceneToDirection(scene: string) {
        if (!odVersion) return;

        const res = await querySceneDirectionsPR({
            od_version: odVersion,
            scene_name: scene,
            baseinfo,
        });

        const rows = res.rows || [];
        rows.sort((a: any, b: any) => String(a.direction ?? "").localeCompare(String(b.direction ?? "")));

        setSelectedScene(scene);
        setSelectedDirection("");
        setDirectionRows(rows);
        setLaneRows([]);
        setLevel("direction");
    }

    async function drillDirectionToLane(direction: string) {
        if (!odVersion || !selectedScene) return;

        const res = await queryDirectionLanesPR({
            od_version: odVersion,
            scene_name: selectedScene,
            direction,
            baseinfo,
        });

        const rows = res.rows || [];
        rows.sort((a: any, b: any) => Number(a.lane ?? 0) - Number(b.lane ?? 0));

        setSelectedDirection(direction);
        setLaneRows(rows);
        setLevel("lane");
    }

    useEffect(() => {
        loadScene();
    }, [baseinfo.platform, baseinfo.data_fix, selectedOdVersion]);

    return (
        <div style={{ padding: 12, background: "white", border: "1px solid #eee", borderRadius: 10 }}>
            {/* header */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                    <div style={{ fontWeight: 700 }}>{title}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                        {odVersion ? `当前：${odVersion}` : "无数据（可能时间范围内无记录）"}
                        {selectedScene ? ` / ${selectedScene}` : ""}
                        {selectedDirection ? ` / ${selectedDirection}` : ""}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {level !== "scene" && (
                        <button
                            onClick={() => {
                                setLevel("scene");
                                setSelectedScene("");
                                setSelectedDirection("");
                                setDirectionRows([]);
                                setLaneRows([]);
                            }}
                        >
                            ← 返回 Scene
                        </button>
                    )}

                    {level === "lane" && (
                        <button
                            onClick={() => {
                                setLevel("direction");
                                setSelectedDirection("");
                                setLaneRows([]);
                            }}
                        >
                            ← 返回 Direction
                        </button>
                    )}
                </div>
            </div>

            {/* chart */}
            <div style={{ marginTop: 10 }}>
                {level === "scene" && (
                    <HomeLineChart
                        subtext={`点击 scene 下钻 direction`}
                        rows={sceneRows}
                        xKey="scene_name"
                        onClickCategory={drillSceneToDirection}
                    />
                )}

                {level === "direction" && (
                    <HomeLineChart
                        subtext={`点击 direction 下钻 lane`}
                        rows={directionRows}
                        xKey="direction"
                        onClickCategory={drillDirectionToLane}
                    />
                )}

                {level === "lane" && (
                    <HomeLineChart
                        subtext={`可点击返回按钮`}
                        rows={laneRows}
                        xKey="lane"
                    />
                )}
            </div>
        </div>
    );
}
