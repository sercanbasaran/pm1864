import React, { useState } from "react";
import SlDrawer from "@shoelace-style/shoelace/dist/react/drawer/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import SlProgressBar from "@shoelace-style/shoelace/dist/react/progress-bar/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import SlDivider from "@shoelace-style/shoelace/dist/react/divider/index.js";
import SlTooltip from "@shoelace-style/shoelace/dist/react/tooltip/index.js";
import { List as Menu, ArrowsClockwise, Bell } from "@phosphor-icons/react";
import { Button } from "../ui/Controls.jsx";
import Card from "../ui/Card.jsx";
import ProfileMenu from "./ProfileMenu.jsx";
import {
  primaryModules,
  secondaryModules,
  modules,
} from "../../app/modules.js";
import { can } from "../../permissions.js";
import { useCatalog } from "../../app/CatalogContext.jsx";
export default function AppShell({
  user,
  page,
  onNavigate,
  onLogout,
  onNotifications,
  children,
}) {
  const [mobile, setMobile] = useState(false),
    { busy, refreshing, connectionError, refresh, notify } = useCatalog(),
    current = modules.find((m) => m.id === page);
  function navigate(id) {
    onNavigate(id);
    setMobile(false);
  }
  const links = (list) =>
    list
      .filter((m) => can(user, m.permission))
      .map((m) => (
        <Button
          type="button"
          key={m.id}
          className={"workspace-nav-item " + (page === m.id ? "is-active" : "")}
          aria-current={page === m.id ? "page" : undefined}
          onClick={() => navigate(m.id)}
        >
          <m.icon size={21} />
          <span>{m.label}</span>
        </Button>
      ));
  const sidebar = (
    <div className="workspace-sidebar-content">
      <div className="workspace-brand">
        <strong>PM1864</strong>
        <small>Hafız Mustafa 1864</small>
      </div>
      <ProfileMenu
        user={user}
        onNavigate={navigate}
        onLogout={onLogout}
        onError={notify}
      />
      <SlDivider />
      <nav aria-label="Yönetim modülleri">
        <p>Yönetim modülleri</p>
        {links(primaryModules)}
        <p>Çalışma alanı</p>
        {links(
          secondaryModules.filter(
            (m) => !["account", "help", "settings", "activity"].includes(m.id),
          ),
        )}
      </nav>
    </div>
  );
  return (
    <div className="pm-workspace">
      <aside className="workspace-sidebar">
        <Card className="workspace-sidebar-card">{sidebar}</Card>
      </aside>
      {mobile && (
        <SlDrawer
          open
          label="Yönetim menüsü"
          placement="start"
          className="workspace-mobile-drawer"
          onSlAfterHide={(e) => {
            if (e.target === e.currentTarget) setMobile(false);
          }}
        >
          {sidebar}
        </SlDrawer>
      )}
      <div className="workspace-main">
        <header className="workspace-topbar">
          <Button
            type="button"
            className="icon-btn workspace-mobile-toggle"
            aria-label="Menüyü aç"
            onClick={() => setMobile(true)}
          >
            <Menu size={24} />
          </Button>
          <strong>{current?.label}</strong>
          <SlTag
            variant={connectionError ? "danger" : "success"}
            className="connection-tag"
          >
            {refreshing
              ? "Yenileniyor…"
              : connectionError
                ? "Bağlantı kontrol edilmeli"
                : "Sunucuya bağlı"}
          </SlTag>
          <SlTooltip content="Kataloğu yenile">
            <Button
              type="button"
              className="icon-btn"
              aria-label="Kataloğu yenile"
              disabled={busy || refreshing}
              onClick={async () => {
                try {
                  await refresh();
                  notify("Katalog sunucudan yenilendi.");
                } catch (e) {
                  notify(e.message);
                }
              }}
            >
              <ArrowsClockwise size={21} />
            </Button>
          </SlTooltip>
          <SlTooltip content="Bildirimler">
            <Button
              type="button"
              className="icon-btn"
              aria-label="Bildirimler"
              onClick={onNotifications}
            >
              <Bell size={21} />
            </Button>
          </SlTooltip>
        </header>
        {busy && (
          <SlProgressBar indeterminate aria-label="Sunucuya kaydediliyor" />
        )}
        <main className="workspace-content">
          {connectionError && (
            <SlAlert open variant="danger">
              Güncel veriler alınamadı. Yenile düğmesiyle tekrar deneyin.
            </SlAlert>
          )}
          <div className="workspace-page-heading">
            <h1>{current?.label}</h1>
            {current?.description && <p>{current.description}</p>}
          </div>
          {children}
          <footer>HAFIZ MUSTAFA 1864 · YÖNETİM MERKEZİ</footer>
        </main>
      </div>
    </div>
  );
}
