export const numberFmt = new Intl.NumberFormat("en-KE");
export const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const relativeFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const TIME_UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(value) {
  if (!value) return "Never";
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of TIME_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFmt.format(Math.round(seconds / size), unit);
  }
  return "Just now";
}

export const ROLE_LABELS = {
  customer: "Customer",
  rotejo_rider: "Rotejo rider",
  shop_rider: "Shop rider",
  shop_owner: "Shop owner",
  staff: "Staff",
  super_admin: "Super admin",
};
