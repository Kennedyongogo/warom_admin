import { useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { dateTimeFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "reviewing", label: "Reviewing" },
  { id: "resolved", label: "Resolved" },
  { id: "dismissed", label: "Dismissed" },
  { id: "escalated", label: "Escalated" },
];

const ACTIONS = [
  { id: "reviewing", label: "Mark reviewing" },
  { id: "resolved", label: "Resolve" },
  { id: "dismissed", label: "Dismiss" },
  { id: "escalated", label: "Escalate" },
];

export default function Reports() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get("status") || "all";
  const path = useMemo(
    () =>
      statusFilter === "all"
        ? "/api/admin/reports?limit=100"
        : `/api/admin/reports?limit=100&status=${encodeURIComponent(statusFilter)}`,
    [statusFilter]
  );
  const { status, rows, error, reload } = useAdminList(path, token);
  const [reviewing, setReviewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const onSave = async (close) => {
    setSaving(true);
    try {
      await api(`/api/admin/reports/${reviewing.id}`, {
        token,
        method: "PATCH",
        body: {
          status: reviewing.nextStatus,
          resolution_notes: reviewing.notes || null,
        },
      });
      setSaving(false);
      close();
      setReviewing(null);
      await showSuccess("Report updated", `Marked as ${reviewing.nextStatus}.`);
      reload();
    } catch (err) {
      setSaving(false);
      await showError("Couldn't update", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Reports</h1>
        <p className="page__subtitle">Safety queue for user reports across the apps.</p>
        <div className="ops-toolbar__filters" style={{ marginTop: 12 }}>
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`ops-chip${statusFilter === filter.id ? " is-active" : ""}`}
              onClick={() =>
                setParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (filter.id === "all") next.delete("status");
                  else next.set("status", filter.id);
                  return next;
                })
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No reports in this view.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Reason</th>
                <th>Target</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {row.created_at || row.createdAt
                      ? dateTimeFmt.format(new Date(row.created_at || row.createdAt))
                      : "—"}
                  </td>
                  <td data-label="Reason">
                    <strong>{row.reason}</strong>
                    {row.details ? <div className="ops-note">{row.details}</div> : null}
                  </td>
                  <td data-label="Target">
                    <div>{row.target_type}</div>
                    <span className="ops-mono">{row.reported_user_id || row.target_id || "—"}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${badgeTone(row.status)}`}>{row.status}</span>
                  </td>
                  <td className="ops-actions-cell" data-label="Actions">
                    <div className="ops-actions">
                      {ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className="ops-btn ops-btn--ghost ops-btn--sm"
                          disabled={row.status === action.id}
                          onClick={() =>
                            setReviewing({
                              id: row.id,
                              nextStatus: action.id,
                              notes: row.resolution_notes || "",
                              label: action.label,
                            })
                          }
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reviewing && (
        <Modal labelledBy="report-title" onClose={() => !saving && setReviewing(null)} busy={saving} fit>
          {(close) => (
            <form
              className="ops-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(close);
              }}
            >
              <h2 id="report-title" className="modal__title">
                {reviewing.label}
              </h2>
              <Field id="report-notes" label="Resolution notes">
                <textarea
                  rows={4}
                  value={reviewing.notes}
                  onChange={(e) => setReviewing((prev) => ({ ...prev, notes: e.target.value }))}
                  style={{ width: "100%", border: 0, background: "transparent", font: "inherit", resize: "vertical" }}
                />
              </Field>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="modal__btn modal__btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Confirm"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}
