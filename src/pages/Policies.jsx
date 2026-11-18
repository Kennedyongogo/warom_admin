import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { dateTimeFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function Policies() {
  const { token } = useOutletContext();
  const { status, rows, error, reload } = useAdminList("/api/admin/policies", token);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () =>
    setEditing({
      mode: "create",
      title: "",
      slug: "",
      body: "",
      version: "1.0",
      is_published: true,
    });

  const openEdit = (row) =>
    setEditing({
      mode: "edit",
      id: row.id,
      title: row.title || "",
      slug: row.slug || "",
      body: row.body || "",
      version: row.version || "1.0",
      is_published: row.is_published ?? true,
    });

  const onSave = async (close) => {
    if (!editing.title.trim() || !editing.slug.trim() || !editing.body.trim()) {
      await showError("Missing fields", "Title, slug, and body are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: editing.title.trim(),
        slug: editing.slug.trim(),
        body: editing.body,
        version: editing.version.trim() || "1.0",
        is_published: Boolean(editing.is_published),
        published_at: editing.is_published ? new Date().toISOString() : null,
      };
      if (editing.mode === "create") {
        await api("/api/admin/policies", { token, method: "POST", body });
      } else {
        await api(`/api/admin/policies/${editing.id}`, { token, method: "PATCH", body });
      }
      setSaving(false);
      close();
      setEditing(null);
      await showSuccess(editing.mode === "create" ? "Policy created" : "Policy updated", "Saved for the public site.");
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
            <h1 className="page__title">Policies</h1>
            <p className="page__subtitle">Privacy, terms, and other legal pages for warom_public.</p>
          </div>
          <button type="button" className="ops-btn" onClick={openCreate}>
            Add policy
          </button>
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No policies yet.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Version</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Title">
                    <strong>{row.title}</strong>
                  </td>
                  <td data-label="Slug">
                    <span className="ops-mono">{row.slug}</span>
                  </td>
                  <td data-label="Version">{row.version}</td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${row.is_published ? "good" : "muted"}`}>
                      {row.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td data-label="Updated">
                    {row.updated_at || row.updatedAt
                      ? dateTimeFmt.format(new Date(row.updated_at || row.updatedAt))
                      : "—"}
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
        <Modal labelledBy="policy-title" onClose={() => !saving && setEditing(null)} busy={saving} size="wide" fit>
          {(close) => (
            <form
              className="ops-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(close);
              }}
            >
              <h2 id="policy-title" className="modal__title">
                {editing.mode === "create" ? "Add policy" : "Edit policy"}
              </h2>
              <div className="ops-form__row">
                <Field id="policy-name" label="Title">
                  <input
                    value={editing.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setEditing((prev) => ({
                        ...prev,
                        title,
                        slug: prev.mode === "create" && !prev.slugTouched ? slugify(title) : prev.slug,
                      }));
                    }}
                  />
                </Field>
                <Field id="policy-slug" label="Slug">
                  <input
                    value={editing.slug}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, slug: slugify(e.target.value), slugTouched: true }))
                    }
                  />
                </Field>
              </div>
              <div className="ops-form__row">
                <Field id="policy-version" label="Version">
                  <input
                    value={editing.version}
                    onChange={(e) => setEditing((prev) => ({ ...prev, version: e.target.value }))}
                  />
                </Field>
                <label className="ops-check" style={{ alignSelf: "end", marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={editing.is_published}
                    onChange={(e) => setEditing((prev) => ({ ...prev, is_published: e.target.checked }))}
                  />
                  Published
                </label>
              </div>
              <label className="inquiry-dialog__notes" htmlFor="policy-body" style={{ display: "grid", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: 650, color: "var(--ink-soft)" }}>Body</span>
                <textarea
                  id="policy-body"
                  rows={12}
                  value={editing.body}
                  onChange={(e) => setEditing((prev) => ({ ...prev, body: e.target.value }))}
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
