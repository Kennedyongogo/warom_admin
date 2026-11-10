import { useCallback, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { clearSession, loadSession, saveSession } from "./auth.js";
import AppShell from "./layout/AppShell.jsx";
import Login from "./pages/Login/Login.jsx";
import Home from "./pages/Home.jsx";
import Shops from "./pages/Shops.jsx";
import ShopDetails from "./pages/ShopDetails.jsx";
import Users from "./pages/Users.jsx";
import Riders from "./pages/Riders.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  const [session, setSession] = useState(loadSession);

  const handleLogin = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  const handleSignOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const handleUserUpdate = useCallback((user) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user };
      saveSession(next);
      return next;
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          element={
            session ? (
              <AppShell session={session} onSignOut={handleSignOut} onUserUpdate={handleUserUpdate} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Home />} />
          <Route path="shops" element={<Shops />} />
          <Route path="shops/:id" element={<ShopDetails />} />
          <Route path="users" element={<Users />} />
          <Route path="riders" element={<Riders />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
