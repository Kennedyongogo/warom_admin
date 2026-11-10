import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CATEGORY_BY_ID, MARKER_ICONS } from "../utils/shop.jsx";
import "./ShopMap.css";

const KENYA = { center: [0.25, 37.9], zoom: 6 };
const PIN_ZOOM = 17;
const PIN_SIZE = [50, 66];
const PIN_TIP = [25, 60];

const LAYERS = {
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" },
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 19, attribution: "Imagery &copy; Esri" },
  },
};

// Several categories share one spot, so their pins fan out from the same tip like a bouquet.
const FAN = { 1: [0], 2: [-26, 26], 3: [-50, 0, 50] };

const pinIcon = (category, angle, label) =>
  L.divIcon({
    className: "shop-pin",
    iconSize: PIN_SIZE,
    iconAnchor: PIN_TIP,
    html: `<img src="${MARKER_ICONS[category]}" alt="${label}" draggable="false" style="--angle:${angle}deg" />`,
  });

const dotIcon = L.divIcon({ className: "shop-pin-dot", iconSize: [14, 14], iconAnchor: [7, 7] });

/**
 * Leaflet map with one PNG pin per category the shop deals in.
 * Pass `onPick` to make it editable: clicking the map or dragging a pin reports `{ lat, lng }`.
 * Bump `focusKey` to fly the map to the current pin (e.g. after "Use my current location").
 */
export default function ShopMap({ position, categories = [], onPick, focusKey = 0, name, className = "" }) {
  const editable = Boolean(onPick);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tilesRef = useRef(null);
  const pinsRef = useRef(null);
  const onPickRef = useRef(onPick);
  const [layer, setLayer] = useState("map");

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: position ?? KENYA.center,
      zoom: position ? (editable ? PIN_ZOOM : 16) : KENYA.zoom,
      zoomControl: false,
      scrollWheelZoom: editable,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.attributionControl.setPrefix(false);
    pinsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (event) => {
      if (!onPickRef.current) return;
      onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      // A click from a country-wide view is rough; zoom in so the owner can fine-tune.
      if (map.getZoom() < 14) map.flyTo(event.latlng, PIN_ZOOM, { duration: 0.8 });
    });

    // Without this, scroll-wheel zoom on a read-only map would hijack page scrolling.
    if (!editable) {
      map.on("focus click", () => map.scrollWheelZoom.enable());
      map.on("blur mouseout", () => map.scrollWheelZoom.disable());
    }

    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // Created once; position, focus and layer changes are applied by the effects below.
  }, [editable]);

  useEffect(() => {
    const map = mapRef.current;
    tilesRef.current?.remove();
    tilesRef.current = L.tileLayer(LAYERS[layer].url, LAYERS[layer].options).addTo(map);
  }, [layer, editable]);

  const lat = position?.[0];
  const lng = position?.[1];
  const categoryKey = categories.join(",");

  useEffect(() => {
    const group = pinsRef.current;
    group.clearLayers();
    if (lat === undefined) return;

    const shown = categoryKey ? categoryKey.split(",").filter((id) => MARKER_ICONS[id]) : ["shop"];
    const angles = FAN[shown.length] ?? FAN[1];
    const markers = shown.map((category, index) => {
      const label = CATEGORY_BY_ID[category]?.label ?? "Shop";
      const marker = L.marker([lat, lng], {
        icon: pinIcon(category, angles[index], label),
        draggable: editable,
        keyboard: false,
        riseOnHover: true,
        zIndexOffset: angles[index] === 0 ? 100 : 0,
        title: name ? `${name} · ${label}` : label,
      });
      marker.bindTooltip(label, { direction: "top", offset: [0, -PIN_TIP[1]], className: "shop-pin-tip" });
      return marker;
    });

    if (editable) {
      for (const marker of markers) {
        marker.on("drag", (event) => {
          for (const other of markers) if (other !== marker) other.setLatLng(event.target.getLatLng());
        });
        marker.on("dragend", (event) => {
          const { lat: nextLat, lng: nextLng } = event.target.getLatLng();
          onPickRef.current?.({ lat: nextLat, lng: nextLng });
        });
      }
    }

    L.marker([lat, lng], { icon: dotIcon, interactive: false, keyboard: false }).addTo(group);
    for (const marker of markers) marker.addTo(group);
  }, [lat, lng, categoryKey, editable, name]);

  useEffect(() => {
    if (!focusKey || lat === undefined) return;
    const map = mapRef.current;
    map.flyTo([lat, lng], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.9 });
    // Only an explicit focus request moves the map, not every coordinate change.
  }, [focusKey]);

  const recenter = () => mapRef.current?.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 16), { duration: 0.7 });
  const legend = categories.filter((id) => CATEGORY_BY_ID[id]);

  return (
    <div className={`shop-map${editable ? " shop-map--edit" : ""}${className ? ` ${className}` : ""}`}>
      <div ref={containerRef} className="shop-map__canvas" />

      <div className="shop-map__layers" role="group" aria-label="Map style">
        {["map", "satellite"].map((id) => (
          <button key={id} type="button" className={layer === id ? "is-on" : ""} aria-pressed={layer === id} onClick={() => setLayer(id)}>
            {id === "map" ? "Map" : "Satellite"}
          </button>
        ))}
      </div>

      {editable && (
        <div className={`shop-map__hint${lat === undefined ? " is-empty" : ""}`} aria-live="polite">
          <TapIcon />
          {lat === undefined ? "Click the map to drop your shop's pin" : "Click elsewhere or drag a pin to move it"}
        </div>
      )}

      {lat !== undefined && (
        <button type="button" className="shop-map__recenter" onClick={recenter} aria-label="Center on the shop" title="Center on the shop">
          <TargetIcon />
        </button>
      )}

      {legend.length > 0 && (
        <ul className="shop-map__legend" aria-label="Map pins">
          {legend.map((id) => (
            <li key={id}>
              <img src={MARKER_ICONS[id]} alt="" />
              {CATEGORY_BY_ID[id].label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function TapIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l4.3.9a2 2 0 0 1 1.6 2.2l-.6 4.4A3 3 0 0 1 14.3 20h-3.1a3 3 0 0 1-2.4-1.2L5.5 14.5a1.5 1.5 0 0 1 2.2-2L9 13.6" />
      <path d="M5 6.5A5 5 0 0 1 15 5.5" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg {...svgProps} width={18} height={18}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
