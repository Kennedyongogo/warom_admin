import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SUPER_ADMIN_ROLES, api, isAuthError } from "../auth.js";
import Avatar from "../components/Avatar.jsx";
import "./AppShell.css";

const PRIMARY_NAV = [
  { to: "/", label: "Home", icon: <HomeIcon />, end: true },
  { to: "/users", label: "Users", icon: <UsersIcon /> },
  { to: "/inquiries", label: "Inquiries", icon: <InquiryIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

const MORE_NAV = [
  { to: "/coins", label: "Coin packages", group: "Money" },
  { to: "/vip", label: "VIP plans", group: "Money" },
  { to: "/gifts", label: "Gifts", group: "Money" },
  { to: "/earnings", label: "Earnings", group: "Money" },
  { to: "/payments", label: "Payments", group: "Money" },
  { to: "/withdrawals", label: "Withdrawals", group: "Money" },
  { to: "/reports", label: "Reports", group: "Safety" },
  { to: "/live-streams", label: "Live streams", group: "Safety" },
  { to: "/notifications", label: "Notifications", group: "Reach" },
  { to: "/policies", label: "Policies", group: "Reach" },
];

const MOBILE_NAV_GROUPS = [
  {
    label: "Main",
    items: PRIMARY_NAV,
  },
  {
    label: "Money",
    items: MORE_NAV.filter((item) => item.group === "Money").map((item) => ({
      ...item,
      icon: <MoreItemIcon />,
    })),
  },
  {
    label: "Safety",
    items: MORE_NAV.filter((item) => item.group === "Safety").map((item) => ({
      ...item,
      icon: <MoreItemIcon />,
    })),
  },
  {
    label: "Reach",
    items: MORE_NAV.filter((item) => item.group === "Reach").map((item) => ({
      ...item,
      icon: <MoreItemIcon />,
    })),
  },
];

export default function AppShell({ session, onSignOut, onUserUpdate }) {
  const { token, user } = session;

  // Refresh the stored profile (and catch revoked or expired sessions) on every visit.
  useEffect(() => {
    let cancelled = false;
    api("/api/admin/me", { token })
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
  const location = useLocation();
  const moreActive = MORE_NAV.some((item) => location.pathname === item.to);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    const wide = window.matchMedia("(min-width: 721px)");
    const onWide = (event) => event.matches && setMenuOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  return (
    <div className={`shell${menuOpen ? " is-menu-open" : ""}`}>
      <header className="nav">
        <Link to="/" className="nav__brand" aria-label="WAROM Admin home" onClick={closeMenu}>
          <img src="/images/warom-logo.png" alt="WAROM" />
        </Link>

        <nav className="nav__links" aria-label="Main">
          {PRIMARY_NAV.map((item) => (
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
          <MoreNav active={moreActive} onNavigate={closeMenu} />
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
      </header>

      <div className="shell__scrim" onClick={closeMenu} aria-hidden="true" />

      <nav
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " is-open" : ""}`}
        aria-label="Main"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu__sheet">
          <header className="mobile-menu__head">
            <div>
              <p className="mobile-menu__eyebrow">WAROM Admin</p>
              <h2 className="mobile-menu__title">Browse pages</h2>
            </div>
            <button type="button" className="mobile-menu__close" onClick={closeMenu} aria-label="Close menu">
              <CloseIcon />
            </button>
          </header>

          <div className="mobile-menu__scroll">
            {MOBILE_NAV_GROUPS.map((group, groupIndex) => (
              <section key={group.label} className="mobile-menu__group" style={{ "--g": groupIndex }}>
                <h3 className="mobile-menu__group-title">{group.label}</h3>
                <div className="mobile-menu__list">
                  {group.items.map((item, index) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `mobile-menu__link${isActive ? " is-active" : ""}`}
                      style={{ "--i": groupIndex * 4 + index }}
                      tabIndex={menuOpen ? undefined : -1}
                      onClick={closeMenu}
                    >
                      <span className="mobile-menu__icon">{item.icon}</span>
                      <span className="mobile-menu__label">{item.label}</span>
                      <ChevronIcon />
                    </NavLink>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </nav>

      <main className="shell__main">
        <Outlet context={{ user, token, onUserUpdate, onSignOut }} />
      </main>
    </div>
  );
}

function MoreNav({ active, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const groups = MORE_NAV.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

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
    <div className="nav-more" ref={ref}>
      <button
        type="button"
        className={`nav__link nav-more__trigger${active || open ? " is-active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon />
        <span className="nav__link-label">More</span>
      </button>
      {open && (
        <div className="nav-more__menu" role="menu">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="nav-more__group">
              <p className="nav-more__heading">{group}</p>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className={({ isActive }) => `nav-more__item${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
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
              <strong>{user.name || user.full_name || "Admin"}</strong>
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

function UsersIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </svg>
  );
}

function InquiryIcon() {
  return (
    <svg {...svgProps}>
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
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

function MoreIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoreItemIcon() {
  return (
    <svg {...svgProps}>
      <path d="M5 7h14M5 12h14M5 17h10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...svgProps}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
