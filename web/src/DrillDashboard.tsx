import React, { useEffect, useMemo, useState } from "react";
import Breadcrumbs, { Crumb } from "./components/Breadcrumbs";
import BarDrillChart from "./components/BarDrillChart";
import TimeSeriesChart from "./components/TimeSeriesChart";
import DetailTable from "./components/DetailTable";
import { queryDetail } from "./api";
import type { QueryResponse, DetailResponse, TimeRange } from "./types";


const DRILL_DIMS = ["od_version", "scene_name", "direction", "lane"] as const;

function isoMinutesAgo(mins: number) {
    const d = new Date(Date.now() - mins * 60_000);
    return d.toISOString();
}

export default function DrillDashboard(props: { title: string }) {
    const { title } = props;

    const [timeRange, setTimeRange] = useState<TimeRange>({
        start: isoMinutesAgo(120),
        end: new Date().toISOString(),
    });

    const [level, setLevel] = useState(0);
    const [filters, setFilters] = useState<Record<string, any>>({});

    const [barData, setBarData] = useState<QueryResponse | null>(null);
    const [tsData, setTsData] = useState<QueryResponse | null>(null);

    const [detail, setDetail] = useState<DetailResponse | null>(null);
    const [detailMinute, setDetailMinute] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string>("");

    const currentDim = level < DRILL_DIMS.length ? DRILL_DIMS[level] : null;

    const crumbs: Crumb[] = useMemo(() => {
        const out: Crumb[] = [];
        for (const k of DRILL_DIMS) {
            if (filters[k] !== undefined) out.push({ label: k, key: k, value: filters[k] });
        }
        return out;
    }, [filters]);

    async function refresh() {
        setLoading(true);
        setErr("");
        setDetail(null);
        setDetailMinute(null);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, JSON.stringify(filters), JSON.stringify(timeRange)]);

    function drillInto(value: string | number) {
        if (!currentDim) return;
        setFilters((prev) => ({ ...prev, [currentDim]: value }));
        setLevel((prev) => Math.min(prev + 1, DRILL_DIMS.length));
    }

    function goLevel(newLevel: number) {
        if (newLevel < 0) newLevel = 0;
        if (newLevel > DRILL_DIMS.length) newLevel = DRILL_DIMS.length;

        const nextFilters: Record<string, any> = {};
        for (let i = 0; i < newLevel; i++) {
            const dim = DRILL_DIMS[i];
            if (filters[dim] !== undefined) nextFilters[dim] = filters[dim];
        }
        setFilters(nextFilters);
        setLevel(newLevel);
    }

    async function drillToDetailByMinute(minuteStr: string) {
        setDetailMinute(minuteStr);
        // demo：仍然用简化解析（后续我可以按“后端按 minute_str 匹配”做成更严谨）
        const d = new Date(minuteStr.replace(" ", "T") + ":00Z");
        const start = d.toISOString();
        const end = new Date(d.getTime() + 60_000).toISOString();

        setLoading(true);
        setErr("");
        try {
            const res = await queryDetail({
                filters,
                time_range: { start, end },
                limit: 200,
                offset: 0,
            });
            setDetail(res);
        } catch (e: any) {
            setErr(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: 16 }}>
            <h2 style={{ margin: "6px 0 12px 0" }}>{title}</h2>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                <Breadcrumbs crumbs={crumbs} onGoLevel={goLevel} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => { setLevel(0); setFilters({}); }}>Reset</button>
                    <button onClick={refresh}>Refresh</button>
                </div>
            </div>

            <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <label>Start:</label>
                    <input style={{ width: 260 }} value={timeRange.start ?? ""} onChange={(e) => setTimeRange((p) => ({ ...p, start: e.target.value }))} />
                    <label>End:</label>
                    <input style={{ width: 260 }} value={timeRange.end ?? ""} onChange={(e) => setTimeRange((p) => ({ ...p, end: e.target.value }))} />
                    <small style={{ color: "#666" }}>(ISO 时间字符串；demo 默认最近 120 分钟)</small>
                </div>
            </div>

            {err && (
                <div style={{ marginTop: 12, padding: 12, background: "#ffecec", border: "1px solid #ffb4b4" }}>
                    <b>Error:</b> {err}
                </div>
            )}
            {loading && <div style={{ marginTop: 12 }}>Loading...</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                    {currentDim ? (
                        <BarDrillChart
                            title={`By ${currentDim} (click bar to drill-down)`}
                            rows={barData?.rows ?? []}
                            categoryKey={currentDim}
                            onDrill={drillInto}
                        />
                    ) : (
                        <div>Reached leaf level. Use breadcrumbs to roll-up.</div>
                    )}
                </div>

                <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                    <TimeSeriesChart
                        title="Over Time (minute) - click point to drill-through detail"
                        rows={tsData?.rows ?? []}
                        onPickMinute={drillToDetailByMinute}
                    />
                    <div style={{ marginTop: 8, color: "#666" }}>
                        Picked minute: {detailMinute ?? "-"}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                <h3>Detail Table (drill-through)</h3>
                <DetailTable rows={detail?.rows ?? []} />
            </div>
        </div>
    );
}
