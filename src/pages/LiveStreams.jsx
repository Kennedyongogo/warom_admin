import { useOutletContext } from "react-router-dom";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

export default function LiveStreams() {
  const { token } = useOutletContext();
  const { status, rows, error } = useAdminList("/api/admin/live-streams", token);

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Live streams</h1>
        <p className="page__subtitle">Monitor host streams across the platform.</p>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No live streams recorded yet.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Host</th>
                <th>Status</th>
                <th>Viewers</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Title">
                    <strong>{row.title}</strong>
                  </td>
                  <td data-label="Host">
                    <span className="ops-mono">{row.host_id}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${row.status === "live" ? "live" : badgeTone(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td data-label="Viewers">{numberFmt.format(row.viewer_count || 0)}</td>
                  <td data-label="Started">
                    {row.started_at
                      ? dateTimeFmt.format(new Date(row.started_at))
                      : row.created_at || row.createdAt
                        ? dateTimeFmt.format(new Date(row.created_at || row.createdAt))
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
