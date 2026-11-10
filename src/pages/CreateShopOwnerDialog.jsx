import { useRef, useState } from "react";
import { api } from "../auth.js";
import Modal, { Field } from "../components/Modal.jsx";

const EMPTY = { full_name: "", email: "", phone: "", password: "" };
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join("");
}

function validate(values) {
  const errors = {};
  if (!values.full_name.trim()) errors.full_name = "Enter the owner's full name.";
  if (!values.email.trim()) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  const digits = values.phone.replace(/\D/g, "");
  if (!values.phone.trim()) errors.phone = "Enter a phone number.";
  else if (digits.length < 9 || digits.length > 15) errors.phone = "Enter a valid phone number.";
  if (!values.password) errors.password = "Set a password.";
  else if (values.password.length < 6) errors.password = "Use at least 6 characters.";
  return errors;
}

export default function CreateShopOwnerDialog({ token, onClose, onCreated }) {
  const firstFieldRef = useRef(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const setField = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (submitted) setErrors(validate(next));
    if (serverError) setServerError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setServerError("");
    try {
      const user = await api("/api/users/shop-owners", {
        token,
        method: "POST",
        body: {
          full_name: values.full_name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
        },
      });
      setCreated({ user, password: values.password });
      onCreated(user);
    } catch (error) {
      setServerError(error.message);
      if (error.status === 409) setErrors((prev) => ({ ...prev, email: "This email is already in use." }));
    } finally {
      setSubmitting(false);
    }
  };

  const copyDetails = async () => {
    const text = [
      "Your Kabi shop owner account",
      `Name: ${created.user.full_name}`,
      `Email: ${created.user.email}`,
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
    setValues(EMPTY);
    setErrors({});
    setSubmitted(false);
    setShowPassword(false);
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  return (
    <Modal
      labelledBy="create-owner-title"
      onClose={onClose}
      busy={submitting}
      initialFocusRef={firstFieldRef}
      size="wide"
      fit
    >
      {(requestClose) =>
        created ? (
          <div className="modal__success">
            <span className="modal__success-icon">
              <CheckIcon />
            </span>
            <h2 id="create-owner-title" className="modal__title">
              Account <em>created</em>
            </h2>
            <p className="modal__subtitle">
              Share these sign-in details with {created.user.full_name.split(" ")[0]}. The password won't be shown again.
            </p>

            <dl className="credentials">
              <div>
                <dt>Name</dt>
                <dd>{created.user.full_name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{created.user.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{created.user.phone}</dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd className="credentials__secret">{created.password}</dd>
              </div>
            </dl>

            <button type="button" className={`modal__copy${copied ? " is-copied" : ""}`} onClick={copyDetails}>
              {copied ? <CheckIcon /> : <CopyIcon />}
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
              <span className="modal__icon">
                <StoreIcon />
              </span>
              <div>
                <h2 id="create-owner-title" className="modal__title">
                  New shop <em>owner</em>
                </h2>
                <p className="modal__subtitle">Create an account a vendor can use to run their shop on Kabi.</p>
              </div>
            </header>

            {serverError && (
              <div className="modal__alert" role="alert">
                <AlertIcon />
                <span>{serverError}</span>
              </div>
            )}

            <div className="modal__fields">
              <Field id="owner-name" label="Full name" error={errors.full_name} icon={<PersonIcon />}>
                <input
                  ref={firstFieldRef}
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Amina Wanjiru"
                  value={values.full_name}
                  onChange={(event) => setField("full_name", event.target.value)}
                />
              </Field>

              <Field id="owner-email" label="Email address" error={errors.email} icon={<MailIcon />}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="owner@shop.co.ke"
                  value={values.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </Field>

              <Field id="owner-phone" label="Phone number" error={errors.phone} icon={<PhoneIcon />}>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="0712 345 678"
                  value={values.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </Field>

              <Field
                id="owner-password"
                label="Temporary password"
                error={errors.password}
                icon={<LockIcon />}
                labelAction={
                  <button
                    type="button"
                    className="modal__link"
                    onClick={() => {
                      setField("password", generatePassword());
                      setShowPassword(true);
                    }}
                  >
                    <SparkIcon /> Generate
                  </button>
                }
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
              >
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  spellCheck={false}
                  placeholder="At least 6 characters"
                  value={values.password}
                  onChange={(event) => setField("password", event.target.value)}
                />
              </Field>
            </div>

            <div className="modal__actions">
              <button type="button" className="modal__btn modal__btn--ghost" onClick={requestClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="modal__btn modal__btn--primary" disabled={submitting}>
                {submitting ? <span className="modal__spinner" aria-hidden="true" /> : <PlusIcon />}
                {submitting ? "Creating…" : "Create account"}
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

function CheckIcon() {
  return (
    <svg {...svgProps} strokeWidth={2.2}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...svgProps}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...svgProps} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
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

function StoreIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 9.5 5.5 4h13L20 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
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

function LockIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg {...svgProps} width={14} height={14}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...svgProps}>
      <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.6 3.5M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 19 12 19a9.4 9.4 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}
