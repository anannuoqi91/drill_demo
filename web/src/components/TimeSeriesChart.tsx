import React from "react";
import ReactECharts from "echarts-for-react";

type Row = Record<string, any>;

export default function TimeSeriesChart(props: {
    title: string;
    rows: Row[]; // group_by = ['od_time_minute']
    onPickMinute: (minuteStr: string) => void;
}) {
    const { title, rows, onPickMinute } = props;

    const x = rows.map((r) => r.od_time_minute);
    const s1 = rows.map((r) => r.tp_over_tp_fp_pct ?? 0);
    const s2 = rows.map((r) => r.tp_over_tp_fn_pct ?? 0);

    const option = {
        title: { text: title },
        tooltip: { trigger: "axis" },
        legend: { data: ["tp/(tp+fp)%", "tp/(tp+fn)%"] },
        xAxis: { type: "category", data: x },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [
            { name: "tp/(tp+fp)%", type: "line", data: s1, smooth: true },
            { name: "tp/(tp+fn)%", type: "line", data: s2, smooth: true }
        ]
    };

    const onEvents = {
        click: (params: any) => {
            const v = params?.name; // od_time_minute string
            if (typeof v === "string") onPickMinute(v);
        }
    };

    return <ReactECharts option={option} onEvents={onEvents} style={{ height: 360 }} />;
}
