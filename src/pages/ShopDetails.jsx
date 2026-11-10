import { useEffect, useState } from "react";
import { Link, useLocation, useOutletContext, useParams } from "react-router-dom";
import { api } from "../auth.js";
import ShopProfile from "../components/ShopProfile.jsx";
import ShopReviews from "../components/ShopReviews.jsx";
import "./pages.css";
import "./Users.css";
import "./Shops.css";

export default function ShopDetails() {
  const { token } = useOutletContext();
  const { id } = useParams();
  const { state } = useLocation();
  const backTo = state?.backTo ?? "/shops";
  // The list already has the profile, so show it straight away and refresh in the background.
  const preloaded = state?.shop?.id === id ? state.shop : null;
  const [load, setLoad] = useState({ status: preloaded ? "ready" : "loading", shop: preloaded, error: "" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api(`/api/shops/${id}`, { token })
      .then((shop) => !cancelled && setLoad({ status: "ready", shop, error: "" }))
      .catch((error) => !cancelled && setLoad((prev) => (prev.shop ? prev : { status: "error", shop: null, error: error.message })));
    return () => {
      cancelled = true;
    };
  }, [id, token, reloadKey]);

  const shop = load.shop;

  return (
    <section className="page shop-details">
      <header className="shop-details__head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to={backTo}>
            <ArrowLeftIcon /> Shops
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{shop?.name ?? "Shop profile"}</span>
        </nav>
        <h1 className="sr-only">{shop ? `${shop.name} profile` : "Shop profile"}</h1>
      </header>

      {load.status === "error" ? (
        <div className="directory">
          <div className="directory__state">
            <span className="directory__state-icon directory__state-icon--danger">
              <AlertIcon />
            </span>
            <p className="directory__state-title">Couldn't load this shop</p>
            <p className="directory__state-hint">{load.error}</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLoad({ status: "loading", shop: null, error: "" });
                setReloadKey((k) => k + 1);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : shop ? (
        <>
          <ShopProfile shop={shop} owner={shop.owner} />
          <ShopReviews endpoint={`/api/shops/${shop.id}/reviews`} token={token} shop={shop} />
        </>
      ) : (
        <div className="shop-details__skeleton" aria-busy="true">
          <div className="sp-hero">
            <div className="sp-hero__band" />
            <div className="sp-hero__body">
              <span className="skeleton shop-details__skeleton-logo" />
              <div className="sp-hero__text">
                <span className="skeleton skeleton--name" />
                <span className="skeleton skeleton--line" />
              </div>
            </div>
          </div>
          <div className="sp-grid">
            <div className="sp-card">
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line" />
            </div>
            <div className="sp-card">
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function ArrowLeftIcon() {
  return (
    <svg {...svgProps}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg {...svgProps} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </svg>
  );
}
