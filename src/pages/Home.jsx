import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../auth.js";
import { numberFmt } from "../utils/format.js";
import "./pages.css";
import "./ops.css";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const EMPTY = {
  users: 0,
  chatters: 0,
  pendingWithdrawals: 0,
  openReports: 0,
  liveStreams: 0,
  newInquiries: 0,
};

export default function Home() {
  const { user, token } = useOutletContext();
  const firstName = (user?.name || user?.full_name || "there").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [stats, setStats] = useState(EMPTY);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api("/api/admin/dashboard", { token })
      .then((data) => {
        if (cancelled) return;
        setStats({ ...EMPTY, ...(data || {}) });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const kpis = [
    { key: "users", label: "Active users", hint: "App members", to: "/users?role=user" },
    { key: "chatters", label: "Active chatters", hint: "Creators / hosts", to: "/users?role=chatter" },
    { key: "pendingWithdrawals", label: "Pending withdrawals", hint: "Needs review", to: "/withdrawals?status=pending" },
    { key: "openReports", label: "Open reports", hint: "Safety queue", to: "/reports?status=open" },
    { key: "liveStreams", label: "Live now", hint: "Active streams", to: "/live-streams" },
    { key: "newInquiries", label: "New inquiries", hint: "Public site", to: "/inquiries?status=new" },
  ];

  return (
    <section className="page">
      <header className="page__header">
        <p className="page__subtitle" style={{ marginBottom: 6 }}>
          {greeting()} · {today}
        </p>
        <h1 className="page__title">
          Welcome back, <em style={{ fontStyle: "normal", color: "var(--coral-deep, #e24f2f)" }}>{firstName}</em>
        </h1>
        <p className="page__subtitle">WAROM ops overview — money, people, safety, and queues that need action.</p>
      </header>

      <div className="ops-grid">
        {kpis.map((item) => (
          <Link key={item.key} to={item.to} className="ops-kpi">
            <span className="ops-kpi__label">{item.label}</span>
            <span className="ops-kpi__value">
              {status === "loading" ? "…" : numberFmt.format(Number(stats[item.key] || 0))}
            </span>
            <span className="ops-kpi__hint">{item.hint}</span>
          </Link>
        ))}
      </div>

      {status === "error" && (
        <p className="ops-error" style={{ textAlign: "left", padding: "0 0 1rem" }}>
          Couldn’t load dashboard stats. Other pages still work.
        </p>
      )}

      <div className="ops-panels">
        <section className="ops-panel">
          <h2>Money & catalogue</h2>
          <p>Configure what people buy and how chatters earn.</p>
          <div className="ops-links">
            <Link className="ops-link" to="/coins">
              Coin packages <span>Pricing</span>
            </Link>
            <Link className="ops-link" to="/vip">
              VIP plans <span>Subscriptions</span>
            </Link>
            <Link className="ops-link" to="/gifts">
              Gift catalogue <span>Coin values</span>
            </Link>
            <Link className="ops-link" to="/earnings">
              Earnings split <span>Chatter %</span>
            </Link>
            <Link className="ops-link" to="/payments">
              Payments <span>History</span>
            </Link>
            <Link className="ops-link" to="/withdrawals">
              Withdrawals <span>Approve payouts</span>
            </Link>
          </div>
        </section>

        <section className="ops-panel">
          <h2>Safety & reach</h2>
          <p>Moderate reports, watch live rooms, and message members.</p>
          <div className="ops-links">
            <Link className="ops-link" to="/reports">
              Reports <span>Review queue</span>
            </Link>
            <Link className="ops-link" to="/live-streams">
              Live streams <span>Monitor</span>
            </Link>
            <Link className="ops-link" to="/notifications">
              Notifications <span>Send</span>
            </Link>
            <Link className="ops-link" to="/inquiries">
              Inquiries <span>Public site</span>
            </Link>
            <Link className="ops-link" to="/policies">
              Policies <span>Legal pages</span>
            </Link>
            <Link className="ops-link" to="/users">
              Users & chatters <span>Directory</span>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
