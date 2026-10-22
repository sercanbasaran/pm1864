import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { request } from "../api.js";
const CatalogContext = createContext(null);
export function CatalogProvider({ snapshot, notify, children }) {
  const [catalog, setCatalog] = useState(snapshot),
    [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [connectionError, setConnectionError] = useState(false);
  const current = useRef(snapshot),
    saving = useRef(false);
  function apply(next) {
    if (Number(next.revision) < Number(current.current.revision)) return;
    current.current = next;
    setCatalog(next);
    setConnectionError(false);
  }
  useEffect(() => apply(snapshot), [snapshot]);
  async function refresh() {
    setRefreshing(true);
    try {
      const { catalog } = await request("/catalog");
      apply(catalog);
      return catalog;
    } catch (e) {
      setConnectionError(true);
      throw e;
    } finally {
      setRefreshing(false);
    }
  }
  async function mutate(path, body, method = "POST") {
    if (saving.current)
      throw new Error("Önceki kayıt işleminin tamamlanmasını bekleyin.");
    saving.current = true;
    setBusy(true);
    try {
      const { catalog } = await request(path, {
        method,
        body: { ...body, expectedRevision: current.current.revision },
      });
      apply(catalog);
      return true;
    } catch (e) {
      if (e.status === 0 || e.status >= 500) setConnectionError(true);
      if (e.status === 409)
        try {
          await refresh();
        } catch {}
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <CatalogContext.Provider
      value={{
        ...catalog,
        busy,
        refreshing,
        connectionError,
        refresh,
        mutate,
        notify,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("CatalogProvider gerekli.");
  return value;
}
