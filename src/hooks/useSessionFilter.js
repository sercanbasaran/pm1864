import { useEffect, useState } from "react";

// Only filter values are stored; unavailable or malformed storage falls back safely.
export default function useSessionFilter(key, initial) {
  const storageKey = `hm1864:filter:${key}`;
  const [value, setValue] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw === null) return initial;
      const stored = JSON.parse(raw);
      if (Array.isArray(initial)) return Array.isArray(stored) && stored.every(item => typeof item === "string") ? stored : initial;
      if (initial && typeof initial === "object") {
        if (!stored || typeof stored !== "object" || Array.isArray(stored)) return initial;
        return Object.fromEntries(Object.entries(initial).map(([name, fallback]) => {
          const item = stored[name];
          return [name, Array.isArray(fallback) ? (Array.isArray(item) && item.every(v => typeof v === "string") ? item : fallback) : typeof item === typeof fallback ? item : fallback];
        }));
      }
      return typeof stored === typeof initial ? stored : initial;
    } catch { return initial; }
  });
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch {} }, [storageKey, value]);
  return [value, setValue];
}
