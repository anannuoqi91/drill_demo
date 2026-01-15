import React from "react";

export default function AppShell(props: { sidebar: React.ReactNode; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, Arial" }}>
            <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
                {props.sidebar}
            </div>
            <div style={{ flex: 1, background: "#fafafa" }}>{props.children}</div>
        </div>
    );
}
