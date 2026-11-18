import { useOutletContext } from "react-router-dom";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

export default function Payments() {
  const { token } = useOutletContext();
  const { status, rows, error } = useAdminList("/api/admin/payments?limit=100", token);

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Payments</h1>
        <p className="page__subtitle">Coin purchases and VIP payments from the apps.</p>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No payments yet.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Purpose</th>
                <th>Amount</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {row.created_at || row.createdAt
                      ? dateTimeFmt.format(new Date(row.created_at || row.createdAt))
                      : "—"}
                  </td>
                  <td data-label="User">
                    <span className="ops-mono">{row.user_id}</span>
                  </td>
                  <td data-label="Purpose">{String(row.purpose || "").replaceAll("_", " ")}</td>
                  <td data-label="Amount">
                    {numberFmt.format(Number(row.amount))} {row.currency || "KES"}
                  </td>
                  <td data-label="Provider">{row.provider || "—"}</td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${badgeTone(row.status)}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
