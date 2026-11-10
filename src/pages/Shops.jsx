import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../auth.js";
import { CategoryChips, ShopLogo } from "../components/ShopProfile.jsx";
import { numberFmt, timeAgo } from "../utils/format.js";
import { SHOP_CATEGORIES, telUrl } from "../utils/shop.jsx";
import { Pager, RoleTabs, SearchBox } from "./Users.jsx";
import "./pages.css";
import "./Users.css";
import "./Shops.css";

const PAGE_SIZES = [12, 24, 48];

const TABS = [
  { id: "all", label: "All shops", icon: <StoreIcon /> },
  ...SHOP_CATEGORIES.map((category) => ({ id: category.id, label: category.label, icon: category.icon })),
];

export default function Shops() {
  const { token } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const directoryRef = useRef(null);

  const active = TABS.find((tab) => tab.id === params.get("category")) ?? TABS[0];
  const query = params.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  const pageSize = PAGE_SIZES.find((size) => String(size) === params.get("size")) ?? PAGE_SIZES[0];

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
  const { search } = useLocation();
  const [list, setList] = useState({ status: "loading", tab: null, rows: [], stats: null, pagination: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    setList((prev) => ({ ...prev, status: "loading" }));
    const search = new URLSearchParams({ page, limit: pageSize });
    if (active.id !== "all") search.set("category", active.id);
    if (query) search.set("search", query);

    api(`/api/shops?${search}`, { token, raw: true })
      .then((res) => {
        if (cancelled) return;
        setList({ status: "ready", tab: active.id, rows: res.data, stats: res.stats, pagination: res.pagination, error: "" });
      })
      .catch((error) => {
        if (cancelled) return;
        setList((prev) => ({ ...prev, status: "error", tab: active.id, rows: [], pagination: null, error: error.message }));
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
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onSearch = useCallback((value) => updateParams({ q: value, page: null }), [updateParams]);
  const [searchKey, setSearchKey] = useState(0);
  const clearSearch = () => {
    onSearch("");
    setSearchKey((k) => k + 1);
  };

  const counts = list.stats ? { all: list.stats.total, ...list.stats } : null;
  const total = list.pagination?.total ?? 0;
  const showSkeleton = list.status === "loading" && list.tab !== active.id;
  const refreshing = list.status === "loading" && !showSkeleton;
  const noun = active.id === "all" ? "shops" : `${active.label.toLowerCase()} shops`;

  return (
    <section className="page users">
      <header className="users__head">
        <div>
          <h1 className="page__title">Shops</h1>
          <p className="page__subtitle">Every shop on Kabi and how to reach them.</p>
        </div>
      </header>

      <RoleTabs
        tabs={TABS}
        counts={counts}
        activeId={active.id}
        onSelect={(id) => updateParams({ category: id === "all" ? null : id, page: null })}
        label="Shop categories"
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
                    : `${numberFmt.format(total)} ${total === 1 ? "shop" : "shops"}`
                  : "Loading…"}
              </p>
            </div>
          </div>
          <div className="directory__tools">
            <SearchBox key={`${active.id}-${searchKey}`} value={query} onSearch={onSearch} placeholder="Search name, address, phone…" />
          </div>
        </div>

        {list.status === "error" ? (
          <div className="directory__state">
            <span className="directory__state-icon directory__state-icon--danger">
              <AlertIcon />
            </span>
            <p className="directory__state-title">Couldn't load {noun}</p>
            <p className="directory__state-hint">{list.error}</p>
            <button type="button" className="btn" onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshIcon /> Try again
            </button>
          </div>
        ) : showSkeleton ? (
          <div className="sgrid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="scard scard--skeleton" aria-hidden="true">
                <div className="scard__head">
                  <span className="skeleton skeleton--avatar scard__skeleton-logo" />
                  <div className="scard__who">
                    <span className="skeleton skeleton--name" />
                    <span className="skeleton skeleton--line" />
                  </div>
                </div>
                <span className="skeleton skeleton--line" />
                <span className="skeleton skeleton--line" />
              </div>
            ))}
          </div>
        ) : list.rows.length === 0 ? (
          <div className="directory__state">
            <span className="directory__state-icon">{query ? <SearchIcon /> : active.icon}</span>
            <p className="directory__state-title">{query ? "No matches found" : `No ${noun} yet`}</p>
            <p className="directory__state-hint">
              {query
                ? `No shop matches “${query}”. Try a name, address, phone or email.`
                : "Shops appear here once a shop owner sets up their shop profile."}
            </p>
            {query && (
              <button type="button" className="btn" onClick={clearSearch}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="sgrid">
            {list.rows.map((shop, index) => (
              <ShopCard key={shop.id} shop={shop} index={index} backTo={`/shops${search}`} />
            ))}
          </div>
        )}

        {list.pagination && list.pagination.total > 0 && list.status !== "error" && (
          <Pager
            pagination={list.pagination}
            sizes={PAGE_SIZES}
            onPage={goToPage}
            onPageSize={(size) => updateParams({ size: size === PAGE_SIZES[0] ? null : size, page: null })}
          />
        )}
      </div>
    </section>
  );
}

function ShopCard({ shop, index, backTo }) {
  return (
    <article className="scard" style={{ "--i": index }}>
      <div className="scard__head">
        <ShopLogo shop={shop} size="md" />
        <div className="scard__who">
          <h3 className="scard__name">{shop.name}</h3>
          <span className="scard__since">Joined {timeAgo(shop.createdAt)}</span>
        </div>
        <span className={`status ${shop.is_active ? "status--on" : "status--off"}`}>{shop.is_active ? "Open" : "Hidden"}</span>
      </div>

      <CategoryChips categories={shop.categories} />

      <ul className="scard__facts">
        <li>
          <PersonIcon />
          <span>{shop.owner?.full_name ?? "Unknown owner"}</span>
        </li>
        <li>
          <PhoneIcon />
          <a href={telUrl(shop.phone)}>{shop.phone}</a>
        </li>
        <li>
          <PinIcon />
          <span className="scard__address">{shop.address}</span>
        </li>
      </ul>

      <Link to={`/shops/${shop.id}`} state={{ backTo, shop }} className="scard__view">
        View profile <ArrowIcon />
      </Link>
    </article>
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

function StoreIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 9.5 5.5 4h13L20 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
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

function SearchIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}
