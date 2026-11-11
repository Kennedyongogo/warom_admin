import { useEffect, useState } from "react";
import { SUPER_ADMIN_ROLES, api } from "../../auth.js";
import { showError, showInfo, showSuccess, showWarning } from "../../utils/swal.js";
import "./Login.css";

const SLIDE_MS = 7000;

const SLIDES = [
  {
    image: "/images/login-hero.jpg",
    position: "55% 40%",
    tint: "11, 27, 43",
    widget: "pulse",
    eyebrow: "Command center",
    title: "Every connection, under one quiet light.",
    caption: "Oversee users, chatters and live moments from a single, calm console.",
  },
  {
    image: "/images/login-ops.jpg",
    position: "50% 45%",
    tint: "8, 20, 34",
    widget: "ledger",
    eyebrow: "Coin economy",
    title: "Coins that move with trust.",
    caption: "Track spends, pending earnings and withdrawals with ledger-grade clarity.",
  },
  {
    image: "/images/login-connect.jpg",
    position: "48% 35%",
    tint: "10, 22, 36",
    widget: "safety",
    eyebrow: "Trust & safety",
    title: "Keep chemistry safe at scale.",
    caption: "Review reports, verify chatters and protect the rooms people love.",
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "That email doesn't look right.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(form);
  const visibleError = (field) => (touched[field] ? errors[field] : "");

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const blur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleForgotPassword = () => {
    showInfo(
      "Reset password",
      "Contact the WAROM platform team to reset an admin password."
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (Object.keys(errors).length) {
      const message = [errors.email, errors.password].filter(Boolean).join(" ");
      await showWarning("Check your details", message);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api("/api/admin/login", {
        method: "POST",
        body: { email: form.email.trim(), password: form.password },
      });
      const admin = result.admin || result.user;
      if (!admin || !SUPER_ADMIN_ROLES.includes(admin.role)) {
        throw new Error("This account doesn't have admin access.");
      }
      await showSuccess("Welcome back", `Signed in as ${admin.name || admin.email}.`);
      onLogin({ token: result.token, user: admin });
    } catch (error) {
      const message =
        error.status === 401 ? "Invalid email or password." : error.message || "Sign in failed.";
      await showError("Sign in failed", message);
      setSubmitting(false);
    }
  };

  return (
    <main className="login">
      <div className="login__ambient" aria-hidden="true">
        <img src="/images/login-panel.jpg" alt="" className="login__ambient-img" />
        <div className="login__ambient-veil" />
      </div>

      <section className="login__panel">
        <div className="login__inner">
          <div className="login__brand enter" style={{ "--d": "0ms" }}>
            <img className="login__logo" src="/images/warom-logo.png" alt="WAROM" />
          </div>

          <div className="login__card enter" style={{ "--d": "90ms" }}>
            <header className="login__header">
              <span className="login__eyebrow">
                <span className="login__eyebrow-dot" aria-hidden="true" />
                {greeting()} · Operations
              </span>
              <h1 className="login__title">
                Welcome <em>back</em>
              </h1>
              <p className="login__subtitle">
                Sign in to steer WAROM — users, chatters, coins and care.
              </p>
            </header>

            <form className="login__form" onSubmit={handleSubmit} noValidate>
              <Field id="email" label="Email address" error={visibleError("email")} icon={<MailIcon />}>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="waromadmin@gmail.com"
                  value={form.email}
                  onChange={update("email")}
                  onBlur={blur("email")}
                  aria-invalid={Boolean(visibleError("email"))}
                  aria-describedby={visibleError("email") ? "email-error" : undefined}
                />
              </Field>

              <Field
                id="password"
                label="Password"
                error={visibleError("password")}
                icon={<LockIcon />}
                hint={capsLock && !visibleError("password") ? "Caps Lock is on" : ""}
                labelAction={
                  <button type="button" className="login__link" onClick={handleForgotPassword}>
                    Forgot password?
                  </button>
                }
                action={
                  <button
                    type="button"
                    className="login__reveal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={update("password")}
                  onBlur={blur("password")}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock"))}
                  aria-invalid={Boolean(visibleError("password"))}
                  aria-describedby={visibleError("password") ? "password-error" : undefined}
                />
              </Field>

              <button type="submit" className="login__submit" disabled={submitting}>
                <span className="login__submit-label">{submitting ? "Signing in…" : "Sign in"}</span>
                <span className="login__submit-icon" aria-hidden="true">
                  {submitting ? <span className="login__spinner" /> : <ArrowIcon />}
                </span>
              </button>
            </form>

            <p className="login__secure">
              <ShieldIcon />
              Restricted to WAROM administrators
            </p>
          </div>

          <footer className="login__footer enter" style={{ "--d": "170ms" }}>
            © {new Date().getFullYear()} WAROM · Admin Console
          </footer>
        </div>
      </section>

      <Showcase slides={SLIDES} />
    </main>
  );
}

function Field({ id, label, error, hint, icon, action, labelAction, children }) {
  return (
    <div className={`login__field${error ? " login__field--error" : ""}`}>
      <div className="login__label-row">
        <label htmlFor={id} className="login__label">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="login__control">
        <span className="login__icon" aria-hidden="true">
          {icon}
        </span>
        {children}
        {action}
      </div>
      {error ? (
        <p id={`${id}-error`} className="login__error">
          {error}
        </p>
      ) : hint ? (
        <p className="login__hint">{hint}</p>
      ) : null}
    </div>
  );
}

function Showcase({ slides }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => setActive((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <aside className="showcase" aria-roledescription="carousel" aria-label="WAROM highlights">
      {slides.map((slide, index) => (
        <figure
          key={slide.title}
          className={`showcase__slide${index === active ? " is-active" : ""}`}
          aria-hidden={index !== active}
          style={{ "--tint": slide.tint }}
        >
          <img
            className="showcase__image"
            src={slide.image}
            alt=""
            style={{ objectPosition: slide.position }}
          />

          <div className="showcase__widgets" aria-hidden="true">
            <Widget type={slide.widget} />
          </div>

          <figcaption className="showcase__caption">
            <span className="showcase__eyebrow">{slide.eyebrow}</span>
            <h2 className="showcase__title">{slide.title}</h2>
            <p className="showcase__text">{slide.caption}</p>
          </figcaption>
        </figure>
      ))}

      <div className="showcase__dots" role="tablist" aria-label="Slides">
        {slides.map((slide, index) => (
          <button
            key={slide.eyebrow}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={`showcase__dot${index === active ? " is-active" : ""}`}
            onClick={() => setActive(index)}
          >
            <span className="sr-only">{slide.eyebrow}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function Widget({ type }) {
  if (type === "pulse") {
    return (
      <div className="wcard">
        <div className="wcard__head">
          <span className="wcard__label">Live pulse</span>
          <span className="wpill wpill--live">Live</span>
        </div>
        <div className="wpulse">
          {[
            ["Users online", "12.4k"],
            ["Active chats", "3,812"],
            ["Streams", "48"],
          ].map(([label, value]) => (
            <div key={label} className="wpulse__row">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="wbars wbars--soft">
          {[42, 58, 51, 74, 63, 88, 96].map((h, i) => (
            <span key={i} className="wbar" style={{ "--h": `${h}%`, "--i": i }} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "ledger") {
    return (
      <div className="wcard">
        <div className="wcard__head">
          <span className="wcard__label">Coin ledger</span>
          <span className="wtrend">+8.2%</span>
        </div>
        <div className="wstat">184,920 coins</div>
        <div className="witem">
          <span className="witem__name">Pending payouts</span>
          <span className="witem__price">12,480</span>
        </div>
        <div className="witem">
          <span className="witem__name">Available today</span>
          <span className="witem__price">6,210</span>
        </div>
        <span className="wcard__meta">
          <span className="wdot" /> Settlements on schedule
        </span>
      </div>
    );
  }

  return (
    <div className="wcard">
      <div className="wcard__head">
        <span className="wcard__label">Safety queue</span>
        <span className="wpill wpill--warn">3 open</span>
      </div>
      {[
        ["Report #WR-118", "Harassment", "High"],
        ["Chatter verify", "ID pending", "Med"],
        ["Live flag", "Room #402", "Low"],
      ].map(([title, meta, level]) => (
        <div key={title} className="witem witem--stack">
          <div>
            <span className="witem__name">{title}</span>
            <span className="witem__meta">{meta}</span>
          </div>
          <span className={`wlevel wlevel--${level.toLowerCase()}`}>{level}</span>
        </div>
      ))}
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

const MailIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const LockIcon = () => (
  <svg {...svgProps}>
    <rect x="4" y="10" width="16" height="11" rx="3" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

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

const ArrowIcon = () => (
  <svg {...svgProps} strokeWidth={2.2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const ShieldIcon = () => (
  <svg {...svgProps} width={15} height={15}>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
