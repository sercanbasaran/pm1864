import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import ActionBar from "../../components/ui/ActionBar.jsx";
import { Button, Input } from "../../components/ui/Controls.jsx";
import React, { useState } from "react";
import { LockKey, Check } from "@phosphor-icons/react";
import { request } from "../../api.js";
export default function PasswordForm({
  user,
  onChanged,
  required = false,
  onLogout,
}) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function save(e) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (password !== confirm) {
      setError("Yeni parolalar eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      const response = await request("/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: password },
      });
      setCurrent("");
      setPassword("");
      setConfirm("");
      setDone(true);
      await onChanged?.(response.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const saveAction = (
    <Button
      type="submit"
      variant="primary"
      className="btn full"
      disabled={busy}
    >
      <Check size={17} />
      {busy ? "Kaydediliyor…" : "Parolayı güncelle"}
    </Button>
  );
  return (
    <section
      className={"password-panel " + (required ? "required-password" : "")}
    >
      <span className="login-lock">
        <LockKey size={24} />
      </span>
      <h2>{required ? "Yeni parolanızı belirleyin" : "Parolamı değiştir"}</h2>
      <p>
        {required
          ? "İlk girişinizde geçici parolanızı değiştirmeniz gerekiyor."
          : "Parola değişikliği diğer tüm oturumlarınızı kapatır."}
      </p>
      <small className="muted">{user.email}</small>
      {error && (
        <SlAlert open variant="danger" className="form-error">
          {error}
        </SlAlert>
      )}
      {done && (
        <SlAlert open variant="success" className="form-success">
          Parolanız güncellendi.
        </SlAlert>
      )}
      <form onSubmit={save}>
        <ActionBar>{saveAction}</ActionBar>
        <div>
          <Input
            label={required ? "Geçici parola" : "Mevcut parola"}
            type="password"
            autoComplete="current-password"
            value={current}
            required
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <Input
            label="Yeni parola"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={512}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <small className="input-help">En az 12 karakter kullanın.</small>
        </div>
        <div>
          <Input
            label="Yeni parola tekrar"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={512}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <ActionBar position="bottom">{saveAction}</ActionBar>
      </form>
      {required && (
        <Button className="text-btn full" onClick={onLogout} disabled={busy}>
          Oturumu kapat
        </Button>
      )}
    </section>
  );
}
