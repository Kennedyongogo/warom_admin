import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { SUPER_ADMIN_ROLES, api, isAuthError } from "../auth.js";
import Avatar from "../components/Avatar.jsx";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: <HomeIcon />, end: true },
  { to: "/shops", label: "Shops", icon: <ShopIcon /> },
  { to: "/users", label: "Users", icon: <UsersIcon /> },
  { to: "/riders", label: "Riders", icon: <RiderIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export default function AppShell({ session, onSignOut, onUserUpdate }) {
  const { token, user } = session;

  // Refresh the stored profile (and catch revoked or expired sessions) on every visit.
  useEffect(() => {
    let cancelled = false;
    api(`/api/users/${user.id}`, { token })
      .then((fresh) => {
        if (cancelled) return;
        if (!SUPER_ADMIN_ROLES.includes(fresh.role)) onSignOut();
        else onUserUpdate(fresh);
      })
      .catch((error) => {
        if (!cancelled && isAuthError(error)) onSignOut();
      });
    return () => {
      cancelled = true;
    };
  }, [token, user.id, onSignOut, onUserUpdate]);

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    const wide = window.matchMedia("(min-width: 721px)");
    const onWide = (event) => event.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  return (
    <div className={`shell${menuOpen ? " is-menu-open" : ""}`}>
      <header className="nav">
        <Link to="/" className="nav__brand" aria-label="Kabi super admin home" onClick={closeMenu}>
          <img src="/images/kabi-logo.png" alt="Kabi" />
        </Link>

        <nav className="nav__links" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav__link${isActive ? " is-active" : ""}`}
              aria-label={item.label}
            >
              {item.icon}
              <span className="nav__link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav__end">
          <ProfileMenu user={user} onSignOut={onSignOut} onOpen={closeMenu} />
          <button
            type="button"
            className={`burger${menuOpen ? " is-open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span className="burger__line" />
            <span className="burger__line" />
            <span className="burger__line" />
          </button>
        </div>

        <nav
          id="mobile-menu"
          className={`mobile-menu${menuOpen ? " is-open" : ""}`}
          aria-label="Main"
          aria-hidden={!menuOpen}
        >
          {NAV_ITEMS.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mobile-menu__link${isActive ? " is-active" : ""}`}
              style={{ "--i": index }}
              tabIndex={menuOpen ? undefined : -1}
              onClick={closeMenu}
            >
              <span className="mobile-menu__icon">{item.icon}</span>
              {item.label}
              <ChevronIcon />
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="shell__scrim" onClick={closeMenu} aria-hidden="true" />

      <main className="shell__main">
        <Outlet context={{ user, token, onUserUpdate }} />
      </main>
    </div>
  );
}

function ProfileMenu({ user, onSignOut, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="profile" ref={ref}>
      <button
        type="button"
        className="profile__trigger"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div className="profile__menu" role="menu">
          <div className="profile__head">
            <Avatar user={user} size="lg" />
            <div className="profile__who">
              <strong>{user.full_name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <span className="profile__role">Super admin</span>
          <div className="profile__divider" />
          <Link to="/settings" className="profile__item" role="menuitem" onClick={() => setOpen(false)}>
            <SettingsIcon /> Settings
          </Link>
          <button type="button" className="profile__item profile__item--danger" role="menuitem" onClick={onSignOut}>
            <SignOutIcon /> Sign out
          </button>
        </div>
      )}
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
  "aria-hidden": true,
};

function HomeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 9.5 5.5 4h13L20 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </svg>
  );
}

function RiderIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17h5l3-6h3l1 6M9 8h3l2 3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg {...svgProps} width={16} height={16} className="mobile-menu__chevron">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg {...svgProps}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
    </svg>
  );
}
