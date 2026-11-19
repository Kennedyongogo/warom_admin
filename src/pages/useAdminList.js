import { useCallback, useEffect, useState } from "react";
import { api } from "../auth.js";

export function useAdminList(path, token, { enabled = true } = {}) {
  const [state, setState] = useState({ status: "loading", rows: [], error: "" });

  const reload = useCallback(() => {
    if (!enabled || !path) return;
    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", error: "" }));
    api(path, { token })
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data?.rows || [];
        setState({ status: "ready", rows, error: "" });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: "error", rows: [], error: error.message || "Failed to load" });
      });
    return () => {
      cancelled = true;
    };
  }, [path, token, enabled]);

  useEffect(() => {
    const cancel = reload();
    return typeof cancel === "function" ? cancel : undefined;
  }, [reload]);

  return { ...state, reload, setRows: (rows) => setState((prev) => ({ ...prev, rows })) };
}

export function badgeTone(status = "") {
  const value = String(status).toLowerCase();
  if (value === "live") return "live";
  if (["success", "paid", "resolved", "active", "published", "approved", "released", "verified"].includes(value))
    return "good";
  if (["pending", "open", "reviewing", "processing", "scheduled", "new", "suspended"].includes(value))
    return "warn";
  if (
    ["failed", "rejected", "banned", "dismissed", "refunded", "ended", "terminated", "removed", "reversed"].includes(
      value
    )
  )
    return "muted";
  return "";
}
