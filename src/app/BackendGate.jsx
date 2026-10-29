import {setImageCacheUser} from "../image-cache-scope.js";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import { Button, Input } from "../components/ui/Controls.jsx";
import Card from "../components/ui/Card.jsx";
import React, { useState, useEffect } from "react";
import { request } from "../api.js";
import PasswordForm from "../modules/account/PasswordForm.jsx";
import {
  LockKey,
  ArrowRight,
  WarningCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
export default function BackendGate({ children }) {
  const [user, setUser] = useState(null),
    [catalog, setCatalog] = useState(null),
    [loading, setLoading] = useState(true),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [setup, setSetup] = useState(false),
    [busy, setBusy] = useState(false);
  async function accept(next) {
    setImageCacheUser(next.id);
    if (next.mustChangePassword) {
      setUser(next);
      setCatalog(null);
      return;
    }
    const result = await request("/catalog");
    setCatalog(result.catalog);
    setUser(next);
  }
  async function check() {
    setLoading(true);
    setError("");
    setSetup(false);
    try {
      await accept((await request("/session")).user);
    } catch (e) {
      setImageCacheUser(null);
      setUser(null);
      setCatalog(null);
      if (e.status !== 401) setError(e.message);
      setSetup(e.status === 503 || e.code === "API_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    check();
    const expired = () => {
      setImageCacheUser(null);
      setUser(null);
      setCatalog(null);
      setError(
        "Oturumunuz sona erdi veya erişiminiz değişti. Yeniden giriş yapın.",
      );
    };
    window.addEventListener("pm1864:unauthorized", expired);
    return () => window.removeEventListener("pm1864:unauthorized", expired);
  }, []);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request("/login", {
        method: "POST",
        body: { email, password },
      });
      setPassword("");
      await accept(result.user);
    } catch (e) {
      setError(e.message);
      setSetup(e.status === 503);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await request("/logout", { method: "POST", body: {} });
      setImageCacheUser(null);
      setUser(null);
      setCatalog(null);
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }
  if (user && !user.mustChangePassword && catalog)
    return children({ user, catalog, onLogout: logout, onUserUpdated: accept });
  return (
    <div className="login-page">
      <div className="login-brand">
        {/*   <strong>1864 USTA</strong>
        <small>Hafız Mustafa 1864 Usta Projesi - Beta</small> */}
      </div>
      {user?.mustChangePassword ? (
        <main>
          <Card className="login-card">
            <PasswordForm
              user={user}
              required
              onChanged={accept}
              onLogout={logout}
            />
          </Card>
        </main>
      ) : (
        <main>
          <Card className="login-card">
            <BrandLogo className="login-logo" />
            {/*  <span className="login-lock">
              <LockKey size={25} />
            </span>
            <div className="eyebrow">YETKİLİ ERİŞİM</div> */}
            <h4 style={{ textAlign: "center" }}>Hafız Mustafa 1864 - USTA</h4>
            <p>
              {loading ? "Yükleniyor…" : setup ? "Sunucu kurulumu gerekli" : ""}
            </p>
            {error && (
              <SlAlert open variant="danger" className="form-error">
                {error}
              </SlAlert>
            )}
            {!loading &&
              (setup ? (
                <>
                  <SlAlert open variant="neutral">
                    <WarningCircle size={22} />
                    <p>
                      İlk kurulum için <code>DATABASE_URL</code>,{" "}
                      <code>ADMIN_EMAIL</code> ve{" "}
                      <code>ADMIN_PASSWORD_HASH</code> değerlerini tanımlayın.
                      Yerelde <code>npm run setup</code> kullanın. Sonraki
                      kullanıcılar yönetim panelinden eklenir.
                    </p>
                  </SlAlert>
                  <Button
                    variant="primary"
                    className="btn full"
                    onClick={check}
                  >
                    <ArrowsClockwise size={17} />
                    Yeniden dene
                  </Button>
                </>
              ) : (
                <form onSubmit={login}>
                  <div>
                    <Input
                      label="E-posta adresi"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Parola"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    variant="primary"
                    className="btn full"
                  >
                    {busy ? "Giriş yapılıyor…" : "Giriş yap"}
                    <ArrowRight size={17} />
                  </Button>
                </form>
              ))}
            {/* <small>HAFIZ MUSTAFA 1864 · KATALOG YÖNETİMİ</small> */}
          </Card>
        </main>
      )}
    </div>
  );
}
