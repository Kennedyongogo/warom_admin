import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

export default function Ledger() {
  const { token } = useOutletContext();
  const entriesPath = useMemo(() => "/api/admin/ledger/entries?limit=100", []);
  const accountsPath = useMemo(() => "/api/admin/ledger/accounts?limit=200", []);
  const entries = useAdminList(entriesPath, token);
  const accounts = useAdminList(accountsPath, token);

  const [adjust, setAdjust] = useState({
    user_id: "",
    account_code: "wallet_spendable",
    amount: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const onAdjust = async () => {
    if (!adjust.user_id || !adjust.amount || !adjust.reason) {
      await showError("Missing fields", "User ID, amount, and reason are required.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/users/${adjust.user_id}/adjust-balance`, {
        token,
        method: "POST",
        body: {
          account_code: adjust.account_code,
          amount: Number(adjust.amount),
          reason: adjust.reason,
        },
      });
      setSaving(false);
      setOpen(false);
      await showSuccess("Balance adjusted", "Ledger entry posted.");
      entries.reload();
      accounts.reload();
    } catch (err) {
      setSaving(false);
      await showError("Couldn't adjust", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Ledger</h1>
        <p className="page__subtitle">Coin journal entries, account balances, and manual adjustments.</p>
        <div className="ops-page-tools">
          <button type="button" className="ops-btn" onClick={() => setOpen(true)}>
            Adjust balance
          </button>
        </div>
      </header>

      <div className="ops-card">
        <h2 className="ops-card__title">Recent journal entries</h2>
        {entries.status === "loading" && <div className="ops-loading">Loading…</div>}
        {entries.status === "error" && <div className="ops-error">{entries.error}</div>}
        {entries.status === "ready" && entries.rows.length === 0 && (
          <div className="ops-empty">No ledger entries yet.</div>
        )}
        {entries.status === "ready" && entries.rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Description</th>
                <th>Actor</th>
                <th>Lines</th>
              </tr>
            </thead>
            <tbody>
              {entries.rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {dateTimeFmt.format(new Date(row.posted_at || row.created_at || row.createdAt))}
                  </td>
                  <td data-label="Type">{row.reference_type}</td>
                  <td data-label="Description">{row.description || "—"}</td>
                  <td data-label="Actor">
                    <span className="ops-mono">{row.actor_user_id || "—"}</span>
                  </td>
                  <td data-label="Lines">{(row.lines || []).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="ops-card">
        <h2 className="ops-card__title">Account balances</h2>
        {accounts.status === "loading" && <div className="ops-loading">Loading…</div>}
        {accounts.status === "error" && <div className="ops-error">{accounts.error}</div>}
        {accounts.status === "ready" && accounts.rows.length === 0 && (
          <div className="ops-empty">No ledger accounts yet.</div>
        )}
        {accounts.status === "ready" && accounts.rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Code</th>
                <th>Balance</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              {accounts.rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Owner">
                    <div className="ops-stack">
                      <span>{row.owner_type}</span>
                      <span className="ops-mono">{row.owner_id || "platform"}</span>
                    </div>
                  </td>
                  <td data-label="Code">{row.account_code}</td>
                  <td data-label="Balance">{numberFmt.format(Number(row.balance || 0))}</td>
                  <td data-label="Currency">{row.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <Modal labelledBy="adjust-title" onClose={() => setOpen(false)}>
          <h2 id="adjust-title" className="modal__title">
            Adjust balance
          </h2>
          <p className="modal__lead">Positive credits the account; negative debits it.</p>
          <Field id="adj-user" label="User ID">
            <input
              value={adjust.user_id}
              onChange={(e) => setAdjust((prev) => ({ ...prev, user_id: e.target.value }))}
              placeholder="UUID"
            />
          </Field>
          <div className="ops-form__row">
            <Field id="adj-code" label="Account">
              <select
                value={adjust.account_code}
                onChange={(e) => setAdjust((prev) => ({ ...prev, account_code: e.target.value }))}
              >
                <option value="wallet_spendable">wallet_spendable</option>
                <option value="pending_earnings">pending_earnings</option>
                <option value="available_earnings">available_earnings</option>
              </select>
            </Field>
            <Field id="adj-amount" label="Amount (coins)">
              <input
                type="number"
                value={adjust.amount}
                onChange={(e) => setAdjust((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </Field>
          </div>
          <Field id="adj-reason" label="Reason">
            <input
              value={adjust.reason}
              onChange={(e) => setAdjust((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Support credit / clawback…"
            />
          </Field>
          <div className="modal__actions">
            <button type="button" className="modal__btn modal__btn--ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="modal__btn" onClick={onAdjust} disabled={saving}>
              {saving ? "Posting…" : "Post adjustment"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
