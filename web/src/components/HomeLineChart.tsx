import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

type Row = Record<string, any>;

export default function HomeLineChart(props: {
    title?: string;
    subtext?: string;
    rows: Row[];
    xKey: "od_version_minute" | "scene_name" | "direction" | "lane";
    groupBy?: "direction" | "lane"; // 新增：按方向或车道分组
    onClickCategory?: (v: string) => void;
}) {
    const { title, subtext, rows, xKey, groupBy, onClickCategory } = props;

    const view = useMemo(() => {
        if (!rows.length) return null;

        // 如果没有分组，保持原有逻辑
        if (!groupBy) {
            const xs = rows.map((r) => String(r[xKey] ?? ""));
            const precisionPct = rows.map((r) => Number(r.precision ?? 0) * 100);
            const recallPct = rows.map((r) => Number(r.recall ?? 0) * 100);

            const all = [...precisionPct, ...recallPct].filter((v) => Number.isFinite(v));
            const yMin = all.length ? Math.max(0, Math.floor(Math.min(...all)) - 5) : 0;

            return { xs, precisionPct, recallPct, yMin, series: null };
        }

        // 如果有分组，按分组字段创建多系列
        const xs = Array.from(new Set(rows.map(r => String(r[xKey] ?? "")))).sort();
        const groups = Array.from(new Set(rows.map(r => String(r[groupBy] ?? "")))).sort();

        const series = groups.map(group => {
            const groupData = rows.filter(r => String(r[groupBy] ?? "") === group);
            const precisionData = xs.map(x => {
                const item = groupData.find(r => String(r[xKey] ?? "") === x);
                return item ? Number(item.precision ?? 0) * 100 : null;
            });
            const recallData = xs.map(x => {
                const item = groupData.find(r => String(r[xKey] ?? "") === x);
                return item ? Number(item.recall ?? 0) * 100 : null;
            });

            return {
                group,
                precisionData,
                recallData
            };
        });

        // 计算Y轴最小值
        const allValues = series.flatMap(s => [...s.precisionData, ...s.recallData])
            .filter(v => v !== null && Number.isFinite(v)) as number[];
        const yMin = allValues.length ? Math.max(0, Math.floor(Math.min(...allValues)) - 5) : 0;

        return { xs, series, yMin, precisionPct: null, recallPct: null };
    }, [rows, xKey, groupBy]);

    if (!view) return <div>No data.</div>;

    let option: any;

    if (view.series) {
        // 多系列模式（方向/车道分组）
        option = {
            title: { text: title, subtext },
            tooltip: {
                trigger: "axis",
                valueFormatter: (v: any) => v !== null ? `${Number(v).toFixed(2)}%` : "-"
            },
            legend: {
                data: view.series.flatMap(s => [`${s.group}-precision`, `${s.group}-recall`])
            },
            xAxis: { type: "category", data: view.xs, axisLabel: { interval: 0, rotate: 10 } },
            yAxis: {
                type: "value",
                min: view.yMin,
                max: 100,
                axisLabel: { formatter: (v: number) => `${v.toFixed(0)}%` },
            },
            series: view.series.flatMap(s => [
                {
                    name: `${s.group}-precision`,
                    type: "line",
                    data: s.precisionData,
                    smooth: true,
                    label: {
                        show: true,
                        position: "top",
                        formatter: ({ value }: any) => value !== null ? `${Number(value).toFixed(2)}%` : "-"
                    },
                },
                {
                    name: `${s.group}-recall`,
                    type: "line",
                    data: s.recallData,
                    smooth: true,
                    label: {
                        show: true,
                        position: "top",
                        formatter: ({ value }: any) => value !== null ? `${Number(value).toFixed(2)}%` : "-"
                    },
                }
            ]),
        };
    } else {
        // 单系列模式（原有逻辑）
        option = {
            title: { text: title, subtext },
            tooltip: { trigger: "axis", valueFormatter: (v: any) => `${Number(v).toFixed(2)}%` },
            legend: { data: ["precision", "recall"] },
            xAxis: { type: "category", data: view.xs, axisLabel: { interval: 0, rotate: 10 } },
            yAxis: {
                type: "value",
                min: view.yMin,
                max: 100,
                axisLabel: { formatter: (v: number) => `${v.toFixed(0)}%` },
            },
            series: [
                {
                    name: "precision",
                    type: "line",
                    data: view.precisionPct,
                    smooth: true,
                    label: { show: true, position: "top", formatter: ({ value }: any) => `${Number(value).toFixed(2)}%` },
                },
                {
                    name: "recall",
                    type: "line",
                    data: view.recallPct,
                    smooth: true,
                    label: { show: true, position: "top", formatter: ({ value }: any) => `${Number(value).toFixed(2)}%` },
                },
            ],
        };
    }

    const onEvents = onClickCategory
        ? {
            click: (params: any) => {
                const v = params?.name;
                if (typeof v === "string") onClickCategory(v);
            },
        }
        : undefined;

    return <ReactECharts option={option} onEvents={onEvents} style={{ height: 420 }} />;
}