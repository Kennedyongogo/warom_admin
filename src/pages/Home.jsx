import { useOutletContext } from "react-router-dom";
import "./pages.css";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user } = useOutletContext();
  const firstName = user.full_name?.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="page page--center">
      <div className="welcome">
        <span className="welcome__eyebrow">
          <span className="welcome__dot" aria-hidden="true" />
          {greeting()} · {today}
        </span>
        <h1 className="welcome__title">
          Karibu, <em>{firstName}</em>.
        </h1>
        <p className="welcome__text">
          Welcome to the Kabi super admin console. Use the menu above to manage users and settings.
        </p>
      </div>
    </section>
  );
}
