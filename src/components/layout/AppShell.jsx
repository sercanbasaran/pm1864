import React, { useState } from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import SlDrawer from "@shoelace-style/shoelace/dist/react/drawer/index.js";
import SlProgressBar from "@shoelace-style/shoelace/dist/react/progress-bar/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import SlDivider from "@shoelace-style/shoelace/dist/react/divider/index.js";
import SlTooltip from "@shoelace-style/shoelace/dist/react/tooltip/index.js";
import { List as Menu, ArrowsClockwise, Bell } from "@phosphor-icons/react";
import { Button } from "../ui/Controls.jsx";
import BrandLogo from "../ui/BrandLogo.jsx";
import ProfileMenu from "./ProfileMenu.jsx";
import {
  primaryModules,
  parentFor,
  visibleChildren,
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
    current = modules.find((m) => m.id === page),
    parent = parentFor(page);
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
        <BrandLogo className="workspace-logo" />
        <small>1864 USTA</small>
      </div>
      <nav aria-label="Yönetim modülleri">
        {links(primaryModules.filter((module) => !module.children))}
        {primaryModules
          .filter((module) => module.children && can(user, module.permission))
          .map((group) => (
            <SlDetails
              key={
                group.id +
                (parent?.id === group.id || page === group.id ? "-active" : "")
              }
              open={parent?.id === group.id || page === group.id}
              className="workspace-module-group"
            >
              <span slot="summary" className="workspace-group-title">
                <group.icon size={21} />
                <span>{group.label}</span>
              </span>
              <div
                className="workspace-submodules"
                role="group"
                aria-label={group.label + " alt modülleri"}
              >
                {/*  <Button
                  type="button"
                  className={
                    "workspace-nav-item " +
                    (page === group.id ? "is-active" : "")
                  }
                  aria-current={page === group.id ? "page" : undefined}
                  onClick={() => navigate(group.id)}
                >
                  Modüle genel bakış
                </Button> */}
                {links(visibleChildren(group, user, can))}
              </div>
            </SlDetails>
          ))}
      </nav>
    </div>
  );
  return (
    <div className="pm-workspace">
      <aside className="workspace-sidebar">{sidebar}</aside>
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
          <div className="workspace-header-actions">
            <Button
              type="button"
              className="icon-btn workspace-mobile-toggle"
              aria-label="Menüyü aç"
              onClick={() => setMobile(true)}
            >
              <Menu size={24} />
            </Button>
            <SlTooltip content="Yenile">
              <Button
                type="button"
                className="icon-btn"
                aria-label="Yenile"
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
          </div>
          <div className="workspace-header-profile">
            <ProfileMenu
              user={user}
              onNavigate={navigate}
              onLogout={onLogout}
              onError={notify}
            />
          </div>
          <BrandLogo className="workspace-mobile-logo" />
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
          {/* {parent && (
           <nav className="workspace-breadcrumb" aria-label="Modül yolu">
              <Button
                type="button"
                size="small"
                onClick={() => navigate(parent.id)}
              >
                {parent.label}
              </Button>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{current?.label}</span>
            </nav>
            
          )} 
          <div className="workspace-page-heading">
            <h1>{current?.label}</h1>
            {current?.description && <p>{current.description}</p>}
          </div>*/}
          {children}
          <footer>
            <small style={{ fontSize: "10px" }}>
              <strong>powered by</strong> HM 1864 Digital
            </small>
          </footer>
        </main>
      </div>
    </div>
  );
}
