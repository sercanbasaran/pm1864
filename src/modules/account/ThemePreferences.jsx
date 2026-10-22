import React, { useEffect, useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import { Sun, Moon } from "@phosphor-icons/react";
import { Button, Select } from "../../components/ui/Controls.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
import { request } from "../../api.js";
export default function ThemePreferences({ user, onChanged }) {
  const [theme, setTheme] = useState(user.theme || "light"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    setTheme(user.theme || "light");
  }, [user.theme]);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const { user: updated } = await request("/preferences", {
        method: "PATCH",
        body: { theme, expectedVersion: user.version },
      });
      await onChanged(updated);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const action = (
    <Button
      type="submit"
      variant="primary"
      disabled={busy || theme === (user.theme || "light")}
    >
      {busy ? "Kaydediliyor…" : "Tema tercihini kaydet"}
    </Button>
  );
  return (
    <section
      className="theme-preferences"
      aria-labelledby="theme-preferences-title"
    >
      <h2 id="theme-preferences-title">Görünüm ayarları</h2>
      <p>Tema tercihiniz hesabınıza kaydedilir ve tüm cihazlarda kullanılır.</p>
      <form onSubmit={save}>
        <ActionBar>{action}</ActionBar>
        {error && (
          <SlAlert open variant="danger">
            {error}
          </SlAlert>
        )}
        {saved && (
          <SlAlert open variant="success">
            Tema tercihiniz kaydedildi.
          </SlAlert>
        )}
        <div className="theme-choice">
          <span aria-hidden="true">
            {theme === "dark" ? <Moon size={24} /> : <Sun size={24} />}
          </span>
          <Select
            label="Görünüm teması"
            value={theme}
            disabled={busy}
            onChange={(e) => {
              setTheme(e.target.value);
              setSaved(false);
            }}
          >
            <option value="light">Açık tema</option>
            <option value="dark">Koyu tema</option>
          </Select>
        </div>
        <small className="input-help">
          Değişiklik kaydedildiğinde tüm yönetim arayüzüne uygulanır.
        </small>
        <ActionBar position="bottom">{action}</ActionBar>
      </form>
    </section>
  );
}
