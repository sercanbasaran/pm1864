import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Card from "../../components/ui/Card.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
import EditorPage from "../../components/layout/EditorPage.jsx";
import {
  Button,
  Input,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import React, { useEffect, useState } from "react";
import {
  Plus,
  X,
  Check,
  UsersThree,
  PencilSimple,
  Key,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { roles } from "../../permissions.js";
import { request } from "../../api.js";
export default function UserManagement({
  user,
  onChanged,
  route = "users",
  onNavigate,
  onClose,
}) {
  const [users, setUsers] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState(null),
    [reset, setReset] = useState(null),
    [password, setPassword] = useState(""),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers((await request("/users")).users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function close() {
    setDraft(null);
    setReset(null);
    setError("");
    onClose();
  }
  function edit(value) {
    onNavigate("users/" + (value ? value.id + "/edit" : "new"));
  }
  function resetUser(value) {
    onNavigate("users/" + value.id + "/password");
  }
  useEffect(() => {
    const [, id, action] = route.split("/");
    if (!id) {
      setDraft(null);
      setReset(null);
      return;
    }
    if (loading) return;
    setError("");
    setPassword("");
    const value = users.find((u) => u.id === id);
    if (id === "new") {
      setReset(null);
      setDraft({
        name: "",
        email: "",
        role: "viewer",
        active: true,
        password: "",
      });
    } else if (value && action === "edit") {
      setReset(null);
      setDraft({ ...value, password: "" });
    } else if (value && action === "password" && value.id !== user.id) {
      setDraft(null);
      setReset(value);
    } else {
      setDraft(null);
      setReset(null);
    }
  }, [route, loading]);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/users" + (draft.id ? "/" + draft.id : ""), {
        method: draft.id ? "PUT" : "POST",
        body: { expectedVersion: draft.version, user: draft },
      });
      close();
      setNotice(
        "Kullanıcı kaydedildi. Rol veya durum değişikliklerinde mevcut oturumlar kapatılır.",
      );
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveReset(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/users/" + reset.id + "/password", {
        method: "POST",
        body: { expectedVersion: reset.version, password },
      });
      close();
      setPassword("");
      setNotice(
        "Geçici parola atandı. Kullanıcının tüm oturumları kapatıldı; sonraki girişte parola değişikliği istenecek.",
      );
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = users.filter((u) =>
    `${u.name} ${u.email}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );
  const addAction = (
    <Button
      type="button"
      variant="primary"
      className="btn"
      onClick={() => edit()}
    >
      <Plus size={17} />
      Kullanıcı ekle
    </Button>
  );
  const saveAction =
    draft || reset ? (
      <Button type="submit" variant="primary" className="btn" disabled={busy}>
        <Check size={17} />
        {busy
          ? "Kaydediliyor…"
          : reset
            ? "Geçici parola ata"
            : "Kullanıcıyı kaydet"}
      </Button>
    ) : null;
  return (
    <>
      {!route.includes("/") && (
        <>
          <Card className="panel user-management">
            <div className="panel-title">
              <div>
                <div className="eyebrow">EKİP VE ERİŞİM</div>
                <h2>Kullanıcı yönetimi</h2>
                <p className="muted">
                  Hesapları, erişim rollerini ve oturum güvenliğini yönetin.
                </p>
              </div>
              {addAction}
            </div>
            {error && !draft && !reset && (
              <SlAlert open variant="danger" className="form-error">
                {error}
              </SlAlert>
            )}
            {notice && (
              <SlAlert open variant="success" className="form-success">
                {notice}
              </SlAlert>
            )}
            <div className="user-toolbar">
              <div className="search">
                <Input
                  prefix={<UsersThree size={17} />}
                  aria-label="Kullanıcı ara"
                  placeholder="Ad veya e-posta ile ara"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button className="btn" disabled={loading} onClick={load}>
                <ArrowsClockwise size={16} />
                Yenile
              </Button>
            </div>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Kaydırılabilir tablo"
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeading>KULLANICI</TableHeading>
                    <TableHeading>ROL</TableHeading>
                    <TableHeading>DURUM</TableHeading>
                    <TableHeading>İŞLEMLER</TableHeading>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <strong>
                          {u.name}
                          {u.id === user.id && <SlTag>Siz</SlTag>}
                        </strong>
                        <small className="user-email">{u.email}</small>
                      </TableCell>
                      <TableCell>
                        <SlTag>
                          {roles.find((r) => r.id === u.role)?.name}
                        </SlTag>
                      </TableCell>
                      <TableCell>
                        <SlBadge variant={u.active ? "success" : "neutral"}>
                          {u.active ? "Aktif" : "Pasif"}
                        </SlBadge>
                        {u.mustChangePassword && (
                          <small className="user-email">
                            Parola değişimi gerekli
                          </small>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="user-actions">
                          <Button className="btn" onClick={() => edit(u)}>
                            <PencilSimple size={14} />
                            Düzenle
                          </Button>
                          {u.id !== user.id && (
                            <Button
                              className="btn"
                              onClick={() => resetUser(u)}
                            >
                              <Key size={14} />
                              Geçici parola
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {loading && <p className="muted">Kullanıcılar yükleniyor…</p>}
            {!loading && !visible.length && (
              <div className="empty">
                <UsersThree size={28} />
                <h3>Kullanıcı bulunamadı</h3>
              </div>
            )}
            <ActionBar position="bottom">{addAction}</ActionBar>
          </Card>
        </>
      )}
      {(draft || reset) && (
        <EditorPage
          title={
            reset
              ? "Geçici parola ata"
              : draft.id
                ? "Kullanıcı düzenle"
                : "Kullanıcı ekle"
          }
          busy={busy}
          onClose={close}
        >
          <form onSubmit={reset ? saveReset : save}>
            <ActionBar>{saveAction}</ActionBar>
            <div className="editor-content">
              {error && (
                <SlAlert open variant="danger" className="form-error">
                  {error}
                </SlAlert>
              )}
              {reset ? (
                <>
                  <p className="muted">
                    Geçici parola kullanıcıya güvenli bir kanaldan
                    iletilmelidir. Kullanıcı ilk girişinde parolasını
                    değiştirecek.
                  </p>
                  <div>
                    <Input
                      label="Geçici parola"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={512}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Input
                      label="Ad soyad"
                      required
                      autoFocus
                      maxLength={100}
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Input
                      label="E-posta adresi"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="off"
                      value={draft.email}
                      onChange={(e) =>
                        setDraft({ ...draft, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Select
                      label="Rol"
                      value={draft.role}
                      disabled={draft.id === user.id}
                      onChange={(e) =>
                        setDraft({ ...draft, role: e.target.value })
                      }
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                    <small className="input-help">
                      {roles.find((r) => r.id === draft.role)?.description}
                    </small>
                  </div>
                  <div className="category-active">
                    <Input
                      label="Hesap aktif"
                      type="checkbox"
                      checked={draft.active}
                      disabled={draft.id === user.id}
                      onChange={(e) =>
                        setDraft({ ...draft, active: e.target.checked })
                      }
                    />
                    <div>
                      <p>
                        Pasifleştirilen hesap giriş yapamaz; açık oturumları
                        kapatılır.
                      </p>
                    </div>
                  </div>
                  {!draft.id && (
                    <div>
                      <Input
                        label="Geçici parola"
                        type="password"
                        required
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={512}
                        value={draft.password}
                        onChange={(e) =>
                          setDraft({ ...draft, password: e.target.value })
                        }
                      />
                      <small className="input-help">
                        En az 12 karakter. Kullanıcı ilk girişte değiştirmek
                        zorunda.
                      </small>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="editor-footer">
              <Button
                type="button"
                className="btn"
                disabled={busy}
                onClick={close}
              >
                Vazgeç
              </Button>
              <ActionBar position="bottom">{saveAction}</ActionBar>
            </div>
          </form>
        </EditorPage>
      )}
      {route.includes("/") &&
        !draft &&
        !reset &&
        (loading ? (
          <p role="status">Kullanıcı yükleniyor…</p>
        ) : (
          <EditorPage title="Kullanıcı bulunamadı" onClose={onClose}>
            <p>Kayıt bulunamadı veya bu işlem kullanılamıyor.</p>
          </EditorPage>
        ))}{" "}
    </>
  );
}
