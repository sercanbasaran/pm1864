import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Card from "../../components/ui/Card.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
import { Button, Input } from "../../components/ui/Controls.jsx";
import React, { useEffect, useRef, useState } from "react";
import {
  UploadSimple,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { request } from "../../api.js";
import { can } from "../../permissions.js";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { uploadFile } from "./media-api.js";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
export default function MediaManagement({ user }) {
  const { products, refresh, notify } = useCatalog(),
    [assets, setAssets] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [dialog, setDialog] = useState(null),
    [name, setName] = useState(""),
    input = useRef(null),
    write = can(user, "media.write");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setAssets((await request("/media")).assets);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function uploaded(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await uploadFile(file);
      await load();
      await refresh();
      notify("Görsel kütüphaneye yüklendi.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (dialog.action === "delete")
        await request("/media/" + dialog.asset.id, {
          method: "DELETE",
          body: { expectedVersion: dialog.asset.version },
        });
      else
        await request("/media/" + dialog.asset.id, {
          method: "PATCH",
          body: { name, expectedVersion: dialog.asset.version },
        });
      setDialog(null);
      await load();
      await refresh();
      notify("Görsel kaydı güncellendi.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = assets.filter((a) =>
    a.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  const uploadAction = write ? (
    <Button
      type="button"
      variant="primary"
      className="btn"
      disabled={busy}
      onClick={() => input.current?.click()}
    >
      <UploadSimple size={16} />
      {busy ? "İşleniyor…" : "Görsel yükle"}
    </Button>
  ) : null;
  const saveAction =
    dialog && dialog.action === "rename" ? (
      <Button
        type="submit"
        variant="primary"
        className="btn full"
        disabled={busy}
      >
        {dialog.action === "delete" ? "Sil" : "Kaydet"}
      </Button>
    ) : null;
  return (
    <Card className="panel media-management">
      <div className="panel-title">
        <div>
          <h2>Görsel kütüphanesi</h2>
          <p className="muted">
            PNG, JPEG, WEBP ve GIF · Dosya başına en fazla 2 MB
          </p>
        </div>
        <div className="overview-actions">
          <Button className="btn" disabled={loading || busy} onClick={load}>
            <ArrowsClockwise size={16} />
            Yenile
          </Button>
          {write && (
            <>
              <Input
                ref={input}
                className="visually-hidden"
                aria-label="Görsel dosyası"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={busy}
                onChange={uploaded}
              />
              {uploadAction}
            </>
          )}
        </div>
      </div>
      {error && !dialog && (
        <SlAlert open variant="danger" className="form-error">
          {error}
        </SlAlert>
      )}
      <div className="module-toolbar">
        <div className="search">
          <Input
            prefix={<MagnifyingGlass size={17} />}
            aria-label="Görsellerde ara"
            placeholder="Dosya adıyla ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span>
          {assets.length} görsel ·{" "}
          {(assets.reduce((sum, a) => sum + a.size, 0) / 1048576).toFixed(2)} MB
        </span>
      </div>
      {loading ? (
        <p role="status">Görseller yükleniyor…</p>
      ) : (
        <div className="media-grid">
          {visible.map((a) => {
            const linked = products.filter(
              (p) => p.mediaId === a.id || p.customImage === a.url,
            );
            return (
              <Card className="media-card" key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={a.name + " görselini aç"}
                >
                  <img src={a.url} alt={a.name} loading="lazy" />
                </a>
                <strong title={a.name}>{a.name}</strong>
                <small>
                  {a.mimeType.replace("image/", "").toUpperCase()} ·{" "}
                  {(a.size / 1024).toFixed(1)} KB · {linked.length} üründe
                </small>
                {linked.length > 0 && (
                  <p title={linked.map((p) => p.name).join(", ")}>
                    {linked.map((p) => p.name).join(", ")}
                  </p>
                )}
                {write && (
                  <div className="overview-actions">
                    <Button
                      className="btn"
                      disabled={busy}
                      aria-label={a.name + " adını düzenle"}
                      onClick={() => {
                        setError("");
                        setName(a.name);
                        setDialog({ asset: a, action: "rename" });
                      }}
                    >
                      <PencilSimple size={15} />
                      Adını düzenle
                    </Button>
                    <Button
                      className="btn"
                      disabled={busy || !!linked.length}
                      title={
                        linked.length
                          ? "Önce ürün bağlantısını kaldırın."
                          : "Görseli sil"
                      }
                      aria-label={a.name + " sil"}
                      onClick={() => {
                        setError("");
                        setDialog({ asset: a, action: "delete" });
                      }}
                    >
                      <Trash size={15} />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {!loading && !visible.length && (
        <EmptyState
          title="Görsel bulunamadı"
          description={
            write
              ? "Ürünlerde kullanmak için ilk görselinizi yükleyin."
              : "Henüz görsel yüklenmedi."
          }
        />
      )}{" "}
      <ActionBar position="bottom">{uploadAction}</ActionBar>
      {dialog && (
        <Modal
          title={
            dialog.action === "delete" ? "Görseli sil" : "Görsel adını düzenle"
          }
          busy={busy}
          onClose={() => setDialog(null)}
        >
          <form className="media-dialog" onSubmit={save}>
            <ActionBar>{saveAction}</ActionBar>
            {error && (
              <SlAlert open variant="danger" className="form-error">
                {error}
              </SlAlert>
            )}
            {dialog.action === "delete" ? (
              <p>
                <strong>{dialog.asset.name}</strong> kütüphaneden silinecek. Bu
                işlem geri alınamaz.
              </p>
            ) : (
              <div>
                <Input
                  label="Dosya adı"
                  required
                  maxLength={160}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            {dialog.action === "delete" ? (
              <Button variant="primary" className="btn full" disabled={busy}>
                {dialog.action === "delete" ? "Sil" : "Kaydet"}
              </Button>
            ) : (
              <ActionBar position="bottom">{saveAction}</ActionBar>
            )}
          </form>
        </Modal>
      )}
    </Card>
  );
}
