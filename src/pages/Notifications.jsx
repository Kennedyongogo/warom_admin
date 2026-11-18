import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import { Field } from "../components/Modal.jsx";
import { showError, showSuccess } from "../utils/swal.js";
import "./pages.css";
import "./ops.css";

const TYPES = [
  "system",
  "new_match",
  "message",
  "call",
  "coin_purchase",
  "vip_expiry",
  "gift",
  "follow",
  "visit",
  "withdrawal",
  "report",
];

export default function Notifications() {
  const { token } = useOutletContext();
  const [form, setForm] = useState({
    user_id: "",
    title: "",
    body: "",
    type: "system",
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.user_id.trim() || !form.title.trim()) {
      await showError("Missing fields", "User ID and title are required.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/admin/notifications/broadcast", {
        token,
        method: "POST",
        body: {
          user_id: form.user_id.trim(),
          title: form.title.trim(),
          body: form.body.trim() || null,
          type: form.type,
        },
      });
      setSaving(false);
      setForm((prev) => ({ ...prev, title: "", body: "" }));
      await showSuccess("Notification sent", "The user will see it in-app.");
    } catch (err) {
      setSaving(false);
      await showError("Couldn't send", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Notifications</h1>
        <p className="page__subtitle">Send a system notification to a specific user or chatter.</p>
      </header>

      <div className="ops-card" style={{ padding: "1.1rem 1.15rem 1.25rem", maxWidth: 720 }}>
        <form className="ops-form" onSubmit={onSubmit}>
          <Field id="notify-user" label="User ID" hint="UUID of the app user or chatter">
            <input
              value={form.user_id}
              onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </Field>
          <div className="ops-form__row">
            <Field id="notify-type" label="Type">
              <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="notify-title" label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Short headline"
              />
            </Field>
          </div>
          <label className="inquiry-dialog__notes" htmlFor="notify-body" style={{ display: "grid", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.84rem", fontWeight: 650, color: "var(--ink-soft)" }}>Body</span>
            <textarea
              id="notify-body"
              rows={5}
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Optional message body"
              style={{
                width: "100%",
                padding: "0.85rem 0.95rem",
                border: "1.5px solid var(--line)",
                borderRadius: 14,
                font: "inherit",
                resize: "vertical",
              }}
            />
          </label>
          <p className="ops-note">
            Backend requires a target `user_id`. Broad fan-out can be added later when the API supports audience
            filters.
          </p>
          <div>
            <button type="submit" className="ops-btn" disabled={saving}>
              {saving ? "Sending…" : "Send notification"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
