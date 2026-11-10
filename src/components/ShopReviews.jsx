import { useEffect, useState } from "react";
import { api, mediaUrl } from "../auth.js";
import "./ShopReviews.css";

const STAR_PATH = "M12 2.8 14.8 8.5l6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2-4.6-4.4 6.3-.9L12 2.8Z";
const PAGE_SIZE = 10;
const MAX_REPLY = 1000;
const SORTS = [
  ["newest", "Newest"],
  ["highest", "Highest rated"],
  ["lowest", "Lowest rated"],
];
const EMPTY_SUMMARY = { average: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });
const STEPS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function timeAgo(value) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

/**
 * Customer reviews of one shop, read-only. `endpoint` returns `{ summary, data, pagination }`
 * and accepts `page`, `limit`, `sort` and `rating` query params.
 */
export default function ShopReviews({ endpoint, token, shop, canReply = false, title = "Customer reviews" }) {
  const [sort, setSort] = useState("newest");
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ status: "loading", summary: null, rows: [], total: 0, totalPages: 0, error: "" });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
    if (rating) params.set("rating", String(rating));
    setState((prev) => ({ ...prev, status: page === 1 ? "loading" : "more", error: "" }));

    api(`${endpoint}?${params}`, { token, raw: true })
      .then((result) => {
        if (cancelled) return;
        setState((prev) => ({
          status: "ready",
          summary: result.summary ?? EMPTY_SUMMARY,
          rows: page === 1 ? result.data : [...prev.rows, ...result.data],
          total: result.pagination?.total ?? result.data.length,
          totalPages: result.pagination?.totalPages ?? 1,
          error: "",
        }));
      })
      .catch((error) => !cancelled && setState((prev) => ({ ...prev, status: "error", error: error.message })));
    return () => {
      cancelled = true;
    };
  }, [endpoint, token, sort, rating, page, reloadKey]);

  const summary = state.summary ?? EMPTY_SUMMARY;
  const filterBy = (stars) => {
    setRating(stars);
    setPage(1);
  };

  return (
    <section className="reviews-panel" aria-labelledby="reviews-panel-title">
      <header className="reviews-panel__head">
        <div>
          <h2 id="reviews-panel-title">{title}</h2>
          <p>
            Every review customers post on the Kabi site, signed in or anonymous. They go live straight away
            {canReply ? ", and your replies show publicly under them." : "."}
          </p>
        </div>
        {summary.total > 0 && (
          <label className="reviews-panel__sort">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {state.status === "loading" && !state.summary ? (
        <div className="reviews-panel__body" aria-busy="true">
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line" />
        </div>
      ) : state.status === "error" && !state.rows.length ? (
        <div className="reviews-panel__empty">
          <p>Couldn't load reviews. {state.error}</p>
          <button type="button" className="btn" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      ) : summary.total === 0 ? (
        <div className="reviews-panel__empty">
          <span className="reviews-panel__empty-icon">
            <Stars value={0} size={22} label="No ratings yet" />
          </span>
          <p>
            <strong>No reviews yet.</strong> When customers rate this shop on the Kabi site, their reviews will appear here.
          </p>
        </div>
      ) : (
        <div className="reviews-panel__body">
          <RatingSummary summary={summary} active={rating} onPick={filterBy} />

          {rating > 0 && (
            <p className="reviews-panel__filter">
              Showing {state.total} {rating}-star {state.total === 1 ? "review" : "reviews"}
              <button type="button" onClick={() => filterBy(0)}>
                Show all
              </button>
            </p>
          )}

          <div className={`reviews-panel__list${state.status === "loading" ? " is-busy" : ""}`}>
            {state.rows.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                shop={shop}
                replyEndpoint={canReply ? `${endpoint}/${review.id}/reply` : null}
                token={token}
                onChange={(updated) =>
                  setState((prev) => ({ ...prev, rows: prev.rows.map((row) => (row.id === updated.id ? updated : row)) }))
                }
              />
            ))}
          </div>

          {state.status === "error" && <p className="reviews-panel__error">{state.error}</p>}

          {page < state.totalPages && (
            <button
              type="button"
              className="btn reviews-panel__more"
              disabled={state.status === "more"}
              onClick={() => setPage((p) => p + 1)}
            >
              {state.status === "more" ? "Loading…" : `Show more (${state.total - state.rows.length} left)`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Star({ fill, size }) {
  const id = `star-${Math.round(fill * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--star)" />
          <stop offset={`${fill * 100}%`} stopColor="#e3dacd" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} fill={`url(#${id})`} />
    </svg>
  );
}

export function Stars({ value, size = 16, label }) {
  const rounded = Math.round(value * 10) / 10;
  return (
    <span className="stars" role="img" aria-label={label ?? `${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={Math.max(0, Math.min(1, value - (n - 1)))} />
      ))}
    </span>
  );
}

function RatingSummary({ summary, active, onPick }) {
  const { average, total, breakdown } = summary;
  return (
    <div className="rsum">
      <div className="rsum__score">
        <strong>{average.toFixed(1)}</strong>
        <Stars value={average} size={20} />
        <span>
          {total} {total === 1 ? "review" : "reviews"}
        </span>
      </div>
      <ul className="rsum__bars">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = breakdown[stars] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <li key={stars}>
              <button
                type="button"
                className={`rsum__bar${active === stars ? " is-on" : ""}`}
                onClick={() => onPick(active === stars ? 0 : stars)}
                aria-pressed={active === stars}
                disabled={!count && active !== stars}
                title={`Show ${stars}-star reviews`}
              >
                <span className="rsum__label">{stars} ★</span>
                <span className="rsum__track">
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="rsum__count">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ review, shop, replyEndpoint, token, onChange }) {
  const name = review.is_anonymous ? "Anonymous" : review.author_name;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");

  const startEditing = () => {
    setDraft(review.reply?.text ?? "");
    setError("");
    setEditing(true);
  };

  const send = async (method) => {
    setBusy(true);
    setError("");
    try {
      const updated = await api(replyEndpoint, { token, method, body: method === "PUT" ? { reply: draft.trim() } : undefined });
      onChange(updated);
      setEditing(false);
      setConfirmRemove(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rcard">
      <header className="rcard__head">
        <span className={`rcard__avatar${review.is_anonymous ? " is-anon" : ""}`} aria-hidden="true">
          {review.is_anonymous ? "?" : initials(name)}
        </span>
        <div className="rcard__who">
          <strong>{name}</strong>
          <span>{review.is_anonymous ? "Posted anonymously" : "Kabi member"}</span>
        </div>
        <time className="rcard__time" dateTime={review.createdAt} title={fullDate.format(new Date(review.createdAt))}>
          {timeAgo(review.createdAt)}
        </time>
      </header>
      <Stars value={review.rating} size={16} />
      {review.comment ? <p className="rcard__text">{review.comment}</p> : <p className="rcard__text is-empty">Rated without a comment.</p>}

      {editing ? (
        <form
          className="rreply-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) send("PUT");
          }}
        >
          <label className="sr-only" htmlFor={`reply-${review.id}`}>
            Your reply
          </label>
          <textarea
            id={`reply-${review.id}`}
            rows={3}
            maxLength={MAX_REPLY}
            value={draft}
            autoFocus
            placeholder="Thank the customer or respond to their feedback. Your reply is public."
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="rreply-form__bar">
            <small>
              {draft.length}/{MAX_REPLY}
            </small>
            <button type="button" className="rreply-btn" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="rreply-btn rreply-btn--primary" disabled={busy || !draft.trim()}>
              {busy ? "Posting…" : review.reply ? "Save reply" : "Post reply"}
            </button>
          </div>
        </form>
      ) : review.reply ? (
        <div className="rreply">
          <span className="rreply__avatar" aria-hidden="true">
            {shop?.logo_url ? <img src={mediaUrl(shop.logo_url)} alt="" /> : <ReplyIcon />}
          </span>
          <div className="rreply__body">
            <div className="rreply__head">
              <strong>{shop?.name ?? "Shop"}</strong>
              <span className="rreply__badge">Owner</span>
              <time dateTime={review.reply.createdAt} title={fullDate.format(new Date(review.reply.createdAt))}>
                {timeAgo(review.reply.createdAt)}
              </time>
            </div>
            <p>{review.reply.text}</p>
            {replyEndpoint &&
              (confirmRemove ? (
                <div className="rreply__actions">
                  <span>Remove your reply?</span>
                  <button type="button" className="rreply-link rreply-link--danger" onClick={() => send("DELETE")} disabled={busy}>
                    {busy ? "Removing…" : "Remove"}
                  </button>
                  <button type="button" className="rreply-link" onClick={() => setConfirmRemove(false)} disabled={busy}>
                    Keep
                  </button>
                </div>
              ) : (
                <div className="rreply__actions">
                  <button type="button" className="rreply-link" onClick={startEditing}>
                    Edit
                  </button>
                  <button type="button" className="rreply-link rreply-link--danger" onClick={() => setConfirmRemove(true)}>
                    Remove
                  </button>
                </div>
              ))}
          </div>
        </div>
      ) : (
        replyEndpoint && (
          <button type="button" className="rreply-btn rreply-start" onClick={startEditing}>
            <ReplyIcon /> Reply
          </button>
        )
      )}
      {error && <p className="reviews-panel__error">{error}</p>}
    </article>
  );
}

function ReplyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
