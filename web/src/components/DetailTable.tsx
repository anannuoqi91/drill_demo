import React from "react";

type Row = Record<string, any>;

export default function DetailTable(props: {
    rows: Row[];
}) {
    const { rows } = props;
    if (!rows.length) return <div>No detail rows.</div>;

    const cols = Object.keys(rows[0]);

    return (
        <div style={{ overflow: "auto", border: "1px solid #ddd" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                    <tr>
                        {cols.map((c) => (
                            <th key={c} style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 }}>
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {cols.map((c) => (
                                <td key={c} style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                                    {String(r[c])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
