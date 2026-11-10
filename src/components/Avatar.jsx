import { useState } from "react";
import { mediaUrl } from "../auth.js";
import "./Avatar.css";

export default function Avatar({ user, size = "md" }) {
  const [failed, setFailed] = useState(false);
  const src = mediaUrl(user.profile_image);
  const initials =
    (user.full_name || user.email || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?";

  return (
    <span className={`avatar avatar--${size}`}>
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initials}
    </span>
  );
}
