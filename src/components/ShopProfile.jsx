import { mediaUrl } from "../auth.js";
import {
  CATEGORY_BY_ID,
  SOCIAL_PLATFORMS,
  SocialIcon,
  WEEK_DAYS,
  directionsUrl,
  formatHours,
  hasLocation,
  openStatus,
  socialHandle,
  socialUrl,
  telUrl,
  websiteUrl,
  weekSchedule,
  whatsappUrl,
} from "../utils/shop.jsx";
import ShopMap from "./ShopMap.jsx";
import "./ShopProfile.css";

export function ShopLogo({ shop, size = "md" }) {
  const initials = shop.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`shop-logo shop-logo--${size}`}>
      {shop.logo_url ? <img src={mediaUrl(shop.logo_url)} alt="" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
}

export function CategoryChips({ categories }) {
  return (
    <ul className="cat-chips" aria-label="Deals in">
      {categories.map((id) => {
        const category = CATEGORY_BY_ID[id];
        if (!category) return null;
        return (
          <li key={id} className={`cat-chip cat-chip--${id}`}>
            {category.icon}
            {category.label}
          </li>
        );
      })}
    </ul>
  );
}

/** Read-only shop profile. `actions` renders in the hero (owner buttons), `owner` adds an owner card (super admin). */
export default function ShopProfile({ shop, actions, owner, compact = false }) {
  const socials = SOCIAL_PLATFORMS.filter((platform) => shop.social_links?.[platform.id]);
  const contacts = [
    shop.phone && { label: "Phone", value: shop.phone, href: telUrl(shop.phone), icon: <PhoneIcon /> },
    shop.alt_phone && { label: "Alternative phone", value: shop.alt_phone, href: telUrl(shop.alt_phone), icon: <PhoneIcon /> },
    shop.whatsapp && {
      label: "WhatsApp",
      value: shop.whatsapp,
      href: whatsappUrl(shop.whatsapp),
      icon: <SocialIcon id="whatsapp" size={17} />,
      iconClass: "is-whatsapp",
      external: true,
    },
    shop.email && { label: "Email", value: shop.email, href: `mailto:${shop.email}`, icon: <MailIcon /> },
    shop.website && {
      label: "Website",
      value: shop.website.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
      href: websiteUrl(shop.website),
      icon: <GlobeIcon />,
      external: true,
    },
  ].filter(Boolean);
  const located = hasLocation(shop);
  const hours = shop.opening_hours ?? [];
  const status = openStatus(hours);

  return (
    <article className={`sp${compact ? " sp--compact" : ""}`}>
      <header className="sp-hero">
        <div className="sp-hero__band" aria-hidden="true" />
        <div className="sp-hero__body">
          <ShopLogo shop={shop} size="lg" />
          <div className="sp-hero__text">
            <div className="sp-hero__title-row">
              <h2 className="sp-hero__name">{shop.name}</h2>
              <span className={`status ${shop.is_active ? "status--on" : "status--off"}`}>
                {shop.is_active ? "Live on Kabi" : "Hidden"}
              </span>
              {status && (
                <span className={`sp-open${status.open ? " is-open" : ""}`}>
                  <span className="sp-open__dot" aria-hidden="true" />
                  {status.label}
                </span>
              )}
            </div>
            <CategoryChips categories={shop.categories} />
          </div>
          {actions && <div className="sp-hero__actions">{actions}</div>}
        </div>
      </header>

      <div className="sp-grid">
        <div className="sp-col">
          <section className="sp-card">
            <h3 className="sp-card__title">About</h3>
            {shop.description ? (
              <p className="sp-about">{shop.description}</p>
            ) : (
              <p className="sp-empty">No description yet.</p>
            )}
          </section>

          <section className="sp-card">
            <h3 className="sp-card__title">Services</h3>
            {shop.services?.length ? (
              <ul className="sp-tags">
                {shop.services.map((service) => (
                  <li key={service}>
                    <CheckIcon />
                    {service}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sp-empty">No services listed yet.</p>
            )}
          </section>

          <section className="sp-card">
            <h3 className="sp-card__title">Social media</h3>
            {socials.length ? (
              <ul className="sp-socials">
                {socials.map((platform) => {
                  const value = shop.social_links[platform.id];
                  return (
                    <li key={platform.id}>
                      <a
                        className={`sp-social sp-social--${platform.id}`}
                        href={socialUrl(platform, value)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="sp-social__icon">
                          <SocialIcon id={platform.id} />
                        </span>
                        <span className="sp-social__text">
                          <strong>{platform.label}</strong>
                          <span>{socialHandle(value)}</span>
                        </span>
                        <ExternalIcon />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="sp-empty">No social media handles yet.</p>
            )}
          </section>

          <DeliveryCard conditions={shop.delivery_conditions ?? []} />
        </div>

        <div className="sp-col">
          {owner && (
            <section className="sp-card">
              <h3 className="sp-card__title">Shop owner</h3>
              <ul className="sp-list">
                <li>
                  <span className="sp-list__icon">
                    <PersonIcon />
                  </span>
                  <span className="sp-list__text">
                    <small>Name</small>
                    <strong>{owner.full_name}</strong>
                  </span>
                </li>
                <li>
                  <span className="sp-list__icon">
                    <MailIcon />
                  </span>
                  <span className="sp-list__text">
                    <small>Email</small>
                    <a href={`mailto:${owner.email}`}>{owner.email}</a>
                  </span>
                </li>
                {owner.phone && (
                  <li>
                    <span className="sp-list__icon">
                      <PhoneIcon />
                    </span>
                    <span className="sp-list__text">
                      <small>Phone</small>
                      <a href={telUrl(owner.phone)}>{owner.phone}</a>
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}

          <section className="sp-card">
            <h3 className="sp-card__title">Contact</h3>
            <ul className="sp-list">
              {contacts.map((contact) => (
                <li key={contact.label}>
                  <span className={`sp-list__icon${contact.iconClass ? ` ${contact.iconClass}` : ""}`}>{contact.icon}</span>
                  <span className="sp-list__text">
                    <small>{contact.label}</small>
                    <a href={contact.href} {...(contact.external ? { target: "_blank", rel: "noreferrer" } : {})}>
                      {contact.value}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <OpeningHoursCard hours={hours} />
        </div>
      </div>

      <section className="sp-card sp-location">
        <div className="sp-location__head">
          <div className="sp-location__where">
            <span className="sp-list__icon">
              <PinIcon />
            </span>
            <span className="sp-list__text">
              <small>Location</small>
              <strong>{shop.address}</strong>
            </span>
          </div>
          {located && (
            <a className="sp-directions" href={directionsUrl(shop)} target="_blank" rel="noreferrer">
              <RouteIcon /> Directions
            </a>
          )}
        </div>
        {located ? (
          <>
            <ShopMap
              className="sp-location__map"
              position={[Number(shop.latitude), Number(shop.longitude)]}
              categories={shop.categories}
              name={shop.name}
            />
            <p className="sp-location__coords">
              {Number(shop.latitude).toFixed(5)}, {Number(shop.longitude).toFixed(5)}
            </p>
          </>
        ) : (
          <p className="sp-empty sp-empty--tight">No map pin set yet.</p>
        )}
      </section>
    </article>
  );
}

function DeliveryCard({ conditions }) {
  return (
    <section className="sp-card sp-delivery">
      <h3 className="sp-card__title">
        <span className="sp-delivery__badge" aria-hidden="true">
          <TruckIcon />
        </span>
        Delivery conditions
        {conditions.length > 0 && <span className="sp-delivery__count">{conditions.length}</span>}
      </h3>
      {conditions.length ? (
        <ol className="sp-delivery__list">
          {conditions.map((condition, index) => (
            <li key={`${index}-${condition}`}>
              <span className="sp-delivery__num" aria-hidden="true">
                {index + 1}
              </span>
              <span>{condition}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="sp-empty">No delivery conditions yet.</p>
      )}
    </section>
  );
}

function OpeningHoursCard({ hours }) {
  const todayId = WEEK_DAYS[(new Date().getDay() + 6) % 7].id;
  return (
    <section className="sp-card">
      <h3 className="sp-card__title">Opening hours</h3>
      {hours.length ? (
        <ul className="sp-hours">
          {weekSchedule(hours).map(({ day, entry }) => (
            <li key={day.id} className={`${day.id === todayId ? "is-today" : ""}${entry ? "" : " is-closed"}`}>
              <span className="sp-hours__day">
                {day.label}
                {day.id === todayId && <em>Today</em>}
              </span>
              <span className="sp-hours__time">{entry ? formatHours(entry) : "Closed"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sp-empty">
          <ClockIcon /> No opening hours set yet.
        </p>
      )}
    </section>
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

function PhoneIcon() {
  return (
    <svg {...svgProps}>
      <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...svgProps}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...svgProps} width={14} height={14} strokeWidth={2.4}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <path d="M3 6.5h11v9H3zM14 9.5h3.5L21 13v2.5h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg {...svgProps} width={16} height={16}>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg {...svgProps} width={14} height={14}>
      <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </svg>
  );
}
