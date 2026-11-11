import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import { showError, showSuccessThenLogout, showWarning } from "../utils/swal.js";
import "./pages.css";
import "./Settings.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Settings() {
  const { user, token, onUserUpdate, onSignOut } = useOutletContext();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState({});

  useEffect(() => {
    setProfile({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user?.name, user?.email, user?.phone]);

  const profileDirty = useMemo(() => {
    return (
      profile.name.trim() !== (user?.name || "") ||
      profile.email.trim().toLowerCase() !== (user?.email || "").toLowerCase() ||
      (profile.phone || "").trim() !== (user?.phone || "")
    );
  }, [profile, user]);

  const initials = useMemo(() => {
    const source = profile.name || profile.email || "A";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [profile.name, profile.email]);

  const updateProfileField = (field) => (event) => {
    setProfile((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updatePasswordField = (field) => (event) => {
    setPassword((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const touchPassword = (field) => () => {
    setPasswordTouched((prev) => ({ ...prev, [field]: true }));
  };

  const confirmMismatch =
    password.confirmPassword.length > 0 &&
    password.newPassword !== password.confirmPassword;
  const confirmMatch =
    password.confirmPassword.length > 0 &&
    password.newPassword.length > 0 &&
    password.newPassword === password.confirmPassword;
  const showConfirmError = passwordTouched.confirmPassword && confirmMismatch;

  const saveProfile = async (event) => {
    event.preventDefault();
    const name = profile.name.trim();
    const email = profile.email.trim().toLowerCase();
    const phone = profile.phone.trim();

    if (!name || !email) {
      await showWarning("Missing details", "Name and email are required.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      await showWarning("Check email", "That email doesn't look right.");
      return;
    }
    if (!profileDirty) {
      await showWarning("No changes", "Update a field before saving.");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await api("/api/admin/me", {
        method: "PATCH",
        token,
        body: { name, email, phone },
      });
      onUserUpdate(updated);
      await showSuccessThenLogout({
        title: "Profile updated",
        text: "Your account details were saved.",
        seconds: 5,
        onLogout: onSignOut,
      });
    } catch (error) {
      await showError("Couldn't update profile", error.message || "Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = password;
    setPasswordTouched({ currentPassword: true, newPassword: true, confirmPassword: true });

    if (!currentPassword || !newPassword || !confirmPassword) {
      await showWarning("Missing fields", "Fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      await showWarning("Weak password", "Use at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      await showWarning("Passwords don't match", "Confirm password must match your new password.");
      return;
    }
    if (currentPassword === newPassword) {
      await showWarning("Same password", "Choose a new password different from the current one.");
      return;
    }

    setSavingPassword(true);
    try {
      await api("/api/admin/me/password", {
        method: "PATCH",
        token,
        body: { currentPassword, newPassword },
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordTouched({});
      await showSuccessThenLogout({
        title: "Password changed",
        text: "Your new password is ready.",
        seconds: 5,
        onLogout: onSignOut,
      });
    } catch (error) {
      await showError("Couldn't change password", error.message || "Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="page settings">
      <div className="settings__hero">
        <div className="settings__avatar" aria-hidden="true">
          <span>{initials || "WA"}</span>
          <span className="settings__online" title="Signed in" />
        </div>
        <div className="settings__hero-copy">
          <div className="settings__hero-top">
            <p className="settings__eyebrow">
              <span className="settings__eyebrow-dot" aria-hidden="true" />
              Signed in
            </p>
            <span className="settings__role">{user?.role || "admin"}</span>
          </div>
          <h2>{user?.name || "Admin"}</h2>
          <p className="settings__email">{user?.email}</p>
        </div>
      </div>

      <div className="settings__grid">
        <form className="settings__card" onSubmit={saveProfile} noValidate>
          <header className="settings__card-head">
            <div>
              <h3>Account details</h3>
              <p>Update the name, email and phone on this admin account.</p>
            </div>
          </header>

          <div className="settings__fields">
            <Field label="Full name" htmlFor="settings-name">
              <input
                id="settings-name"
                type="text"
                autoComplete="name"
                value={profile.name}
                onChange={updateProfileField("name")}
                placeholder="Warom Admin"
              />
            </Field>

            <Field label="Email" htmlFor="settings-email">
              <input
                id="settings-email"
                type="email"
                autoComplete="email"
                value={profile.email}
                onChange={updateProfileField("email")}
                placeholder="you@warom.app"
              />
            </Field>

            <Field label="Phone" htmlFor="settings-phone">
              <input
                id="settings-phone"
                type="tel"
                autoComplete="tel"
                value={profile.phone}
                onChange={updateProfileField("phone")}
                placeholder="0798757460"
              />
            </Field>
          </div>

          <footer className="settings__card-foot">
            <p className="settings__note">
              After saving, you'll be signed out so the next login uses your new details.
            </p>
            <button type="submit" className="settings__btn" disabled={savingProfile || !profileDirty}>
              {savingProfile ? "Saving…" : "Save details"}
            </button>
          </footer>
        </form>

        <form className="settings__card" onSubmit={savePassword} noValidate>
          <header className="settings__card-head">
            <div>
              <h3>Password</h3>
              <p>Choose a new password. You'll sign in again after it changes.</p>
            </div>
          </header>

          <div className="settings__fields">
            <PasswordField
              id="settings-current"
              label="Current password"
              value={password.currentPassword}
              visible={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
              onChange={updatePasswordField("currentPassword")}
              onBlur={touchPassword("currentPassword")}
              autoComplete="current-password"
              placeholder="Enter current password"
            />

            <PasswordField
              id="settings-new"
              label="New password"
              value={password.newPassword}
              visible={showNew}
              onToggle={() => setShowNew((v) => !v)}
              onChange={updatePasswordField("newPassword")}
              onBlur={touchPassword("newPassword")}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              hint={
                passwordTouched.newPassword && password.newPassword && password.newPassword.length < 6
                  ? "Use at least 6 characters."
                  : ""
              }
            />

            <PasswordField
              id="settings-confirm"
              label="Confirm new password"
              value={password.confirmPassword}
              visible={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              onChange={updatePasswordField("confirmPassword")}
              onBlur={touchPassword("confirmPassword")}
              autoComplete="new-password"
              placeholder="Repeat new password"
              error={showConfirmError ? "Confirm password must match the new password." : ""}
              hint={!showConfirmError && confirmMatch ? "Passwords match." : ""}
              match={confirmMatch}
              mismatch={showConfirmError}
            />
          </div>

          <footer className="settings__card-foot">
            <p className="settings__note">A short countdown will sign you out after a successful change.</p>
            <button
              type="submit"
              className="settings__btn settings__btn--accent"
              disabled={savingPassword || confirmMismatch}
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </footer>
        </form>
      </div>
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <label className="settings__field" htmlFor={htmlFor}>
      <span className="settings__label-row">
        <span className="settings__label">{label}</span>
      </span>
      {children}
    </label>
  );
}

function PasswordField({
  id,
  label,
  value,
  visible,
  onToggle,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
  error = "",
  hint = "",
  match = false,
  mismatch = false,
}) {
  return (
    <div
      className={`settings__field settings__field--password${mismatch ? " is-error" : ""}${
        match ? " is-match" : ""
      }`}
    >
      <label htmlFor={id} className="settings__label">
        {label}
      </label>
      <div className="settings__control">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="settings__reveal"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="settings__error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={`settings__hint${match ? " settings__hint--good" : ""}`}>
          {hint}
        </p>
      ) : null}
    </div>
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
};

const EyeIcon = () => (
  <svg {...svgProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg {...svgProps}>
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
);
