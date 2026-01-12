import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

type Row = Record<string, any>;

export default function HomeLineChart(props: {
    title: string;
    subtext?: string;
    rows: Row[];
    xKey: "scene_name" | "direction" | "lane";
    onClickCategory?: (v: string) => void;
}) {
    const { title, subtext, rows, xKey, onClickCategory } = props;

    const view = useMemo(() => {
        if (!rows.length) return null;

        const xs = rows.map((r) => String(r[xKey] ?? ""));
        const precisionPct = rows.map((r) => Number(r.precision ?? 0) * 100);
        const recallPct = rows.map((r) => Number(r.recall ?? 0) * 100);

        const all = [...precisionPct, ...recallPct].filter((v) => Number.isFinite(v));
        const yMin = all.length ? Math.max(0, Math.floor(Math.min(...all)) - 5) : 0;

        return { xs, precisionPct, recallPct, yMin };
    }, [rows, xKey]);

    if (!view) return <div>No data.</div>;

    const option = {
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
