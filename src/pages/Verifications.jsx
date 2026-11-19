import { useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api, mediaUrl } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { dateTimeFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const KINDS = [
  { id: "all", label: "All kinds" },
  { id: "chatter_kyc", label: "Chatter KYC" },
  { id: "identity", label: "Identity" },
  { id: "age", label: "Age" },
];

export default function Verifications() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get("status") || "pending";
  const kindFilter = params.get("kind") || "all";
  const path = useMemo(() => {
    const q = new URLSearchParams({ limit: "100" });
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (kindFilter !== "all") q.set("kind", kindFilter);
    return `/api/admin/verifications?${q}`;
  }, [statusFilter, kindFilter]);
  const { status, rows, error, reload } = useAdminList(path, token);
  const [reviewing, setReviewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const onSave = async (close) => {
    setSaving(true);
    try {
      await api(`/api/admin/verifications/${reviewing.id}`, {
        token,
        method: "PATCH",
        body: { status: reviewing.nextStatus, notes: reviewing.notes || null },
      });
      setSaving(false);
      close();
      setReviewing(null);
      await showSuccess("Verification updated", `Marked as ${reviewing.nextStatus}.`);
      reload();
    } catch (err) {
      setSaving(false);
      await showError("Couldn't update", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Verifications</h1>
        <p className="page__subtitle">Review age, identity, and chatter KYC submissions before payouts.</p>
        <div className="ops-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="ops-toolbar__filters">
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
          <div className="ops-toolbar__filters">
            {KINDS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`ops-chip${kindFilter === filter.id ? " is-active" : ""}`}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (filter.id === "all") next.delete("kind");
                    else next.set("kind", filter.id);
                    return next;
                  })
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No verifications in this view.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {dateTimeFmt.format(new Date(row.created_at || row.createdAt))}
                  </td>
                  <td data-label="User">
                    <div className="ops-stack">
                      <strong>{row.user?.username || row.user?.email || "—"}</strong>
                      <span className="ops-mono">{row.user_id}</span>
                    </div>
                  </td>
                  <td data-label="Kind">{row.kind}</td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${badgeTone(row.status)}`}>{row.status}</span>
                  </td>
                  <td data-label="Docs">
                    {(row.document_urls || []).length ? (
                      <div className="ops-stack">
                        {row.document_urls.slice(0, 3).map((url) => (
                          <a key={url} href={mediaUrl(url)} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="ops-actions-cell" data-label="Actions">
                    <div className="ops-actions">
                      <button
                        type="button"
                        className="ops-btn ops-btn--ghost ops-btn--sm"
                        onClick={() =>
                          setReviewing({
                            ...row,
                            nextStatus: row.status === "pending" ? "approved" : row.status,
                            notes: row.notes || "",
                          })
                        }
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reviewing && (
        <Modal labelledBy="verify-title" onClose={() => setReviewing(null)} busy={saving}>
          {(close) => (
            <>
              <h2 id="verify-title" className="modal__title">
                Review verification
              </h2>
              <p className="modal__lead">
                {reviewing.user?.username || reviewing.user_id} · {reviewing.kind}
              </p>
              <Field id="verify-status" label="Decision">
                <select
                  value={reviewing.nextStatus}
                  onChange={(e) => setReviewing((prev) => ({ ...prev, nextStatus: e.target.value }))}
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="pending">Keep pending</option>
                </select>
              </Field>
              <Field id="verify-notes" label="Notes">
                <textarea
                  rows={4}
                  value={reviewing.notes}
                  onChange={(e) => setReviewing((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </Field>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="modal__btn" onClick={() => onSave(close)} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
