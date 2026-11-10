import { useEffect, useState } from "react";
import { SUPER_ADMIN_ROLES, api } from "../../auth.js";
import "./Login.css";

const SLIDE_MS = 6500;

// `tint` is the RGB triple used for the caption gradient; `blend` multiplies the photo
// onto `backdrop`, which turns plain white studio backgrounds into the backdrop colour.
const SLIDES = [
  {
    image: "/images/gas%20vendor.jpg",
    position: "50% 22%",
    tint: "28, 25, 22",
    widget: "delivery",
    eyebrow: "Gas delivery",
    title: "Your neighbourhood, delivered.",
    caption: "Track every gas refill from the shop counter to the customer's door.",
  },
  {
    image: "/images/water.jpg",
    position: "50% 45%",
    tint: "8, 33, 61",
    blend: true,
    backdrop: "radial-gradient(circle at 70% 30%, #e8f4fd 0%, #a9d3f5 45%, #4f97d6 100%)",
    widget: "shops",
    eyebrow: "Water refills",
    title: "Clean water, right on time.",
    caption: "Manage products, prices and riders without leaving the dashboard.",
  },
  {
    image: "/images/food.jpg",
    position: "50% 58%",
    tint: "24, 16, 10",
    widget: "insights",
    eyebrow: "Food & insights",
    title: "Know what your area craves.",
    caption: "Daily sales, busy hours and top dishes at a glance.",
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
  const [serverError, setServerError] = useState("");
  const [showResetHint, setShowResetHint] = useState(false);

  const errors = validate(form);
  const visibleError = (field) => (touched[field] ? errors[field] : "");

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (serverError) setServerError("");
  };

  const blur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setServerError("");
    try {
      const result = await api("/api/users/login", {
        method: "POST",
        body: { email: form.email.trim(), password: form.password },
      });
      if (!SUPER_ADMIN_ROLES.includes(result.user?.role)) {
        throw new Error("This account doesn't have super admin access.");
      }
      onLogin({ token: result.token, user: result.user });
    } catch (error) {
      setServerError(error.status === 401 ? "Invalid email or password." : error.message);
      setSubmitting(false);
    }
  };

  return (
    <main className="login">
      <section className="login__panel">
        <div className="login__inner">
          <img
            className="login__logo enter"
            style={{ "--d": "0ms" }}
            src="/images/kabi-logo.png"
            alt="Kabi — Your Neighborhood. One App."
          />

          <div className="login__card enter" style={{ "--d": "80ms" }}>
            <>
                <header className="login__header">
                  <span className="login__eyebrow">
                    <span className="login__eyebrow-dot" aria-hidden="true" />
                    {greeting()} · Super admin
                  </span>
                  <h1 className="login__title">
                    Welcome <em>back</em>
                  </h1>
                  <p className="login__subtitle">Sign in to oversee every shop, rider and order on Kabi.</p>
                </header>

                {serverError && (
                  <div className="login__alert" role="alert">
                    <AlertIcon />
                    <span>{serverError}</span>
                  </div>
                )}

                <form className="login__form" onSubmit={handleSubmit} noValidate>
                  <Field id="email" label="Email address" error={visibleError("email")} icon={<MailIcon />}>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      placeholder="you@kabi.co.ke"
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
                      <button
                        type="button"
                        className="login__link"
                        onClick={() => setShowResetHint((v) => !v)}
                        aria-expanded={showResetHint}
                      >
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

                  {showResetHint && (
                    <p className="login__note">
                      Contact the Kabi platform team to reset a super admin password.
                    </p>
                  )}

                  <button type="submit" className="login__submit" disabled={submitting}>
                    <span className="login__submit-label">{submitting ? "Signing in…" : "Sign in"}</span>
                    <span className="login__submit-icon" aria-hidden="true">
                      {submitting ? <span className="login__spinner" /> : <ArrowIcon />}
                    </span>
                  </button>
                </form>

                <p className="login__secure">
                  <ShieldIcon />
                  Restricted to Kabi super admins
                </p>
            </>
          </div>

          <footer className="login__footer enter" style={{ "--d": "160ms" }}>
            © {new Date().getFullYear()} Kabi Connect · Super Admin Console
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
    <aside className="showcase" aria-roledescription="carousel" aria-label="Kabi highlights">
      {slides.map((slide, index) => (
        <figure
          key={slide.title}
          className={`showcase__slide${index === active ? " is-active" : ""}`}
          aria-hidden={index !== active}
          style={{ "--tint": slide.tint, background: slide.backdrop }}
        >
          {slide.image ? (
            <img
              className={`showcase__image${slide.blend ? " showcase__image--blend" : ""}`}
              src={slide.image}
              alt=""
              style={{ objectPosition: slide.position }}
            />
          ) : (
            <div className={`showcase__placeholder showcase__placeholder--${index % 3}`}>
              <span className="showcase__orb showcase__orb--a" />
              <span className="showcase__orb showcase__orb--b" />
            </div>
          )}

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
    </aside>
  );
}

function Widget({ type }) {
  if (type === "delivery") {
    return (
      <div className="wcard">
        <div className="wcard__head">
          <span className="wcard__label">Order #KB-2041</span>
          <span className="wpill wpill--ember">On the way</span>
        </div>
        <div className="wrider">
          <span className="wavatar" style={{ background: "#B22E0C" }}>JM</span>
          <div>
            <strong>James M.</strong>
            <span>Rotejo rider · 2 × 13kg gas</span>
          </div>
          <span className="weta">
            8<small>min</small>
          </span>
        </div>
        <div className="wtrack">
          <span className="wtrack__fill" />
          <span className="wtrack__stop is-done" />
          <span className="wtrack__stop is-done" />
          <span className="wtrack__stop" />
        </div>
        <div className="wtrack__labels">
          <span>Shop</span>
          <span>Picked up</span>
          <span>Door</span>
        </div>
      </div>
    );
  }

  if (type === "shops") {
    return (
      <div className="wcard">
        <div className="wcard__head">
          <span className="wcard__label">Aqua Springs Refill</span>
          <span className="wpill wpill--good">Open</span>
        </div>
        {[
          ["20L refill", "KSh 150", true],
          ["10L refill", "KSh 90", true],
          ["New 20L bottle", "KSh 650", false],
        ].map(([name, price, on]) => (
          <div key={name} className="witem">
            <span className="witem__name">{name}</span>
            <span className="witem__price">{price}</span>
            <span className={`wtoggle${on ? " is-on" : ""}`} />
          </div>
        ))}
        <span className="wcard__meta">
          <span className="wdot" /> 6 riders online nearby
        </span>
      </div>
    );
  }

  return (
    <div className="wcard">
      <div className="wcard__head">
        <span className="wcard__label">Today's sales</span>
        <span className="wtrend">+12.4%</span>
      </div>
      <div className="wstat">KSh 48,200</div>
      <div className="wbars">
        {[38, 52, 44, 66, 58, 82, 100].map((h, i) => (
          <span key={i} className="wbar" style={{ "--h": `${h}%`, "--i": i }} />
        ))}
      </div>
      <div className="wbars__labels">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <span className="wcard__meta">Top dish · Double cheeseburger</span>
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

const AlertIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5M12 16h.01" />
  </svg>
);

const ShieldIcon = () => (
  <svg {...svgProps} width={15} height={15}>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
