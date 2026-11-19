import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api, mediaUrl } from "../auth.js";
import { dateTimeFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { badgeTone } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

const TABS = [
  { id: "messages", label: "Messages" },
  { id: "locked_photos", label: "Locked photos" },
];

export default function ContentModeration() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "messages";
  const [status, setStatus] = useState("loading");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    api(`/api/admin/moderation/content?kind=${tab}&limit=100`, { token })
      .then((data) => {
        if (cancelled) return;
        const list =
          tab === "locked_photos"
            ? data?.locked_photos || []
            : data?.messages || [];
        setRows(list);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setError(err.message || "Failed to load");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tab, token]);

  useEffect(() => {
    const cancel = reload();
    return typeof cancel === "function" ? cancel : undefined;
  }, [reload]);

  const actMessage = async (row, moderation_status) => {
    setBusyId(row.id);
    try {
      await api(`/api/admin/moderation/messages/${row.id}`, {
        token,
        method: "PATCH",
        body: { moderation_status },
      });
      await showSuccess("Updated", `Message marked ${moderation_status}.`);
      reload();
    } catch (err) {
      await showError("Couldn't update", err.message || "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const actPhoto = async (row, action) => {
    setBusyId(row.id);
    try {
      await api(`/api/admin/moderation/locked-photos/${row.id}`, {
        token,
        method: "PATCH",
        body: { action },
      });
      await showSuccess("Updated", action === "remove" ? "Photo removed." : "Photo restored.");
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
        <h1 className="page__title">Content moderation</h1>
        <p className="page__subtitle">Review flagged messages and locked media before they stay live.</p>
        <div className="ops-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="ops-toolbar__filters">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ops-chip${tab === item.id ? " is-active" : ""}`}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("tab", item.id);
                    return next;
                  })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">Nothing pending here.</div>}
        {status === "ready" && rows.length > 0 && tab === "messages" && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Sender</th>
                <th>Body</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {dateTimeFmt.format(new Date(row.created_at || row.createdAt))}
                  </td>
                  <td data-label="Sender">
                    <span className="ops-mono">{row.sender_id}</span>
                  </td>
                  <td data-label="Body">{row.body || row.content || "—"}</td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${badgeTone(row.moderation_status || "pending")}`}>
                      {row.moderation_status || "pending"}
                    </span>
                  </td>
                  <td className="ops-actions-cell" data-label="Actions">
                    <div className="ops-actions">
                      <button
                        type="button"
                        className="ops-btn ops-btn--sm"
                        disabled={busyId === row.id}
                        onClick={() => actMessage(row, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="ops-btn ops-btn--ghost ops-btn--sm"
                        disabled={busyId === row.id}
                        onClick={() => actMessage(row, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {status === "ready" && rows.length > 0 && tab === "locked_photos" && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Owner</th>
                <th>Preview</th>
                <th>Price</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {dateTimeFmt.format(new Date(row.created_at || row.createdAt))}
                  </td>
                  <td data-label="Owner">
                    <span className="ops-mono">{row.owner_id}</span>
                  </td>
                  <td data-label="Preview">
                    {row.thumbnail_url || row.media_url ? (
                      <a href={mediaUrl(row.thumbnail_url || row.media_url)} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Price">{row.coin_price ?? "—"}</td>
                  <td data-label="Active">
                    <span className={`ops-badge ops-badge--${badgeTone(row.is_active ? "active" : "ended")}`}>
                      {row.is_active ? "active" : "removed"}
                    </span>
                  </td>
                  <td className="ops-actions-cell" data-label="Actions">
                    <div className="ops-actions">
                      {row.is_active ? (
                        <button
                          type="button"
                          className="ops-btn ops-btn--ghost ops-btn--sm"
                          disabled={busyId === row.id}
                          onClick={() => actPhoto(row, "remove")}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ops-btn ops-btn--sm"
                          disabled={busyId === row.id}
                          onClick={() => actPhoto(row, "restore")}
                        >
                          Restore
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
