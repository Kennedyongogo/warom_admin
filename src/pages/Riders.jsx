import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../auth.js";
import Modal from "../components/Modal.jsx";
import { dateFmt, numberFmt, timeAgo } from "../utils/format.js";
import { RoleTabs, SearchBox } from "./Users.jsx";
import "./pages.css";
import "./Users.css";
import "./Riders.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const STATUS_TABS = [
  { id: "pending", label: "Waiting review", icon: <ClockIcon />, hint: "New Rotejo applications show up here for you to check." },
  { id: "approved", label: "Approved", icon: <CheckIcon />, hint: "Riders you approve can go online and take rides." },
  { id: "rejected", label: "Rejected", icon: <CrossIcon />, hint: "Applications you send back with a reason show up here." },
];

const DOCUMENTS = [
  { kind: "selfie", label: "Selfie" },
  { kind: "id_front", label: "ID front" },
  { kind: "id_back", label: "ID back" },
  { kind: "licence", label: "Driving licence" },
  { kind: "bike", label: "Bike with plate" },
];

const STATUS_WORDS = { pending: "Waiting review", approved: "Approved", rejected: "Rejected" };

// Rider documents are private, so photos load with the admin's token.
function useDocument(token, userId, kind, enabled = true) {
  const [state, setState] = useState({ url: "", status: "loading" });
  useEffect(() => {
    if (!enabled) {
      setState({ url: "", status: "missing" });
      return undefined;
    }
    let url = "";
    let cancelled = false;
    setState({ url: "", status: "loading" });
    fetch(`${API_BASE}/api/rotejo/riders/${userId}/documents/${kind}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ url, status: "ready" });
      })
      .catch(() => !cancelled && setState({ url: "", status: "missing" }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, userId, kind, enabled]);
  return state;
}

export default function Riders() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const active = STATUS_TABS.find((tab) => tab.id === params.get("status")) ?? STATUS_TABS[0];
  const query = params.get("q") ?? "";

  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState({ status: "loading", rows: [], error: "" });
  const [reviewing, setReviewing] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setList((prev) => ({ ...prev, status: "loading" }));
    api("/api/rotejo/riders", { token })
      .then((rows) => !cancelled && setList({ status: "ready", rows, error: "" }))
      .catch((error) => !cancelled && setList({ status: "error", rows: [], error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(id);
  }, [toast]);

  const updateParams = useCallback(
    (changes) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === "") next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  const onSearch = useCallback((value) => updateParams({ q: value }), [updateParams]);

  const counts = useMemo(() => {
    if (list.status !== "ready") return null;
    return Object.fromEntries(STATUS_TABS.map((tab) => [tab.id, list.rows.filter((row) => row.status === tab.id).length]));
  }, [list]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.rows
      .filter((row) => row.status === active.id)
      .filter((row) => {
        if (!needle) return true;
        const hay = [row.rider?.full_name, row.rider?.email, row.rider?.phone, row.plate, row.stage, row.id_number]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
  }, [list.rows, active.id, query]);

  const onReviewed = (updated, word) => {
    setList((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.user_id === updated.user_id ? { ...row, ...updated, rider: row.rider } : row)),
    }));
    setReviewing(null);
    setToast({ id: Date.now(), message: word });
  };

  const showSkeleton = list.status === "loading" && list.rows.length === 0;

  return (
    <section className="page riders">
      <header className="riders__head">
        <div>
          <h1 className="page__title">Rotejo riders</h1>
          <p className="page__subtitle">Check each rider's ID, licence and bike before they can take rides.</p>
        </div>
        <button
          type="button"
          className="btn riders__refresh"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={list.status === "loading"}
          aria-label="Refresh applications"
        >
          <RefreshIcon /> <span className="riders__refresh-label">Refresh</span>
        </button>
      </header>

      <RoleTabs
        tabs={STATUS_TABS}
        counts={counts}
        activeId={active.id}
        onSelect={(id) => updateParams({ status: id === STATUS_TABS[0].id ? null : id })}
        label="Application status"
      />

      <div
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        className={`directory${list.status === "loading" && !showSkeleton ? " is-refreshing" : ""}`}
      >
        <div className="directory__bar">
          <div className="directory__title">
            <span className="directory__icon">{active.icon}</span>
            <div>
              <h2>{active.label}</h2>
              <p>
                {list.status === "ready"
                  ? `${numberFmt.format(rows.length)} ${rows.length === 1 ? "rider" : "riders"}${query ? ` matching “${query}”` : ""}`
                  : "Loading…"}
              </p>
            </div>
          </div>
          <div className="directory__tools">
            <SearchBox value={query} onSearch={onSearch} placeholder="Search name, phone, plate…" />
          </div>
        </div>

        {list.status === "error" ? (
          <div className="directory__state">
            <span className="directory__state-icon directory__state-icon--danger">
              <AlertIcon />
            </span>
            <p className="directory__state-title">Couldn't load applications</p>
            <p className="directory__state-hint">{list.error}</p>
            <button type="button" className="btn" onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshIcon /> Try again
            </button>
          </div>
        ) : showSkeleton ? (
          <div className="rider-grid" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="rider-card rider-card--skeleton">
                <span className="skeleton rider-card__photo" />
                <span className="skeleton skeleton--name" />
                <span className="skeleton skeleton--line" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="directory__state">
            <span className="directory__state-icon">{active.icon}</span>
            <p className="directory__state-title">{query ? "No matches" : `Nothing in ${active.label.toLowerCase()}`}</p>
            <p className="directory__state-hint">{query ? "Try a name, phone number or plate." : active.hint}</p>
          </div>
        ) : (
          <div className="rider-grid">
            {rows.map((row, index) => (
              <RiderCard key={row.user_id} row={row} token={token} index={index} onReview={() => setReviewing(row)} />
            ))}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewDialog
          key={reviewing.user_id}
          row={reviewing}
          token={token}
          onClose={() => setReviewing(null)}
          onReviewed={onReviewed}
        />
      )}

      {toast && (
        <div key={toast.id} className="toast" role="status">
          <CheckIcon />
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}

function RiderCard({ row, token, index, onReview }) {
  const selfie = useDocument(token, row.user_id, "selfie", row.documents?.includes("selfie"));
  const name = row.rider?.full_name ?? "Unknown rider";
  const live = row.online && row.last_seen && Date.now() - new Date(row.last_seen).getTime() < 90_000;
  return (
    <article className="rider-card" style={{ "--i": index }}>
      <div className="rider-card__top">
        <div className="rider-card__photo">
          {selfie.url ? <img src={selfie.url} alt="" /> : <span>{initials(name)}</span>}
          {row.status === "approved" && <i className={`rider-card__dot${live ? " is-live" : ""}`} title={live ? "Online now" : "Offline"} />}
        </div>
        <div className="rider-card__who">
          <h3>{name}</h3>
          <p>{row.rider?.phone || row.rider?.email}</p>
          <span className={`pill pill--${row.status}`}>{STATUS_WORDS[row.status]}</span>
        </div>
      </div>

      <dl className="rider-card__facts">
        <div>
          <dt>Plate</dt>
          <dd>
            <span className="plate">{row.plate || "—"}</span>
          </dd>
        </div>
        <div>
          <dt>Bike</dt>
          <dd>{[row.bike_make, row.bike_model].filter(Boolean).join(" ") || "—"}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>{row.stage || "—"}</dd>
        </div>
        <div>
          <dt>Applied</dt>
          <dd title={row.createdAt ? new Date(row.createdAt).toLocaleString() : undefined}>{timeAgo(row.createdAt)}</dd>
        </div>
      </dl>

      {row.status === "rejected" && row.review_note && <p className="rider-card__note">“{row.review_note}”</p>}

      <button type="button" className="rider-card__review" onClick={onReview}>
        {row.status === "pending" ? "Review application" : "View details"}
        <ArrowIcon />
      </button>
    </article>
  );
}

function ReviewDialog({ row, token, onClose, onReviewed }) {
  const [mode, setMode] = useState("view");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(null);
  const noteRef = useRef(null);
  const name = row.rider?.full_name ?? "Rider";
  const first = name.split(" ")[0];

  useEffect(() => {
    if (mode === "reject") noteRef.current?.focus();
  }, [mode]);

  const submit = async (status, close) => {
    if (status === "rejected" && note.trim().length < 3) {
      setError("Tell the rider what to fix, e.g. “ID photo is blurry, upload a clearer one.”");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await api(`/api/rotejo/riders/${row.user_id}/status`, {
        token,
        method: "PUT",
        body: { status, note: note.trim() },
      });
      onReviewed(
        updated,
        status === "approved" ? `${first} is approved and can go online.` : `${first}'s application was sent back.`
      );
      close?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const facts = [
    ["Email", row.rider?.email],
    ["Phone", row.rider?.phone],
    ["National ID", row.id_number],
    ["Licence no.", row.licence_number],
    ["Stage", row.stage],
    ["Plate", row.plate],
    ["Bike", [row.bike_make, row.bike_model].filter(Boolean).join(" ")],
    ["Year · colour", [row.bike_year, row.bike_colour].filter(Boolean).join(" · ")],
    ["Applied", row.createdAt ? dateFmt.format(new Date(row.createdAt)) : ""],
    ["Last review", row.reviewed_at ? dateFmt.format(new Date(row.reviewed_at)) : "Not yet"],
  ];

  return (
    <Modal labelledBy="review-title" onClose={onClose} busy={busy} size="xl">
      {(close) => (
        <div className="review">
          <header className="review__head">
            <DocThumb token={token} userId={row.user_id} kind="selfie" has={row.documents?.includes("selfie")} className="review__avatar" />
            <div>
              <div className="review__tags">
                <span className={`pill pill--${row.status}`}>{STATUS_WORDS[row.status]}</span>
                {row.plate && <span className="plate">{row.plate}</span>}
              </div>
              <h2 id="review-title" className="modal__title">
                {name}
              </h2>
              <p className="modal__subtitle">Rotejo rider · {row.stage} stage</p>
            </div>
          </header>

          <div className="review__body">
            <section className="review__docs" aria-label="Documents">
              <h3 className="review__label">Documents</h3>
              <div className="review__gallery">
                {DOCUMENTS.map((doc) => (
                  <DocTile
                    key={doc.kind}
                    token={token}
                    userId={row.user_id}
                    doc={doc}
                    has={row.documents?.includes(doc.kind)}
                    onOpen={(url) => setZoom({ url, label: doc.label })}
                  />
                ))}
              </div>
              <p className="review__tip">Check the name and face on the ID match the selfie, and the plate matches the bike photo.</p>
            </section>

            <section aria-label="Details">
              <h3 className="review__label">Details</h3>
              <dl className="review__facts">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {row.review_note && (
                <p className="review__prior">
                  <strong>Last note to rider:</strong> {row.review_note}
                </p>
              )}
            </section>
          </div>

          {error && (
            <div className="modal__alert" role="alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {mode === "reject" ? (
            <div className="review__reject">
              <label htmlFor="reject-note" className="field__label">
                What should {first} fix?
              </label>
              <textarea
                id="reject-note"
                ref={noteRef}
                rows={3}
                value={note}
                maxLength={400}
                onChange={(event) => {
                  setNote(event.target.value);
                  setError("");
                }}
                placeholder="e.g. The licence photo is blurry. Retake it in good light."
              />
              <div className="modal__actions">
                <button
                  type="button"
                  className="modal__btn modal__btn--ghost"
                  onClick={() => {
                    setMode("view");
                    setError("");
                  }}
                  disabled={busy}
                >
                  Back
                </button>
                <button type="button" className="modal__btn review__btn--danger" onClick={() => submit("rejected", close)} disabled={busy}>
                  {busy ? <span className="modal__spinner" /> : <CrossIcon />}
                  Send back to rider
                </button>
              </div>
            </div>
          ) : (
            <div className="modal__actions review__actions">
              {row.status !== "rejected" && (
                <button type="button" className="modal__btn modal__btn--ghost review__btn--reject" onClick={() => setMode("reject")} disabled={busy}>
                  <CrossIcon /> {row.status === "approved" ? "Suspend" : "Reject"}
                </button>
              )}
              {row.status !== "approved" && (
                <button type="button" className="modal__btn review__btn--approve" onClick={() => submit("approved", close)} disabled={busy}>
                  {busy ? <span className="modal__spinner" /> : <CheckIcon />}
                  Approve {first}
                </button>
              )}
              {row.status === "approved" && (
                <button type="button" className="modal__btn modal__btn--primary" onClick={close}>
                  Done
                </button>
              )}
            </div>
          )}

          {zoom && <Lightbox photo={zoom} onClose={() => setZoom(null)} />}
        </div>
      )}
    </Modal>
  );
}

// Its own top-layer <dialog>, so it covers the whole screen rather than just the review card.
function Lightbox({ photo, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={photo.label}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === ref.current) onClose();
      }}
    >
      <figure>
        <img src={photo.url} alt={photo.label} />
        <figcaption>
          {photo.label}
          <button type="button" onClick={onClose}>
            Close
          </button>
        </figcaption>
      </figure>
    </dialog>
  );
}

function DocThumb({ token, userId, kind, has, className }) {
  const doc = useDocument(token, userId, kind, has);
  return <span className={className}>{doc.url ? <img src={doc.url} alt="" /> : <RiderIcon />}</span>;
}

function DocTile({ token, userId, doc, has, onOpen }) {
  const state = useDocument(token, userId, doc.kind, has);
  return (
    <button
      type="button"
      className={`doc doc--${state.status}`}
      onClick={() => state.url && onOpen(state.url)}
      disabled={!state.url}
      aria-label={state.url ? `Open ${doc.label}` : `${doc.label} not available`}
    >
      <span className="doc__frame">
        {state.url ? <img src={state.url} alt="" /> : state.status === "loading" ? <span className="doc__spin" /> : <span className="doc__missing">Missing</span>}
        {state.url && (
          <span className="doc__zoom">
            <ZoomIcon />
          </span>
        )}
      </span>
      <span className="doc__label">{doc.label}</span>
    </button>
  );
}

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

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

function ClockIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" />
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
