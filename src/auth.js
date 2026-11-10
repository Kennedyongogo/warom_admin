const API_BASE = import.meta.env.VITE_API_BASE || "";
const TOKEN_KEY = "kabi_superadmin_token";
const USER_KEY = "kabi_superadmin_user";

// Matches `requireSuperAdmin` in delivery_api.
export const SUPER_ADMIN_ROLES = ["super_admin"];

export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    return user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// `raw` returns the whole payload, for endpoints that put metadata such as `pagination` beside `data`.
export async function api(path, { token, method = "GET", body, raw = false } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
  }

  const data = await response.json().catch(() => null);
  if (!data) {
    throw new ApiError(
      response.status >= 500
        ? "The server is unavailable right now. Please try again shortly."
        : "Something went wrong. Please try again.",
      response.status
    );
  }
  if (!response.ok || data.success === false) {
    throw new ApiError(data.message || "Request failed.", response.status);
  }
  return raw ? data : data.data;
}

// The API answers 400 for a bad/expired token and 401/403 for missing or revoked access.
export const isAuthError = (error) => [400, 401, 403].includes(error?.status);

export function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `${API_BASE}/${path}`;
}
