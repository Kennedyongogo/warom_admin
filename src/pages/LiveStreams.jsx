import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { showConfirm, showError, showSuccess } from "../utils/swal.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

export default function LiveStreams() {
  const { token } = useOutletContext();
  const { status, rows, error, reload } = useAdminList("/api/admin/live-streams", token);
  const [busyId, setBusyId] = useState(null);

  const updateStream = async (row, nextStatus) => {
    const labels = {
      ended: "End this stream?",
      banned: "Ban this stream? It will end immediately.",
      live: "Mark this stream as live?",
    };
    const ok = await showConfirm(labels[nextStatus] || "Update stream?", `Status → ${nextStatus}`);
    if (!ok) return;
    setBusyId(row.id);
    try {
      await api(`/api/admin/live-streams/${row.id}`, {
        token,
        method: "PATCH",
        body: { status: nextStatus },
      });
      await showSuccess("Stream updated", `Marked as ${nextStatus}.`);
      reload();
    } catch (err) {
      await showError("Couldn't update", err.message || "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Live streams</h1>
        <p className="page__subtitle">Monitor host streams and end or ban when needed.</p>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Title">
                    <strong>{row.title || "Untitled"}</strong>
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
                  <td className="ops-actions-cell" data-label="Actions">
                    <div className="ops-actions">
                      {row.status === "live" && (
                        <button
                          type="button"
                          className="ops-btn ops-btn--sm"
                          disabled={busyId === row.id}
                          onClick={() => updateStream(row, "ended")}
                        >
                          End
                        </button>
                      )}
                      {row.status !== "banned" && (
                        <button
                          type="button"
                          className="ops-btn ops-btn--ghost ops-btn--sm"
                          disabled={busyId === row.id}
                          onClick={() => updateStream(row, "banned")}
                        >
                          Ban
                        </button>
                      )}
                    </div>
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
