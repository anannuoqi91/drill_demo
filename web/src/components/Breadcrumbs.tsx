import React from "react";

export type Crumb = { label: string; key: string; value: string | number };

export default function Breadcrumbs(props: {
    crumbs: Crumb[];
    onGoLevel: (level: number) => void; // 0 = root
}) {
    const { crumbs, onGoLevel } = props;

    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => onGoLevel(0)}>All</button>
            {crumbs.map((c, idx) => (
                <React.Fragment key={`${c.key}-${c.value}-${idx}`}>
                    <span>›</span>
                    <button onClick={() => onGoLevel(idx + 1)}>
                        {c.label}: {String(c.value)}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}
