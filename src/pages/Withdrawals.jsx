import { useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
  { id: "failed", label: "Failed" },
];

const ACTIONS = [
  { id: "processing", label: "Mark processing" },
  { id: "paid", label: "Mark paid" },
  { id: "rejected", label: "Reject" },
  { id: "failed", label: "Mark failed" },
];

export default function Withdrawals() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get("status") || "all";
  const path = useMemo(
    () =>
      statusFilter === "all"
        ? "/api/admin/withdrawals?limit=100"
        : `/api/admin/withdrawals?limit=100&status=${encodeURIComponent(statusFilter)}`,
    [statusFilter]
  );
  const { status, rows, error, reload } = useAdminList(path, token);
  const [reviewing, setReviewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const onReview = async (close) => {
    setSaving(true);
    try {
      await api(`/api/admin/withdrawals/${reviewing.id}`, {
        token,
        method: "PATCH",
        body: { status: reviewing.nextStatus, notes: reviewing.notes || null },
      });
      setSaving(false);
      close();
      setReviewing(null);
      await showSuccess("Withdrawal updated", `Marked as ${reviewing.nextStatus}.`);
      reload();
    } catch (err) {
      setSaving(false);
      await showError("Couldn't update", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Withdrawals</h1>
        <p className="page__subtitle">Review chatter payout requests.</p>
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
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No withdrawals in this view.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Chatter</th>
                <th>Amount</th>
                <th>Method</th>
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
                  <td data-label="Chatter">
                    <span className="ops-mono">{row.chatter_id}</span>
                  </td>
                  <td data-label="Amount">
                    {numberFmt.format(row.amount_coins)} coins
                    {row.amount_fiat != null ? ` · ${numberFmt.format(Number(row.amount_fiat))} ${row.currency || "KES"}` : ""}
                  </td>
                  <td data-label="Method">{row.payout_method}</td>
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
                              notes: row.notes || "",
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
        <Modal labelledBy="withdraw-title" onClose={() => !saving && setReviewing(null)} busy={saving} fit>
          {(close) => (
            <form
              className="ops-form"
              onSubmit={(event) => {
                event.preventDefault();
                onReview(close);
              }}
            >
              <h2 id="withdraw-title" className="modal__title">
                {reviewing.label}
              </h2>
              <Field id="withdraw-notes" label="Notes">
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
