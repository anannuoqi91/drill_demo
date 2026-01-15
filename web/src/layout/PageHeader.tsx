import React from "react";

export default function PageHeader(props: {
    title: string;
    subtitle: string;
    right?: React.ReactNode;
}) {
    return (
        <div
            style={{
                position: "sticky",
                top: 0,
                zIndex: 2000,
                padding: 16,
                borderBottom: "1px solid #eee",
                background: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{props.title}</div>
                <div style={{ color: "#666", marginTop: 4, fontSize: 12 }}>{props.subtitle}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>{props.right}</div>
        </div>
    );
}
