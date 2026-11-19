import { Link, useOutletContext } from "react-router-dom";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

export default function Hosts() {
  const { token } = useOutletContext();
  const { status, rows, error, reload } = useAdminList("/api/admin/hosts?limit=100", token);

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Hosts</h1>
        <p className="page__subtitle">Chatter performance: earnings, gifts, calls, and streams.</p>
        <div className="ops-page-tools">
          <button type="button" className="ops-btn ops-btn--ghost ops-btn--sm" onClick={reload}>
            Refresh
          </button>
          <Link to="/users?role=chatter" className="ops-btn ops-btn--ghost ops-btn--sm">
            Open chatters directory
          </Link>
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No chatters / hosts yet.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Status</th>
                <th>Pending</th>
                <th>Available</th>
                <th>Gifts</th>
                <th>Calls</th>
                <th>Streams</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Host">
                    <div className="ops-stack">
                      <strong>{row.username || row.email}</strong>
                      <span className="ops-mono">{row.id}</span>
                      {row.is_verified ? (
                        <span className={`ops-badge ops-badge--${badgeTone("approved")}`}>verified</span>
                      ) : (
                        <span className={`ops-badge ops-badge--${badgeTone(row.verification_status || "pending")}`}>
                          {row.verification_status || "unverified"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${badgeTone(row.status)}`}>{row.status}</span>
                  </td>
                  <td data-label="Pending">
                    {numberFmt.format(Number(row.balances?.pending_earnings || 0))}
                  </td>
                  <td data-label="Available">
                    {numberFmt.format(Number(row.balances?.available_earnings || 0))}
                  </td>
                  <td data-label="Gifts">{numberFmt.format(row.gifts_received || 0)}</td>
                  <td data-label="Calls">{numberFmt.format(row.calls_count || 0)}</td>
                  <td data-label="Streams">{numberFmt.format(row.streams_count || 0)}</td>
                  <td data-label="Joined">
                    {row.created_at || row.createdAt
                      ? dateTimeFmt.format(new Date(row.created_at || row.createdAt))
                      : "—"}
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
