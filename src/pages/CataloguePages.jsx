import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { numberFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

function CatalogPage({
  title,
  subtitle,
  listPath,
  createPath,
  patchPath,
  columns,
  emptyLabel,
  toForm,
  fromForm,
  FormFields,
  validate,
}) {
  const { token } = useOutletContext();
  const { status, rows, error, reload } = useAdminList(listPath, token);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => setEditing({ mode: "create", values: toForm(null) });
  const openEdit = (row) => setEditing({ mode: "edit", id: row.id, values: toForm(row) });

  const onSave = async (close) => {
    const issues = validate?.(editing.values) || {};
    if (Object.keys(issues).length) {
      setEditing((prev) => ({ ...prev, errors: issues }));
      return;
    }
    setSaving(true);
    try {
      const body = fromForm(editing.values);
      if (editing.mode === "create") {
        await api(createPath, { token, method: "POST", body });
        await showSuccess("Created", `${title.slice(0, -1) || "Item"} saved.`);
      } else {
        await api(`${patchPath}/${editing.id}`, { token, method: "PATCH", body });
        await showSuccess("Updated", "Changes saved.");
      }
      setSaving(false);
      close();
      setEditing(null);
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
            <h1 className="page__title">{title}</h1>
            <p className="page__subtitle">{subtitle}</p>
          </div>
          <button type="button" className="ops-btn" onClick={openCreate}>
            Add new
          </button>
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">{emptyLabel}</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key} data-label={col.label}>
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                  <td className="ops-actions-cell" data-label="Actions">
                    <div className="ops-actions">
                      <button type="button" className="ops-btn ops-btn--ghost ops-btn--sm" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          labelledBy="catalog-title"
          onClose={() => !saving && setEditing(null)}
          busy={saving}
          size="wide"
          fit
        >
          {(close) => (
            <form
              className="ops-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(close);
              }}
            >
              <h2 id="catalog-title" className="modal__title">
                {editing.mode === "create" ? `Add ${title.replace(/s$/, "")}` : `Edit ${title.replace(/s$/, "")}`}
              </h2>
              <FormFields
                values={editing.values}
                errors={editing.errors || {}}
                onChange={(next) => setEditing((prev) => ({ ...prev, values: { ...prev.values, ...next }, errors: {} }))}
              />
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

function ActiveBadge({ active }) {
  return <span className={`ops-badge ops-badge--${active ? "good" : "muted"}`}>{active ? "Active" : "Off"}</span>;
}

function CoinFields({ values, errors, onChange }) {
  return (
    <>
      <div className="ops-form__row">
        <Field id="coin-name" label="Name" error={errors.name}>
          <input value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field id="coin-currency" label="Currency">
          <input value={values.currency} onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })} />
        </Field>
      </div>
      <div className="ops-form__row">
        <Field id="coin-coins" label="Coins" error={errors.coins}>
          <input type="number" min="1" value={values.coins} onChange={(e) => onChange({ coins: e.target.value })} />
        </Field>
        <Field id="coin-bonus" label="Bonus coins">
          <input type="number" min="0" value={values.bonus_coins} onChange={(e) => onChange({ bonus_coins: e.target.value })} />
        </Field>
      </div>
      <div className="ops-form__row">
        <Field id="coin-price" label="Price" error={errors.price_amount}>
          <input type="number" min="0" step="0.01" value={values.price_amount} onChange={(e) => onChange({ price_amount: e.target.value })} />
        </Field>
        <Field id="coin-sort" label="Sort order">
          <input type="number" value={values.sort_order} onChange={(e) => onChange({ sort_order: e.target.value })} />
        </Field>
      </div>
      <label className="ops-check">
        <input type="checkbox" checked={values.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
        Active package
      </label>
    </>
  );
}

export function CoinsPage() {
  return (
    <CatalogPage
      title="Coin packages"
      subtitle="Packages users buy to top up their wallet."
      listPath="/api/admin/coin-packages"
      createPath="/api/admin/coin-packages"
      patchPath="/api/admin/coin-packages"
      emptyLabel="No coin packages yet."
      columns={[
        { key: "name", label: "Name" },
        { key: "coins", label: "Coins", render: (row) => numberFmt.format(row.coins) },
        { key: "bonus_coins", label: "Bonus", render: (row) => numberFmt.format(row.bonus_coins || 0) },
        {
          key: "price_amount",
          label: "Price",
          render: (row) => `${numberFmt.format(Number(row.price_amount))} ${row.currency || "KES"}`,
        },
        { key: "is_active", label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      toForm={(row) => ({
        name: row?.name || "",
        coins: row?.coins ?? 100,
        bonus_coins: row?.bonus_coins ?? 0,
        price_amount: row?.price_amount ?? 100,
        currency: row?.currency || "KES",
        sort_order: row?.sort_order ?? 0,
        is_active: row?.is_active ?? true,
      })}
      fromForm={(v) => ({
        name: v.name.trim(),
        coins: Number(v.coins),
        bonus_coins: Number(v.bonus_coins) || 0,
        price_amount: Number(v.price_amount),
        currency: (v.currency || "KES").trim().toUpperCase(),
        sort_order: Number(v.sort_order) || 0,
        is_active: Boolean(v.is_active),
      })}
      validate={(v) => {
        const errors = {};
        if (!v.name?.trim()) errors.name = "Name is required";
        if (!(Number(v.coins) > 0)) errors.coins = "Coins must be > 0";
        if (!(Number(v.price_amount) >= 0)) errors.price_amount = "Enter a valid price";
        return errors;
      }}
      FormFields={CoinFields}
    />
  );
}

function VipFields({ values, errors, onChange }) {
  return (
    <>
      <div className="ops-form__row">
        <Field id="vip-name" label="Name" error={errors.name}>
          <input value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field id="vip-days" label="Duration (days)" error={errors.duration_days}>
          <input type="number" min="1" value={values.duration_days} onChange={(e) => onChange({ duration_days: e.target.value })} />
        </Field>
      </div>
      <div className="ops-form__row">
        <Field id="vip-coins" label="Price in coins">
          <input type="number" min="0" value={values.price_coins} onChange={(e) => onChange({ price_coins: e.target.value })} />
        </Field>
        <Field id="vip-amount" label="Price amount">
          <input type="number" min="0" step="0.01" value={values.price_amount} onChange={(e) => onChange({ price_amount: e.target.value })} />
        </Field>
      </div>
      <div className="ops-form__row">
        <Field id="vip-currency" label="Currency">
          <input value={values.currency} onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })} />
        </Field>
        <Field id="vip-sort" label="Sort order">
          <input type="number" value={values.sort_order} onChange={(e) => onChange({ sort_order: e.target.value })} />
        </Field>
      </div>
      <Field id="vip-benefits" label="Benefits" hint="One benefit per line">
        <textarea
          rows={4}
          value={values.benefitsText}
          onChange={(e) => onChange({ benefitsText: e.target.value })}
          style={{ width: "100%", border: 0, background: "transparent", font: "inherit", resize: "vertical" }}
        />
      </Field>
      <label className="ops-check">
        <input type="checkbox" checked={values.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
        Active plan
      </label>
    </>
  );
}

export function VipPage() {
  return (
    <CatalogPage
      title="VIP plans"
      subtitle="Subscription plans that boost visibility and perks."
      listPath="/api/admin/vip-plans"
      createPath="/api/admin/vip-plans"
      patchPath="/api/admin/vip-plans"
      emptyLabel="No VIP plans yet."
      columns={[
        { key: "name", label: "Name" },
        { key: "duration_days", label: "Days", render: (row) => `${row.duration_days}d` },
        {
          key: "price",
          label: "Price",
          render: (row) =>
            row.price_coins
              ? `${numberFmt.format(row.price_coins)} coins`
              : row.price_amount
                ? `${numberFmt.format(Number(row.price_amount))} ${row.currency || "KES"}`
                : "—",
        },
        {
          key: "benefits",
          label: "Benefits",
          render: (row) => (Array.isArray(row.benefits) ? row.benefits.slice(0, 2).join(" · ") : "—"),
        },
        { key: "is_active", label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      toForm={(row) => ({
        name: row?.name || "",
        duration_days: row?.duration_days ?? 30,
        price_coins: row?.price_coins ?? "",
        price_amount: row?.price_amount ?? "",
        currency: row?.currency || "KES",
        benefitsText: Array.isArray(row?.benefits) ? row.benefits.join("\n") : "",
        sort_order: row?.sort_order ?? 0,
        is_active: row?.is_active ?? true,
      })}
      fromForm={(v) => ({
        name: v.name.trim(),
        duration_days: Number(v.duration_days),
        price_coins: v.price_coins === "" ? null : Number(v.price_coins),
        price_amount: v.price_amount === "" ? null : Number(v.price_amount),
        currency: (v.currency || "KES").trim().toUpperCase(),
        benefits: String(v.benefitsText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        sort_order: Number(v.sort_order) || 0,
        is_active: Boolean(v.is_active),
      })}
      validate={(v) => {
        const errors = {};
        if (!v.name?.trim()) errors.name = "Name is required";
        if (!(Number(v.duration_days) > 0)) errors.duration_days = "Duration must be > 0";
        return errors;
      }}
      FormFields={VipFields}
    />
  );
}

function GiftFields({ values, errors, onChange }) {
  return (
    <>
      <div className="ops-form__row">
        <Field id="gift-name" label="Name" error={errors.name}>
          <input value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field id="gift-coins" label="Coin value" error={errors.coin_value}>
          <input type="number" min="1" value={values.coin_value} onChange={(e) => onChange({ coin_value: e.target.value })} />
        </Field>
      </div>
      <Field id="gift-desc" label="Description">
        <input value={values.description} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>
      <div className="ops-form__row">
        <Field id="gift-image" label="Image URL">
          <input value={values.image_url} onChange={(e) => onChange({ image_url: e.target.value })} />
        </Field>
        <Field id="gift-sort" label="Sort order">
          <input type="number" value={values.sort_order} onChange={(e) => onChange({ sort_order: e.target.value })} />
        </Field>
      </div>
      <label className="ops-check">
        <input type="checkbox" checked={values.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
        Active gift
      </label>
    </>
  );
}

export function GiftsPage() {
  return (
    <CatalogPage
      title="Gifts"
      subtitle="Virtual gifts users send; coin value feeds chatter earnings."
      listPath="/api/admin/gifts"
      createPath="/api/admin/gifts"
      patchPath="/api/admin/gifts"
      emptyLabel="No gifts yet."
      columns={[
        { key: "name", label: "Name" },
        { key: "coin_value", label: "Coins", render: (row) => numberFmt.format(row.coin_value) },
        { key: "description", label: "Description", render: (row) => row.description || "—" },
        { key: "is_active", label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      toForm={(row) => ({
        name: row?.name || "",
        description: row?.description || "",
        image_url: row?.image_url || "",
        coin_value: row?.coin_value ?? 10,
        sort_order: row?.sort_order ?? 0,
        is_active: row?.is_active ?? true,
      })}
      fromForm={(v) => ({
        name: v.name.trim(),
        description: v.description.trim() || null,
        image_url: v.image_url.trim() || null,
        coin_value: Number(v.coin_value),
        sort_order: Number(v.sort_order) || 0,
        is_active: Boolean(v.is_active),
      })}
      validate={(v) => {
        const errors = {};
        if (!v.name?.trim()) errors.name = "Name is required";
        if (!(Number(v.coin_value) > 0)) errors.coin_value = "Coin value must be > 0";
        return errors;
      }}
      FormFields={GiftFields}
    />
  );
}
