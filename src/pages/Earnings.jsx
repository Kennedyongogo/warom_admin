import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { numberFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

const TYPES = [
  { id: "messaging", label: "Messaging" },
  { id: "photo_unlock", label: "Photo unlock" },
  { id: "gift", label: "Gift" },
  { id: "voice_call", label: "Voice call" },
  { id: "video_call", label: "Video call" },
  { id: "vip_share", label: "VIP share" },
];

const TYPE_LABEL = Object.fromEntries(TYPES.map((item) => [item.id, item.label]));

export default function Earnings() {
  const { token } = useOutletContext();
  const { status, rows, error, reload } = useAdminList("/api/admin/earnings-configs", token);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const existing = new Set(rows.map((row) => row.transaction_type));
  const missing = TYPES.filter((type) => !existing.has(type.id));

  const openEdit = (row) =>
    setEditing({
      transaction_type: row.transaction_type,
      chatter_share_percent: String(row.chatter_share_percent ?? 70),
      platform_share_percent: String(row.platform_share_percent ?? 30),
      pending_hold_days: String(row.pending_hold_days ?? 7),
      is_active: row.is_active ?? true,
    });

  const openCreate = (type) =>
    setEditing({
      transaction_type: type,
      chatter_share_percent: "70",
      platform_share_percent: "30",
      pending_hold_days: "7",
      is_active: true,
    });

  const onSave = async (close) => {
    const chatter = Number(editing.chatter_share_percent);
    const platform = Number(editing.platform_share_percent);
    if (!(chatter >= 0) || !(platform >= 0) || Math.round(chatter + platform) !== 100) {
      await showError("Invalid split", "Chatter + platform shares must add up to 100.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/admin/earnings-configs", {
        token,
        method: "POST",
        body: {
          transaction_type: editing.transaction_type,
          chatter_share_percent: chatter,
          platform_share_percent: platform,
          pending_hold_days: Number(editing.pending_hold_days) || 7,
          is_active: Boolean(editing.is_active),
        },
      });
      setSaving(false);
      close();
      setEditing(null);
      await showSuccess("Earnings saved", "Split configuration updated.");
      reload();
    } catch (err) {
      setSaving(false);
      await showError("Couldn't save", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <div className="ops-toolbar">
          <div>
            <h1 className="page__title">Earnings</h1>
            <p className="page__subtitle">Chatter vs platform split for each paid interaction type.</p>
          </div>
          {missing.length > 0 && (
            <div className="ops-toolbar__filters">
              {missing.map((type) => (
                <button key={type.id} type="button" className="ops-btn ops-btn--ghost ops-btn--sm" onClick={() => openCreate(type.id)}>
                  Add {type.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No earnings configs yet. Add a transaction type.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Chatter %</th>
                <th>Platform %</th>
                <th>Hold days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || row.transaction_type}>
                  <td data-label="Type">{TYPE_LABEL[row.transaction_type] || row.transaction_type}</td>
                  <td data-label="Chatter %">{numberFmt.format(Number(row.chatter_share_percent))}%</td>
                  <td data-label="Platform %">{numberFmt.format(Number(row.platform_share_percent))}%</td>
                  <td data-label="Hold days">{row.pending_hold_days}</td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${row.is_active ? "good" : "muted"}`}>
                      {row.is_active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="ops-actions-cell" data-label="Actions">
                    <button type="button" className="ops-btn ops-btn--ghost ops-btn--sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal labelledBy="earnings-title" onClose={() => !saving && setEditing(null)} busy={saving} fit>
          {(close) => (
            <form
              className="ops-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(close);
              }}
            >
              <h2 id="earnings-title" className="modal__title">
                {TYPE_LABEL[editing.transaction_type] || editing.transaction_type}
              </h2>
              <div className="ops-form__row">
                <Field id="earn-chatter" label="Chatter share %">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editing.chatter_share_percent}
                    onChange={(e) => {
                      const chatter = e.target.value;
                      const platform = Math.max(0, 100 - Number(chatter || 0));
                      setEditing((prev) => ({
                        ...prev,
                        chatter_share_percent: chatter,
                        platform_share_percent: String(platform),
                      }));
                    }}
                  />
                </Field>
                <Field id="earn-platform" label="Platform share %">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editing.platform_share_percent}
                    onChange={(e) => {
                      const platform = e.target.value;
                      const chatter = Math.max(0, 100 - Number(platform || 0));
                      setEditing((prev) => ({
                        ...prev,
                        platform_share_percent: platform,
                        chatter_share_percent: String(chatter),
                      }));
                    }}
                  />
                </Field>
              </div>
              <Field id="earn-hold" label="Pending hold days">
                <input
                  type="number"
                  min="0"
                  value={editing.pending_hold_days}
                  onChange={(e) => setEditing((prev) => ({ ...prev, pending_hold_days: e.target.value }))}
                />
              </Field>
              <label className="ops-check">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Active
              </label>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="modal__btn modal__btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}
