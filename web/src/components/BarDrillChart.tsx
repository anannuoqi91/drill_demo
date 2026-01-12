import React from "react";
import ReactECharts from "echarts-for-react";

type Row = Record<string, any>;

export default function BarDrillChart(props: {
    title: string;
    rows: Row[];
    categoryKey: string; // 当前维度字段，例如 od_version / scene_name / direction / lane
    onDrill: (categoryValue: string | number) => void;
}) {
    const { title, rows, categoryKey, onDrill } = props;

    const categories = rows.map((r) => r[categoryKey]);
    const s1 = rows.map((r) => r.tp_over_tp_fp_pct ?? 0);
    const s2 = rows.map((r) => r.tp_over_tp_fn_pct ?? 0);

    const option = {
        title: { text: title },
        tooltip: { trigger: "axis" },
        legend: { data: ["tp/(tp+fp)%", "tp/(tp+fn)%"] },
        xAxis: { type: "category", data: categories },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [
            { name: "tp/(tp+fp)%", type: "bar", data: s1 },
            { name: "tp/(tp+fn)%", type: "bar", data: s2 }
        ]
    };

    const onEvents = {
        click: (params: any) => {
            const v = params?.name;
            if (v !== undefined && v !== null) onDrill(v);
        }
    };

    return <ReactECharts option={option} onEvents={onEvents} style={{ height: 360 }} />;
}
