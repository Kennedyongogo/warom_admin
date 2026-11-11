import { useRef, useState } from "react";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";
import { ROLE_LABELS } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";

const ADMIN_ROLES = [
  { id: "superadmin", label: "Superadmin" },
  { id: "moderator", label: "Moderator" },
  { id: "finance", label: "Finance" },
  { id: "support", label: "Support" },
];

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join("");
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Enter a full name.";
  if (!values.email.trim()) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  const digits = values.phone.replace(/\D/g, "");
  if (!values.phone.trim()) errors.phone = "Enter a phone number.";
  else if (digits.length < 9 || digits.length > 15) errors.phone = "Enter a valid phone number.";
  if (!values.role) errors.role = "Choose a role.";
  if (!values.password) errors.password = "Set a password.";
  else if (values.password.length < 6) errors.password = "Use at least 6 characters.";
  return errors;
}

export default function CreateAdminDialog({
  token,
  defaultRole = "moderator",
  lockRole = false,
  onClose,
  onCreated,
}) {
  const firstFieldRef = useRef(null);
  const selectedRole = ADMIN_ROLES.some((role) => role.id === defaultRole) ? defaultRole : "moderator";
  const roleLabel = ROLE_LABELS[selectedRole] || selectedRole;
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    role: selectedRole,
    password: generatePassword(),
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const setField = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (submitted) setErrors(validate(next));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const admin = await api("/api/admin/admins", {
        token,
        method: "POST",
        body: {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          role: lockRole ? selectedRole : values.role,
          password: values.password,
        },
      });
      setCreated({ admin, password: values.password });
      onCreated?.(admin);
      await showSuccess(
        `${roleLabel} created`,
        `${admin.full_name || admin.name} was added as ${ROLE_LABELS[admin.role] || admin.role}.`
      );
    } catch (error) {
      await showError("Couldn't create admin", error.message || "Please try again.");
      if (error.status === 409) setErrors((prev) => ({ ...prev, email: "This email is already in use." }));
    } finally {
      setSubmitting(false);
    }
  };

  const copyDetails = async () => {
    const text = [
      "Your WAROM admin account",
      `Name: ${created.admin.full_name || created.admin.name}`,
      `Email: ${created.admin.email}`,
      `Role: ${ROLE_LABELS[created.admin.role] || created.admin.role}`,
      `Password: ${created.password}`,
      "Please change your password after your first sign in.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const startAnother = () => {
    setCreated(null);
    setValues({
      name: "",
      email: "",
      phone: "",
      role: selectedRole,
      password: generatePassword(),
    });
    setErrors({});
    setSubmitted(false);
    setShowPassword(false);
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  return (
    <Modal
      labelledBy="create-admin-title"
      onClose={onClose}
      busy={submitting}
      initialFocusRef={firstFieldRef}
      size="wide"
      fit
    >
      {(requestClose) =>
        created ? (
          <div className="modal__success">
            <span className="modal__success-icon" aria-hidden="true">
              <CheckIcon />
            </span>
            <h2 id="create-admin-title" className="modal__title">
              Account <em>created</em>
            </h2>
            <p className="modal__subtitle">
              Share these sign-in details with {(created.admin.full_name || created.admin.name || "them").split(" ")[0]}.
              The password won’t be shown again.
            </p>

            <dl className="credentials">
              <div>
                <dt>Name</dt>
                <dd>{created.admin.full_name || created.admin.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{created.admin.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{ROLE_LABELS[created.admin.role] || created.admin.role}</dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd className="credentials__secret">{created.password}</dd>
              </div>
            </dl>

            <button type="button" className={`modal__copy${copied ? " is-copied" : ""}`} onClick={copyDetails}>
              {copied ? "Copied to clipboard" : "Copy sign-in details"}
            </button>

            <div className="modal__actions">
              <button type="button" className="modal__btn modal__btn--ghost" onClick={startAnother}>
                Create another
              </button>
              <button type="button" className="modal__btn modal__btn--primary" onClick={requestClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <header className="modal__head">
              <div>
                <h2 id="create-admin-title" className="modal__title">
                  Create <em>{roleLabel}</em>
                </h2>
                <p className="modal__subtitle">
                  {lockRole
                    ? `Add a new ${roleLabel.toLowerCase()} account for the WAROM admin console.`
                    : "Only superadmins can add Superadmin, Moderator, Finance or Support accounts."}
                </p>
              </div>
            </header>

            <div className="modal__fields">
              <Field id="create-admin-name" label="Full name" error={errors.name} icon={<PersonIcon />}>
                <input
                  ref={firstFieldRef}
                  type="text"
                  autoComplete="off"
                  value={values.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Warom Admin"
                />
              </Field>

              <Field id="create-admin-email" label="Email address" error={errors.email} icon={<MailIcon />}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  value={values.email}
                  onChange={(event) => setField("email", event.target.value)}
                  placeholder="admin@warom.app"
                />
              </Field>

              <Field id="create-admin-phone" label="Phone number" error={errors.phone} icon={<PhoneIcon />}>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={values.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  placeholder="0798757460"
                />
              </Field>

              <Field id="create-admin-role" label="Role" error={errors.role} icon={<ShieldIcon />}>
                {lockRole ? (
                  <input type="text" value={roleLabel} readOnly aria-readonly="true" />
                ) : (
                  <select value={values.role} onChange={(event) => setField("role", event.target.value)}>
                    {ADMIN_ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field
                id="create-admin-password"
                label="Temporary password"
                error={errors.password}
                icon={<LockIcon />}
                trailing={
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
                labelAction={
                  <button
                    type="button"
                    className="modal__link"
                    onClick={() => {
                      setField("password", generatePassword());
                      setShowPassword(true);
                    }}
                  >
                    Generate
                  </button>
                }
              >
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  spellCheck={false}
                  value={values.password}
                  onChange={(event) => setField("password", event.target.value)}
                  placeholder="At least 6 characters"
                />
              </Field>
            </div>

            <div className="modal__actions">
              <button type="button" className="modal__btn modal__btn--ghost" onClick={requestClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="modal__btn modal__btn--primary" disabled={submitting}>
                {submitting ? "Creating…" : `Create ${roleLabel}`}
              </button>
            </div>
          </form>
        )
      }
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
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...svgProps}>
      <path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5L16 12l4 1.5V17a2 2 0 0 1-2 2A14 14 0 0 1 5 5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...svgProps}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...svgProps}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...svgProps} width={28} height={28} strokeWidth={2.2}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </svg>
  );
}
