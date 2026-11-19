import { useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../auth.js";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { badgeTone, useAdminList } from "./useAdminList.js";
import "./pages.css";
import "./ops.css";

const FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "released", label: "Released" },
  { id: "all", label: "All" },
];

export default function EarningsHolds() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get("status") || "pending";
  const path = useMemo(() => {
    const q = new URLSearchParams({ limit: "100" });
    if (statusFilter !== "all") q.set("status", statusFilter);
    return `/api/admin/earning-holds?${q}`;
  }, [statusFilter]);
  const { status, rows, error, reload } = useAdminList(path, token);
  const [releasing, setReleasing] = useState(false);

  const releaseDue = async () => {
    setReleasing(true);
    try {
      const result = await api("/api/admin/earning-holds/release-due", {
        token,
        method: "POST",
        body: {},
      });
      await showSuccess(
        "Release run complete",
        `Released ${result?.released ?? result?.count ?? 0} hold(s).`
      );
      reload();
    } catch (err) {
      await showError("Couldn't release", err.message || "Please try again.");
    } finally {
      setReleasing(false);
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Earnings holds</h1>
        <p className="page__subtitle">Pending → available earnings window. Release due holds manually if needed.</p>
        <div className="ops-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="ops-toolbar__filters">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`ops-chip${statusFilter === filter.id ? " is-active" : ""}`}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (filter.id === "all") next.delete("status");
                    else next.set("status", filter.id);
                    return next;
                  })
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ops-btn ops-btn--sm"
            onClick={releaseDue}
            disabled={releasing}
          >
            {releasing ? "Releasing…" : "Release due holds"}
          </button>
        </div>
      </header>

      <div className="ops-card">
        {status === "loading" && <div className="ops-loading">Loading…</div>}
        {status === "error" && <div className="ops-error">{error}</div>}
        {status === "ready" && rows.length === 0 && <div className="ops-empty">No holds in this view.</div>}
        {status === "ready" && rows.length > 0 && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Chatter</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Available at</th>
                <th>Released at</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Created">
                    {dateTimeFmt.format(new Date(row.created_at || row.createdAt))}
                  </td>
                  <td data-label="Chatter">
                    <span className="ops-mono">{row.chatter_id}</span>
                  </td>
                  <td data-label="Amount">{numberFmt.format(Number(row.amount_coins || 0))}</td>
                  <td data-label="Status">
                    <span className={`ops-badge ops-badge--${badgeTone(row.status)}`}>{row.status}</span>
                  </td>
                  <td data-label="Available at">
                    {row.available_at
                      ? dateTimeFmt.format(new Date(row.available_at))
                      : "—"}
                  </td>
                  <td data-label="Released at">
                    {row.released_at
                      ? dateTimeFmt.format(new Date(row.released_at))
                      : "—"}
                  </td>
                  <td data-label="Source">{row.source_type || row.reference_type || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
