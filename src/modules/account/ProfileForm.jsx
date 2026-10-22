import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import ActionBar from "../../components/ui/ActionBar.jsx";
import { Button, Input } from "../../components/ui/Controls.jsx";
import React, { useState } from "react";
import { request } from "../../api.js";
export default function ProfileForm({ user, onChanged }) {
  const [name, setName] = useState(user.name),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { user: updated } = await request("/profile", {
        method: "PATCH",
        body: { name, expectedVersion: user.version },
      });
      await onChanged(updated);
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
      className="btn"
      disabled={busy || name.trim() === user.name}
    >
      {busy ? "Kaydediliyor…" : "Profilimi kaydet"}
    </Button>
  );
  return (
    <form className="profile-form" onSubmit={save}>
      <ActionBar>{saveAction}</ActionBar>
      {error && (
        <SlAlert open variant="danger" className="form-error">
          {error}
        </SlAlert>
      )}
      <div>
        <Input
          label="Ad soyad"
          required
          minLength={1}
          maxLength={100}
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Input label="E-posta adresi" value={user.email} readOnly />
        <small className="input-help">
          E-posta değişikliklerini yöneticiniz Kullanıcılar ve yetkiler
          bölümünden yapabilir.
        </small>
      </div>
      <ActionBar position="bottom">{saveAction}</ActionBar>
    </form>
  );
}
