import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

type Row = Record<string, any>;

export default function HomeLineChartAbs(props: {
    title?: string;
    subtext?: string;
    rows: Row[];
    xKey: "od_version_minute" | "scene_name" | "direction" | "lane";
    groupBy?: "direction" | "lane"; // 按方向或车道分组
    onClickCategory?: (v: string) => void;
}) {
    const { title, subtext, rows, xKey, groupBy, onClickCategory } = props;

    const view = useMemo(() => {
        if (!rows.length) return null;

        // 无分组：单条 absolute 曲线
        if (!groupBy) {
            const xs = rows.map((r) => String(r[xKey] ?? ""));
            const absolutePct = rows.map((r) => Number(r.absolute ?? 0) * 100);

            const all = absolutePct.filter((v) => Number.isFinite(v));
            const yMin = all.length ? Math.max(0, Math.floor(Math.min(...all)) - 5) : 0;

            return { xs, absolutePct, yMin, series: null };
        }

        // 有分组：按 groupBy（direction / lane） 多条 absolute 曲线
        const xs = Array.from(new Set(rows.map((r) => String(r[xKey] ?? "")))).sort();
        const groups = Array.from(new Set(rows.map((r) => String(r[groupBy] ?? "")))).sort();

        const series = groups.map((group) => {
            const groupData = rows.filter((r) => String(r[groupBy] ?? "") === group);
            const absoluteData = xs.map((x) => {
                const item = groupData.find((r) => String(r[xKey] ?? "") === x);
                return item ? Number(item.absolute ?? 0) * 100 : null;
            });

            return {
                group,
                absoluteData,
            };
        });

        const allValues = series
            .flatMap((s) => s.absoluteData)
            .filter((v) => v !== null && Number.isFinite(v)) as number[];
        const yMin = allValues.length ? Math.max(0, Math.floor(Math.min(...allValues)) - 5) : 0;

        return { xs, series, yMin, absolutePct: null };
    }, [rows, xKey, groupBy]);

    if (!view) return <div>No data.</div>;

    let option: any;

    if (view.series) {
        // 多系列模式：每个 group 一条 absolute 曲线
        option = {
            title: { text: title, subtext },
            tooltip: {
                trigger: "axis",
                valueFormatter: (v: any) => (v !== null ? `${Number(v).toFixed(2)}%` : "-"),
            },
            legend: {
                data: view.series.map((s: any) => `${s.group}`),
            },
            xAxis: { name: 'od version', type: "category", data: view.xs, axisLabel: { interval: 0, rotate: 10 } },
            yAxis: {
                name: 'absolute %',
                type: "value",
                min: view.yMin,
                max: 100,
                axisLabel: { formatter: (v: number) => `${v.toFixed(0)}%` },
            },
            series: view.series.map((s: any) => ({
                name: `${s.group}`,
                type: "line",
                data: s.absoluteData,
                smooth: true,
                label: {
                    show: true,
                    position: "top",
                    formatter: ({ value }: any) =>
                        value !== null ? `${Number(value).toFixed(2)}%` : "-",
                },
            })),
        };
    } else {
        // 单系列模式
        option = {
            title: { text: title, subtext },
            tooltip: {
                trigger: "axis",
                valueFormatter: (v: any) => `${Number(v).toFixed(2)}%`,
            },
            legend: { data: ["absolute"] },
            xAxis: { type: "category", data: view.xs, axisLabel: { interval: 0, rotate: 10 } },
            yAxis: {
                type: "value",
                min: view.yMin,
                max: 100,
                axisLabel: { formatter: (v: number) => `${v.toFixed(0)}%` },
            },
            series: [
                {
                    name: "absolute",
                    type: "line",
                    data: view.absolutePct,
                    smooth: true,
                    label: {
                        show: true,
                        position: "top",
                        formatter: ({ value }: any) => `${Number(value).toFixed(2)}%`,
                    },
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
