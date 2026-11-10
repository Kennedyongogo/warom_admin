import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../auth.js";
import Avatar from "../components/Avatar.jsx";
import { dateFmt, numberFmt, timeAgo } from "../utils/format.js";
import CreateShopOwnerDialog from "./CreateShopOwnerDialog.jsx";
import { EditUserDialog, EyeIcon, PencilIcon, ViewUserDialog } from "./UserDialogs.jsx";
import "./pages.css";
import "./Users.css";

const PAGE_SIZES = [10, 25, 50];

const ROLE_TABS = [
  {
    id: "customer",
    label: "Customers",
    noun: "customers",
    statKey: "totalCustomers",
    hint: "People who order gas, water and food on Kabi will appear here.",
    icon: <CustomerIcon />,
  },
  {
    id: "rotejo_rider",
    label: "Rotejo riders",
    noun: "Rotejo riders",
    statKey: "totalRotejoRiders",
    hint: "Independent riders on the Rotejo network will appear here.",
    icon: <RiderIcon />,
  },
  {
    id: "shop_rider",
    label: "Shop riders",
    noun: "shop riders",
    statKey: "totalShopRiders",
    hint: "Riders attached to a specific shop will appear here.",
    icon: <BagIcon />,
  },
  {
    id: "shop_owner",
    label: "Shop owners",
    noun: "shop owners",
    statKey: "totalShopOwners",
    hint: "Vendors who run shops on Kabi will appear here.",
    icon: <StoreIcon />,
  },
  {
    id: "staff",
    label: "Staff",
    noun: "staff",
    statKey: "totalStaff",
    hint: "Shop staff helping owners manage orders will appear here.",
    icon: <BadgeIcon />,
  },
  {
    id: "super_admin",
    label: "Super admins",
    noun: "super admins",
    statKey: "totalSuperAdmins",
    hint: "People with full access to the Kabi platform will appear here.",
    icon: <ShieldIcon />,
  },
];

// Tabs that use the compact No / Name / Email / Actions table.
const COMPACT_TABS = ["shop_owner", "super_admin"];

export default function Users() {
  const { user: me, token, onUserUpdate } = useOutletContext();
  const [params, setParams] = useSearchParams();

  const active = ROLE_TABS.find((tab) => tab.id === params.get("role")) ?? ROLE_TABS[0];
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
  const [creating, setCreating] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api("/api/users/dashboard/stats", { token })
      .then((data) => !cancelled && setStats(data.stats))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const [list, setList] = useState({ status: "loading", role: null, rows: [], pagination: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    setList((prev) => ({ ...prev, status: "loading" }));
    const search = new URLSearchParams({
      role: active.id,
      page,
      limit: pageSize,
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
    if (query) search.set("search", query);

    api(`/api/users?${search}`, { token, raw: true })
      .then((res) => {
        if (cancelled) return;
        setList({ status: "ready", role: active.id, rows: res.data, pagination: res.pagination, error: "" });
      })
      .catch((error) => {
        if (cancelled) return;
        setList({ status: "error", role: active.id, rows: [], pagination: null, error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [token, active.id, page, pageSize, query, reloadKey]);

  const onUserSaved = (updated) => {
    if (updated.id === me.id) onUserUpdate(updated);
    setList((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
    }));
    setReloadKey((k) => k + 1);
    setToast({ id: Date.now(), message: `${updated.full_name.split(" ")[0]}'s details were saved.` });
  };

  // A stale link or a shrinking list can leave us past the last page.
  const lastPage = list.pagination?.totalPages ?? 0;
  useEffect(() => {
    if (list.status === "ready" && lastPage > 0 && page > lastPage) {
      updateParams({ page: lastPage > 1 ? lastPage : null });
    }
  }, [list.status, lastPage, page, updateParams]);

  const goToPage = (next) => {
    updateParams({ page: next > 1 ? next : null });
    const card = directoryRef.current;
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onSearch = useCallback((value) => updateParams({ q: value, page: null }), [updateParams]);
  const [searchKey, setSearchKey] = useState(0);
  const clearSearch = () => {
    onSearch("");
    setSearchKey((k) => k + 1);
  };

  const counts = stats
    ? Object.fromEntries(ROLE_TABS.map((tab) => [tab.id, stats[tab.statKey] ?? 0]))
    : null;
  const total = list.pagination?.total ?? 0;
  const compact = COMPACT_TABS.includes(active.id);
  const startIndex = list.pagination ? (list.pagination.page - 1) * list.pagination.limit : 0;
  const showSkeleton = list.status === "loading" && list.role !== active.id;
  const refreshing = list.status === "loading" && !showSkeleton;

  return (
    <section className="page users">
      <header className="users__head">
        <h1 className="page__title">Users</h1>
        {active.id === "shop_owner" && (
          <button type="button" className="users__create" onClick={() => setCreating(true)}>
            <PlusIcon />
            <span>New shop owner</span>
          </button>
        )}
      </header>

      {creating && (
        <CreateShopOwnerDialog
          token={token}
          onClose={() => setCreating(false)}
          onCreated={() => {
            updateParams({ page: null, q: null });
            setSearchKey((k) => k + 1);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      <RoleTabs
        tabs={ROLE_TABS}
        counts={counts}
        activeId={active.id}
        onSelect={(id) => updateParams({ role: id, page: null })}
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
                    : `${numberFmt.format(total)} ${total === 1 ? "account" : "accounts"}`
                  : "Loading…"}
              </p>
            </div>
          </div>

          <div className="directory__tools">
            <SearchBox key={`${active.id}-${searchKey}`} value={query} onSearch={onSearch} placeholder={`Search ${active.noun}…`} />
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
              <RefreshIcon /> Try again
            </button>
          </div>
        ) : showSkeleton ? (
          compact ? <CompactUserTable rows={null} me={me} /> : <UserTable rows={null} me={me} />
        ) : list.rows.length === 0 ? (
          <div className="directory__state">
            <span className="directory__state-icon">{query ? <SearchIcon /> : active.icon}</span>
            <p className="directory__state-title">{query ? "No matches found" : `No ${active.noun} yet`}</p>
            <p className="directory__state-hint">
              {query ? `Nobody in ${active.label.toLowerCase()} matches “${query}”. Try a name, email or phone number.` : active.hint}
            </p>
            {query && (
              <button type="button" className="btn" onClick={clearSearch}>
                Clear search
              </button>
            )}
          </div>
        ) : compact ? (
          <CompactUserTable
            rows={list.rows}
            me={me}
            startIndex={startIndex}
            onView={(person) => setDialog({ type: "view", user: person })}
            onEdit={(person) => setDialog({ type: "edit", user: person })}
          />
        ) : (
          <UserTable rows={list.rows} me={me} />
        )}

        {list.pagination && list.pagination.total > 0 && list.status !== "error" && (
          <Pager
            pagination={list.pagination}
            onPage={goToPage}
            onPageSize={(size) => updateParams({ size: size === PAGE_SIZES[0] ? null : size, page: null })}
          />
        )}
      </div>

      {dialog?.type === "view" && (
        <ViewUserDialog
          key={`view-${dialog.user.id}`}
          user={dialog.user}
          token={token}
          me={me}
          onClose={() => setDialog(null)}
          onEdit={(person) => setDialog({ type: "edit", user: person })}
        />
      )}
      {dialog?.type === "edit" && (
        <EditUserDialog
          key={`edit-${dialog.user.id}`}
          user={dialog.user}
          token={token}
          me={me}
          onClose={() => setDialog(null)}
          onSaved={onUserSaved}
        />
      )}

      {toast && (
        <div key={toast.id} className="toast" role="status">
          <CheckCircleIcon />
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}

function CompactUserTable({ rows, me, startIndex = 0, onView, onEdit }) {
  const items = rows ?? Array.from({ length: 4 }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <table className="utable utable--compact">
      <thead>
        <tr>
          <th scope="col" className="utable__no">No</th>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col" className="utable__actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((person, index) =>
          rows ? (
            <tr key={person.id} style={{ "--i": index }}>
              <td className="utable__no">
                <span className="utable__num">{startIndex + index + 1}</span>
              </td>
              <td className="utable__user">
                <Avatar user={person} size="sm" />
                <div className="utable__who">
                  <strong>
                    <span className="utable__name">{person.full_name}</span>
                    {person.id === me.id && <span className="you">You</span>}
                  </strong>
                </div>
              </td>
              <td className="utable__email" data-label="Email">
                <a href={`mailto:${person.email}`}>{person.email}</a>
              </td>
              <td className="utable__actions">
                <div className="row-actions">
                  <button
                    type="button"
                    className="row-action"
                    onClick={() => onView(person)}
                    aria-label={`View ${person.full_name}'s details`}
                    title="View details"
                  >
                    <EyeIcon />
                    <span className="row-action__label" aria-hidden="true">View</span>
                  </button>
                  <button
                    type="button"
                    className="row-action row-action--edit"
                    onClick={() => onEdit(person)}
                    aria-label={`Edit ${person.full_name}'s details`}
                    title="Edit details"
                  >
                    <PencilIcon />
                    <span className="row-action__label" aria-hidden="true">Edit</span>
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={person.id} className="utable__skeleton" aria-hidden="true">
              <td className="utable__no">
                <span className="skeleton skeleton--num" />
              </td>
              <td className="utable__user">
                <span className="skeleton skeleton--avatar" />
                <span className="skeleton skeleton--name" />
              </td>
              <td className="utable__email">
                <span className="skeleton skeleton--line" />
              </td>
              <td className="utable__actions">
                <div className="row-actions">
                  <span className="skeleton skeleton--action" />
                  <span className="skeleton skeleton--action" />
                </div>
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

// Always shows the first and last page plus a window around the current one, e.g. 1 … 4 5 6 … 12.
function pageItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);
  if (page <= 3) end = 5;
  if (page >= totalPages - 2) start = totalPages - 4;
  // An ellipsis that would hide a single page shows that page instead.
  if (start === 3) start = 2;
  if (end === totalPages - 2) end = totalPages - 1;
  const items = [1];
  if (start > 2) items.push("gap-start");
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < totalPages - 1) items.push("gap-end");
  items.push(totalPages);
  return items;
}

export function Pager({ pagination, onPage, onPageSize, sizes = PAGE_SIZES }) {
  const { page, limit, total, totalPages } = pagination;
  const hasPrev = pagination.hasPrevPage ?? page > 1;
  const hasNext = pagination.hasNextPage ?? page < totalPages;
  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  return (
    <footer className="pager">
      <div className="pager__meta">
        <span className="pager__info">
          Showing <strong>{numberFmt.format(from)}</strong>–<strong>{numberFmt.format(to)}</strong> of{" "}
          <strong>{numberFmt.format(total)}</strong>
        </span>
        <label className="pager__size">
          <span>Rows</span>
          <span className="select select--sm">
            <select value={limit} onChange={(event) => onPageSize(Number(event.target.value))} aria-label="Rows per page">
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </span>
        </label>
      </div>

      {totalPages > 1 && (
        <nav className="pager__controls" aria-label="Pagination">
          <button
            type="button"
            className="pager__btn"
            onClick={() => onPage(page - 1)}
            disabled={!hasPrev}
            aria-label="Previous page"
          >
            <ArrowIcon direction="left" />
          </button>

          <ol className="pager__pages">
            {pageItems(page, totalPages).map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <button
                    type="button"
                    className={`pager__num${item === page ? " is-current" : ""}`}
                    onClick={() => item !== page && onPage(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                  >
                    {item}
                  </button>
                </li>
              ) : (
                <li key={item} className="pager__gap" aria-hidden="true">
                  …
                </li>
              )
            )}
          </ol>

          <span className="pager__compact">
            Page <strong>{page}</strong> of {totalPages}
          </span>

          <button
            type="button"
            className="pager__btn"
            onClick={() => onPage(page + 1)}
            disabled={!hasNext}
            aria-label="Next page"
          >
            <ArrowIcon direction="right" />
          </button>
        </nav>
      )}
    </footer>
  );
}

export function SearchBox({ value, onSearch, placeholder }) {
  const [text, setText] = useState(value);

  useEffect(() => {
    if (text.trim() === value) return undefined;
    const id = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text, value, onSearch]);

  return (
    <label className="search">
      <SearchIcon />
      <span className="sr-only">Search</span>
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {text && (
        <button
          type="button"
          className="search__clear"
          onClick={() => {
            setText("");
            onSearch("");
          }}
          aria-label="Clear search"
        >
          <CloseIcon />
        </button>
      )}
    </label>
  );
}

function UserTable({ rows, me }) {
  const items = rows ?? Array.from({ length: 5 }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <table className="utable">
      <thead>
        <tr>
          <th scope="col">User</th>
          <th scope="col">Phone</th>
          <th scope="col">Status</th>
          <th scope="col">Last active</th>
          <th scope="col">Joined</th>
        </tr>
      </thead>
      <tbody>
        {items.map((person, index) =>
          rows ? (
            <tr key={person.id} style={{ "--i": index }}>
              <td className="utable__user">
                <Avatar user={person} size="sm" />
                <div className="utable__who">
                  <strong>
                    {person.full_name}
                    {person.id === me.id && <span className="you">You</span>}
                  </strong>
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                </div>
              </td>
              <td data-label="Phone">
                {person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : <span className="muted">—</span>}
              </td>
              <td data-label="Status">
                <span className={`status ${person.is_active ? "status--on" : "status--off"}`}>
                  {person.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td data-label="Last active" title={person.last_login ? new Date(person.last_login).toLocaleString() : undefined}>
                {timeAgo(person.last_login)}
              </td>
              <td data-label="Joined">{person.createdAt ? dateFmt.format(new Date(person.createdAt)) : "—"}</td>
            </tr>
          ) : (
            <tr key={person.id} className="utable__skeleton" aria-hidden="true">
              <td className="utable__user">
                <span className="skeleton skeleton--avatar" />
                <div className="utable__who">
                  <span className="skeleton skeleton--name" />
                  <span className="skeleton skeleton--line" />
                </div>
              </td>
              <td><span className="skeleton skeleton--line" /></td>
              <td><span className="skeleton skeleton--pill" /></td>
              <td><span className="skeleton skeleton--line" /></td>
              <td><span className="skeleton skeleton--line" /></td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

export function RoleTabs({ tabs, counts, activeId, onSelect, label = "User roles" }) {
  const trackRef = useRef(null);
  const tabRefs = useRef({});
  const [edges, setEdges] = useState({ overflow: false, prev: false, next: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({
      overflow: max > 1,
      prev: track.scrollLeft > 1,
      next: track.scrollLeft < max - 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", measure);
    };
  }, [measure]);

  // Counts arriving change tab widths, so re-measure the overflow.
  useEffect(measure, [counts, measure]);

  // Keep the selected tab fully visible inside the track without scrolling the page.
  useEffect(() => {
    const track = trackRef.current;
    const tab = tabRefs.current[activeId];
    if (!track || !tab) return;
    const gutter = 12;
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left - gutter < track.scrollLeft) {
      track.scrollTo({ left: left - gutter, behavior: "smooth" });
    } else if (right + gutter > track.scrollLeft + track.clientWidth) {
      track.scrollTo({ left: right + gutter - track.clientWidth, behavior: "smooth" });
    }
  }, [activeId]);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    track.scrollBy({ left: direction * track.clientWidth * 0.7, behavior: "smooth" });
  };

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const nextIndex = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    const id = tabs[nextIndex].id;
    onSelect(id);
    tabRefs.current[id]?.focus();
  };

  const className = [
    "role-tabs",
    edges.overflow && "is-overflowing",
    edges.prev && "can-prev",
    edges.next && "can-next",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <button
        type="button"
        className="role-tabs__arrow"
        onClick={() => scrollByPage(-1)}
        disabled={!edges.prev}
        aria-label="Scroll tabs back"
        tabIndex={-1}
      >
        <ArrowIcon direction="left" />
      </button>

      <div className="role-tabs__track" ref={trackRef} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={`role-tab${selected ? " is-active" : ""}`}
              onClick={() => onSelect(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {counts && counts[tab.id] !== undefined && <span className="role-tab__count">{numberFmt.format(counts[tab.id])}</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="role-tabs__arrow"
        onClick={() => scrollByPage(1)}
        disabled={!edges.next}
        aria-label="Scroll tabs forward"
        tabIndex={-1}
      >
        <ArrowIcon direction="right" />
      </button>
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

function ArrowIcon({ direction }) {
  return (
    <svg {...svgProps}>
      <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...svgProps} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg {...svgProps} width={16} height={16} className="select__chevron">
      <path d="m6 9 6 6 6-6" />
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

function CloseIcon() {
  return (
    <svg {...svgProps} width={14} height={14} strokeWidth={2.2}>
      <path d="M6 6l12 12M18 6 6 18" />
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

function CustomerIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
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

function BagIcon() {
  return (
    <svg {...svgProps}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 9.5 5.5 4h13L20 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M9 6V4h6v2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...svgProps}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
