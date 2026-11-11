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
  const firstName = (user?.name || user?.full_name || "there").split(" ")[0];
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
          Welcome back, <em>{firstName}</em>.
        </h1>
        <p className="welcome__text">
          You’re in the WAROM admin console. Use the menu above to manage users, chatters, and account settings.
        </p>
      </div>
    </section>
  );
}
