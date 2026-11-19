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

const AUDIENCES = [
  { id: "user", label: "Single user" },
  { id: "users", label: "All users" },
  { id: "chatters", label: "All chatters" },
  { id: "all", label: "Everyone" },
];

export default function Notifications() {
  const { token } = useOutletContext();
  const [form, setForm] = useState({
    audience: "user",
    user_id: "",
    title: "",
    body: "",
    type: "system",
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      await showError("Missing fields", "Title is required.");
      return;
    }
    if (form.audience === "user" && !form.user_id.trim()) {
      await showError("Missing fields", "User ID is required for a single-user send.");
      return;
    }
    setSaving(true);
    try {
      const result = await api("/api/admin/notifications/broadcast", {
        token,
        method: "POST",
        body: {
          audience: form.audience,
          user_id: form.audience === "user" ? form.user_id.trim() : undefined,
          title: form.title.trim(),
          body: form.body.trim() || null,
          type: form.type,
        },
      });
      setSaving(false);
      setForm((prev) => ({ ...prev, title: "", body: "" }));
      await showSuccess(
        "Notification sent",
        `Delivered to ${result?.sent ?? 1} recipient(s).`
      );
    } catch (err) {
      setSaving(false);
      await showError("Couldn't send", err.message || "Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Notifications</h1>
        <p className="page__subtitle">Broadcast system notices to one user, all users, chatters, or everyone.</p>
      </header>

      <div className="ops-card ops-card--form ops-card--form-wide">
        <form className="ops-form" onSubmit={onSubmit}>
          <Field id="notify-audience" label="Audience">
            <select
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
            >
              {AUDIENCES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          {form.audience === "user" && (
            <Field id="notify-user" label="User ID" hint="UUID of the app user or chatter">
              <input
                value={form.user_id}
                onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </Field>
          )}
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
            Audience broadcasts are capped at 5,000 active accounts per send.
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
