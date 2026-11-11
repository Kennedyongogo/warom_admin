import { useCallback, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { clearSession, loadSession, saveSession } from "./auth.js";
import AppShell from "./layout/AppShell.jsx";
import Login from "./pages/Login/Login.jsx";
import Home from "./pages/Home.jsx";
import Users from "./pages/Users.jsx";
import Inquiries from "./pages/Inquiries.jsx";
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
        <Route path="/login" element={<Navigate to="/" replace />} />
        {session ? (
          <Route
            element={
              <AppShell session={session} onSignOut={handleSignOut} onUserUpdate={handleUserUpdate} />
            }
          >
            <Route index element={<Home />} />
            <Route path="users" element={<Users />} />
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        ) : (
          <Route index element={<Login onLogin={handleLogin} />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
