import { useEffect, useRef, useState } from "react";
import { api } from "../auth.js";
import Avatar from "../components/Avatar.jsx";
import Modal, { Field } from "../components/Modal.jsx";
import { ROLE_LABELS } from "../utils/format.js";
import "./UserDialogs.css";

function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? "" : current)), 1600);
    } catch {
      setCopied("");
    }
  };
  return [copied, copy];
}

function UserBadges({ user, me }) {
  return (
    <div className="ud-badges">
      <span className="ud-badge ud-badge--role">{ROLE_LABELS[user.role] ?? user.role}</span>
      <span className={`ud-badge ${user.is_active ? "ud-badge--on" : "ud-badge--off"}`}>
        {user.is_active ? "Active" : "Inactive"}
      </span>
      {user.id === me.id && <span className="ud-badge ud-badge--you">You</span>}
    </div>
  );
}

export function ViewUserDialog({ user: initialUser, token, me, onClose, onEdit }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, copy] = useCopy();

  useEffect(() => {
    let cancelled = false;
    api(`/api/users/${initialUser.id}`, { token })
      .then((fresh) => !cancelled && setUser(fresh))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [initialUser.id, token]);

  const rows = [
    { label: "Full name", value: user.full_name },
    {
      label: "Email",
      value: <a href={`mailto:${user.email}`}>{user.email}</a>,
      copy: user.email,
    },
    {
      label: "Phone",
      value: user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : "—",
      copy: user.phone || null,
    },
    { label: "Role", value: ROLE_LABELS[user.role] ?? user.role },
    { label: "Status", value: user.is_active ? "Active" : "Inactive" },
  ];

  return (
    <Modal labelledBy="view-user-title" onClose={onClose}>
      <div className="ud">
        <header className="ud-hero">
          <Avatar user={user} size="xl" />
          <div className="ud-hero__text">
            <h2 id="view-user-title" className="modal__title">
              {user.full_name}
            </h2>
            <p className="ud-hero__email">{user.email}</p>
            <UserBadges user={user} me={me} />
          </div>
        </header>

        {error && (
          <div className="modal__alert" role="alert">
            <span>Couldn't refresh these details: {error}</span>
          </div>
        )}

        <dl className={`ud-details${loading ? " is-loading" : ""}`}>
          {rows.map((row) => (
            <div key={row.label} className="ud-details__row">
              <dt>{row.label}</dt>
              <dd>
                <span className="ud-details__value">{row.value}</span>
                {row.copy && (
                  <button
                    type="button"
                    className={`ud-copy${copied === row.label ? " is-copied" : ""}`}
                    onClick={() => copy(row.label, row.copy)}
                    aria-label={copied === row.label ? `${row.label} copied` : `Copy ${row.label.toLowerCase()}`}
                    title={copied === row.label ? "Copied" : "Copy"}
                  >
                    {copied === row.label ? <CheckIcon /> : <CopyIcon />}
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="modal__actions">
          <button type="button" className="modal__btn modal__btn--primary" onClick={() => onEdit(user)}>
            <PencilIcon /> Edit details
          </button>
        </div>
      </div>
    </Modal>
  );
}

function validate(values) {
  const errors = {};
  if (!values.full_name.trim()) errors.full_name = "Enter a full name.";
  if (!values.email.trim()) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  const digits = values.phone.replace(/\D/g, "");
  if (!values.phone.trim()) errors.phone = "Enter a phone number.";
  else if (digits.length < 9 || digits.length > 15) errors.phone = "Enter a valid phone number.";
  return errors;
}

export function EditUserDialog({ user, token, me, onClose, onSaved }) {
  const firstFieldRef = useRef(null);
  const initial = {
    full_name: user.full_name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    is_active: Boolean(user.is_active),
  };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const isSelf = user.id === me.id;

  const changes = {};
  if (values.full_name.trim() !== initial.full_name) changes.full_name = values.full_name.trim();
  if (values.email.trim().toLowerCase() !== initial.email.toLowerCase()) changes.email = values.email.trim();
  if (values.phone.trim() !== initial.phone) changes.phone = values.phone.trim();
  if (values.is_active !== initial.is_active) changes.is_active = values.is_active;
  const dirty = Object.keys(changes).length > 0;

  const setField = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (submitted) setErrors(validate(next));
    if (serverError) setServerError("");
  };

  const onSubmit = async (event, close) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length || !dirty) return;

    setSaving(true);
    setServerError("");
    try {
      const updated = await api(`/api/users/${user.id}`, { token, method: "PUT", body: changes });
      onSaved(updated);
      setSaving(false);
      close();
    } catch (error) {
      setSaving(false);
      setServerError(error.message);
      if (error.status === 409) setErrors((prev) => ({ ...prev, email: "This email is already in use." }));
    }
  };

  return (
    <Modal labelledBy="edit-user-title" onClose={onClose} busy={saving} initialFocusRef={firstFieldRef}>
      {(close) => (
        <form onSubmit={(event) => onSubmit(event, close)} noValidate>
          <header className="modal__head">
            <Avatar user={{ ...user, full_name: values.full_name || user.full_name }} size="lg" />
            <div>
              <h2 id="edit-user-title" className="modal__title">
                Edit <em>details</em>
              </h2>
              <p className="modal__subtitle">
                {isSelf ? "Update your own super admin profile." : `Update ${user.full_name.split(" ")[0]}'s account details.`}
              </p>
            </div>
          </header>

          {serverError && (
            <div className="modal__alert" role="alert">
              <AlertIcon />
              <span>{serverError}</span>
            </div>
          )}

          <div className="modal__fields">
            <Field id="edit-name" label="Full name" error={errors.full_name} icon={<PersonIcon />}>
              <input
                ref={firstFieldRef}
                type="text"
                autoComplete="off"
                value={values.full_name}
                onChange={(event) => setField("full_name", event.target.value)}
              />
            </Field>

            <Field id="edit-email" label="Email address" error={errors.email} icon={<MailIcon />}>
              <input
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </Field>

            <Field id="edit-phone" label="Phone number" error={errors.phone} icon={<PhoneIcon />}>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={values.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </Field>

            <div className={`ud-switch${isSelf ? " is-locked" : ""}`}>
              <div className="ud-switch__text">
                <span className="ud-switch__label" id="edit-active-label">
                  Account active
                </span>
                <span className="ud-switch__hint" id="edit-active-hint">
                  {isSelf
                    ? "You can't deactivate your own account."
                    : values.is_active
                      ? "This person can sign in."
                      : "This person is blocked from signing in."}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                className="ud-switch__control"
                aria-checked={values.is_active}
                aria-labelledby="edit-active-label"
                aria-describedby="edit-active-hint"
                disabled={isSelf}
                onClick={() => setField("is_active", !values.is_active)}
              >
                <span className="ud-switch__thumb" />
              </button>
            </div>
          </div>

          <div className="modal__actions">
            <button type="button" className="modal__btn modal__btn--ghost" onClick={close} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="modal__btn modal__btn--primary" disabled={saving || !dirty}>
              {saving ? <span className="modal__spinner" aria-hidden="true" /> : <CheckIcon />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function EyeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...svgProps} strokeWidth={2.2}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...svgProps}>
      <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />
    </svg>
  );
}
