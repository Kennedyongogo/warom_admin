import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../auth.js";
import Modal from "../components/Modal.jsx";
import { dateTimeFmt, numberFmt } from "../utils/format.js";
import { showError, showSuccess } from "../utils/swal.js";
import { Pager, RoleTabs, SearchBox } from "./Users.jsx";
import { EyeIcon } from "./UserDialogs.jsx";
import "./pages.css";
import "./Users.css";
import "./Inquiries.css";

const PAGE_SIZES = [10, 25, 50];

const STATUS_TABS = [
  {
    id: "all",
    label: "All",
    noun: "inquiries",
    statKey: "all",
    hint: "Messages sent from the WAROM public site will appear here.",
    icon: <InboxIcon />,
  },
  {
    id: "new",
    label: "New",
    noun: "new inquiries",
    statKey: "new",
    hint: "Fresh inquiries waiting for a first look.",
    icon: <SparkIcon />,
  },
  {
    id: "read",
    label: "Read",
    noun: "read inquiries",
    statKey: "read",
    hint: "Inquiries that have been opened but not finished.",
    icon: <ReadIcon />,
  },
  {
    id: "replied",
    label: "Replied",
    noun: "replied inquiries",
    statKey: "replied",
    hint: "Inquiries marked as replied.",
    icon: <ReplyIcon />,
  },
  {
    id: "closed",
    label: "Closed",
    noun: "closed inquiries",
    statKey: "closed",
    hint: "Resolved or archived inquiries.",
    icon: <ClosedIcon />,
  },
];

const STATUS_LABELS = {
  new: "New",
  read: "Read",
  replied: "Replied",
  closed: "Closed",
};

export default function Inquiries() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();

  const active = STATUS_TABS.find((tab) => tab.id === params.get("status")) ?? STATUS_TABS[0];
  const query = params.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  const pageSize = PAGE_SIZES.find((size) => String(size) === params.get("size")) ?? PAGE_SIZES[0];
  const directoryRef = useRef(null);

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

  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState({ all: 0, new: 0, read: 0, replied: 0, closed: 0 });
  const [list, setList] = useState({ status: "loading", tab: null, rows: [], pagination: null, error: "" });
  const [selected, setSelected] = useState(null);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setList((prev) => ({ ...prev, status: "loading" }));

    const search = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      status: active.id,
    });
    if (query) search.set("q", query);

    api(`/api/admin/inquiries?${search}`, { token })
      .then((data) => {
        if (cancelled) return;
        if (data.stats) setStats(data.stats);
        setList({
          status: "ready",
          tab: active.id,
          rows: data.rows || [],
          pagination: data.pagination || null,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setList({ status: "error", tab: active.id, rows: [], pagination: null, error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [token, active.id, page, pageSize, query, reloadKey]);

  const lastPage = list.pagination?.totalPages ?? 0;
  useEffect(() => {
    if (list.status === "ready" && lastPage > 0 && page > lastPage) {
      updateParams({ page: lastPage > 1 ? lastPage : null });
    }
  }, [list.status, lastPage, page, updateParams]);

  const goToPage = (next) => {
    updateParams({ page: next > 1 ? next : null });
    const card = directoryRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onSearch = useCallback((value) => updateParams({ q: value, page: null }), [updateParams]);
  const clearSearch = () => {
    onSearch("");
    setSearchKey((k) => k + 1);
  };

  const counts = Object.fromEntries(
    STATUS_TABS.map((tab) => [tab.id, Number(stats?.[tab.statKey] ?? 0)])
  );
  const total = list.pagination?.total ?? 0;
  const showSkeleton = list.status === "loading" && list.tab !== active.id;
  const refreshing = list.status === "loading" && !showSkeleton;

  const openInquiry = async (row) => {
    try {
      const fresh = await api(`/api/admin/inquiries/${row.id}`, { token });
      setSelected(fresh);
      if (row.status === "new") {
        setList((prev) => ({
          ...prev,
          rows: prev.rows.map((item) =>
            item.id === row.id ? { ...item, status: "read" } : item
          ),
        }));
        setReloadKey((k) => k + 1);
      }
    } catch (error) {
      await showError("Couldn't open inquiry", error.message || "Please try again.");
    }
  };

  const onSaved = (updated) => {
    setList((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
    }));
    setReloadKey((k) => k + 1);
  };

  return (
    <section className="page users inquiries">
      <header className="users__head">
        <div>
          <h1 className="page__title">Inquiries</h1>
          <p className="page__subtitle">Messages received from the WAROM public site.</p>
        </div>
      </header>

      <RoleTabs
        tabs={STATUS_TABS}
        counts={counts}
        activeId={active.id}
        onSelect={(id) => updateParams({ status: id === "all" ? null : id, page: null })}
        label="Inquiry status"
      />

      <div
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        className={`directory${refreshing ? " is-refreshing" : ""}`}
        ref={directoryRef}
      >
        <div className="directory__bar">
          <div className="directory__title">
            <span className="directory__icon">{active.icon}</span>
            <div>
              <h2>{active.label}</h2>
              <p>
                {list.status === "ready"
                  ? query
                    ? `${numberFmt.format(total)} ${total === 1 ? "match" : "matches"} for “${query}”`
                    : `${numberFmt.format(total)} ${total === 1 ? "inquiry" : "inquiries"}`
                  : "Loading…"}
              </p>
            </div>
          </div>

          <div className="directory__tools">
            <SearchBox
              key={`${active.id}-${searchKey}`}
              value={query}
              onSearch={onSearch}
              placeholder={`Search ${active.noun}…`}
            />
          </div>
        </div>

        {list.status === "error" ? (
          <div className="directory__state">
            <span className="directory__state-icon directory__state-icon--danger">
              <AlertIcon />
            </span>
            <p className="directory__state-title">Couldn't load {active.noun}</p>
            <p className="directory__state-hint">{list.error}</p>
            <button type="button" className="btn" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        ) : showSkeleton ? (
          <InquiryTable rows={null} />
        ) : list.rows.length === 0 ? (
          <div className="directory__state">
            <span className="directory__state-icon">{query ? <SearchIcon /> : active.icon}</span>
            <p className="directory__state-title">{query ? "No matches found" : `No ${active.noun} yet`}</p>
            <p className="directory__state-hint">
              {query
                ? `Nothing in ${active.label.toLowerCase()} matches “${query}”.`
                : active.hint}
            </p>
            {query && (
              <button type="button" className="btn" onClick={clearSearch}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <InquiryTable rows={list.rows} onView={openInquiry} />
        )}

        {list.pagination && list.pagination.total > 0 && list.status !== "error" && (
          <Pager
            pagination={list.pagination}
            onPage={goToPage}
            onPageSize={(size) => updateParams({ size: size === PAGE_SIZES[0] ? null : size, page: null })}
          />
        )}
      </div>

      {selected && (
        <InquiryDialog
          key={selected.id}
          inquiry={selected}
          token={token}
          onClose={() => setSelected(null)}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}

function InquiryTable({ rows, onView }) {
  const items = rows ?? Array.from({ length: 5 }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <table className="utable inquiries__table">
      <thead>
        <tr>
          <th scope="col">From</th>
          <th scope="col">Subject</th>
          <th scope="col">Status</th>
          <th scope="col">Received</th>
          <th scope="col" className="utable__actions">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((row, index) =>
          rows ? (
            <tr key={row.id} style={{ "--i": index }} className={row.status === "new" ? "is-new" : undefined}>
              <td className="utable__user" data-label="From">
                <span className="inquiries__avatar" aria-hidden="true">
                  {(row.name || "?").charAt(0).toUpperCase()}
                </span>
                <div className="utable__who">
                  <strong>{row.name}</strong>
                  <a href={`mailto:${row.email}`}>{row.email}</a>
                </div>
              </td>
              <td data-label="Subject">
                <span className="inquiries__subject">{row.subject}</span>
                <span className="inquiries__preview">{row.message}</span>
              </td>
              <td data-label="Status">
                <span className={`inq-status inq-status--${row.status}`}>
                  {STATUS_LABELS[row.status] || row.status}
                </span>
              </td>
              <td data-label="Received">
                {(() => {
                  const receivedAt = row.created_at || row.createdAt;
                  return receivedAt ? dateTimeFmt.format(new Date(receivedAt)) : "—";
                })()}
              </td>
              <td className="utable__actions">
                <div className="row-actions">
                  <button
                    type="button"
                    className="row-action"
                    onClick={() => onView(row)}
                    aria-label={`View inquiry from ${row.name}`}
                    title="View inquiry"
                  >
                    <EyeIcon />
                    <span className="row-action__label" aria-hidden="true">
                      View
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={row.id} className="utable__skeleton" aria-hidden="true">
              <td className="utable__user">
                <span className="skeleton skeleton--avatar" />
                <div className="utable__who">
                  <span className="skeleton skeleton--name" />
                  <span className="skeleton skeleton--line" />
                </div>
              </td>
              <td>
                <span className="skeleton skeleton--line" />
              </td>
              <td>
                <span className="skeleton skeleton--pill" />
              </td>
              <td>
                <span className="skeleton skeleton--line" />
              </td>
              <td className="utable__actions">
                <span className="skeleton skeleton--action" />
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

function InquiryDialog({ inquiry, token, onClose, onSaved }) {
  const initialStatus = inquiry.status || "read";
  const initialNotes = inquiry.admin_notes || "";
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);

  const replyLocked = initialStatus === "replied" || initialStatus === "closed";
  const dirty = status !== initialStatus || (!replyLocked && notes !== initialNotes);
  const showCloseStatus = initialStatus === "replied";
  const statusClosed = status === "closed";

  useEffect(() => {
    if (!statusMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (!statusMenuRef.current?.contains(event.target)) setStatusMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [statusMenuOpen]);

  const onReplyChange = (value) => {
    if (replyLocked) return;
    setNotes(value);
    if (value.trim()) {
      setStatus("replied");
      return;
    }
    setStatus(initialStatus === "new" ? "read" : initialStatus);
  };

  const onSubmit = async (event, close) => {
    event.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const nextStatus = notes.trim() && status !== "closed" ? "replied" : status;
      const updated = await api(`/api/admin/inquiries/${inquiry.id}`, {
        token,
        method: "PATCH",
        body: { status: nextStatus, admin_notes: notes },
      });
      onSaved(updated);
      setSaving(false);
      close();
      await new Promise((resolve) => setTimeout(resolve, 220));
      await showSuccess("Inquiry updated", "Your changes were saved.");
    } catch (error) {
      setSaving(false);
      const dialog = document.querySelector("dialog.modal[open]");
      await showError("Couldn't update inquiry", error.message || "Please try again.", {
        target: dialog || document.body,
      });
    }
  };

  return (
    <Modal labelledBy="inquiry-title" onClose={onClose} busy={saving} size="wide" fit>
      {(close) => (
        <form className="inquiry-dialog" onSubmit={(event) => onSubmit(event, close)} noValidate>
          <header className="inquiry-dialog__head">
            <div className="inquiry-dialog__intro">
              <div className="inquiry-dialog__top">
                <p className="inquiry-dialog__eyebrow">Public inquiry</p>
                <span className={`inq-status inq-status--${status}`}>
                  {STATUS_LABELS[status] || status}
                </span>
              </div>
              <h2 id="inquiry-title" className="modal__title">
                {inquiry.subject}
              </h2>
              <p className="inquiry-dialog__meta">
                From <strong>{inquiry.name}</strong> ·{" "}
                <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                {inquiry.created_at || inquiry.createdAt
                  ? ` · ${dateTimeFmt.format(new Date(inquiry.created_at || inquiry.createdAt))}`
                  : ""}
              </p>
            </div>
          </header>

          <div className="inquiry-dialog__message">
            <h3>Message</h3>
            <p>{inquiry.message}</p>
          </div>

          <div className="modal__fields">
            <label className={`inquiry-dialog__notes${replyLocked ? " is-locked" : ""}`} htmlFor="inquiry-notes">
              <span>Reply</span>
              <textarea
                id="inquiry-notes"
                rows={4}
                value={notes}
                onChange={(event) => onReplyChange(event.target.value)}
                placeholder="Type your reply here…"
                readOnly={replyLocked}
                disabled={replyLocked}
              />
              <em className="inquiry-dialog__hint">
                {replyLocked
                  ? "This reply is locked and can no longer be edited."
                  : "Typing a reply marks this inquiry as replied."}
              </em>
            </label>

            {showCloseStatus && (
              <div className="inquiry-status-field" ref={statusMenuRef}>
                <span className="inquiry-status-field__label" id="inquiry-status-label">
                  Status
                </span>
                <div className={`inquiry-status-menu${statusMenuOpen ? " is-open" : ""}${statusClosed ? " is-closed" : ""}`}>
                  <button
                    type="button"
                    id="inquiry-status"
                    className="inquiry-status-menu__trigger"
                    aria-labelledby="inquiry-status-label"
                    aria-haspopup="listbox"
                    aria-expanded={statusMenuOpen}
                    aria-controls="inquiry-status-list"
                    onClick={() => setStatusMenuOpen((open) => !open)}
                  >
                    <span className={`inquiry-status-menu__icon inquiry-status-menu__icon--${statusClosed ? "closed" : "replied"}`}>
                      {statusClosed ? <ClosedIcon /> : <ReplyIcon />}
                    </span>
                    <span className="inquiry-status-menu__copy">
                      <strong>{statusClosed ? "Closed" : "Choose next status"}</strong>
                      <small>
                        {statusClosed
                          ? "This inquiry will be archived when you save."
                          : "Mark this inquiry closed when you’re done."}
                      </small>
                    </span>
                    <span className="inquiry-status-menu__chevron" aria-hidden="true">
                      <ChevronIcon />
                    </span>
                  </button>

                  {statusMenuOpen && (
                    <div
                      id="inquiry-status-list"
                      className="inquiry-status-menu__panel"
                      role="listbox"
                      aria-label="Status options"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={statusClosed}
                        className={`inquiry-status-menu__option${statusClosed ? " is-selected" : ""}`}
                        onClick={() => {
                          setStatus("closed");
                          setStatusMenuOpen(false);
                        }}
                      >
                        <span className="inquiry-status-menu__option-icon" aria-hidden="true">
                          <ClosedIcon />
                        </span>
                        <span className="inquiry-status-menu__option-copy">
                          <strong>Closed</strong>
                          <small>Resolve and archive this inquiry.</small>
                        </span>
                        {statusClosed && (
                          <span className="inquiry-status-menu__check" aria-hidden="true">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal__actions">
            <button type="button" className="modal__btn modal__btn--ghost" onClick={close} disabled={saving}>
              Close
            </button>
            <button type="submit" className="modal__btn modal__btn--primary" disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </Modal>
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

function InboxIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 6h16v12H4z" />
      <path d="m4 10 8 5 8-5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg {...svgProps}>
      <path d="M12 3v4M12 17v4M4.9 5.9l2.8 2.8M16.3 15.3l2.8 2.8M3 12h4M17 12h4M4.9 18.1l2.8-2.8M16.3 8.7l2.8-2.8" />
    </svg>
  );
}

function ReadIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 6h16v12H4z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg {...svgProps}>
      <path d="M9 14 4 9l5-5" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function ClosedIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="m9 12 2 2 4-4" />
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

function SearchIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}
