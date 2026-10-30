import { randomUUID } from "node:crypto";
import source from "./hm1864-stores-source.json" with { type: "json" };
import {
  storeCode,
  storeNameKey,
  validateStore,
} from "../../src/modules/channels/store-fields.js";
export const STORE_IMPORT_VERSION = "hm1864-stores-2026-10-30-v1";
// Applied once under the catalog migration lock. Reopening or deleting a store
// must never repeat this import or restore a deliberately deleted record.
export function bootstrapStores(doc) {
  if (doc.storeImportVersion === STORE_IMPORT_VERSION) return false;
  doc.managedChannels ||= [];
  const report = {
    sourceFile: source.sourceFile,
    created: 0,
    completed: 0,
    conflicts: [],
    importedAt: new Date().toISOString(),
  };
  for (const record of source.records) {
    const issue = validateStore(record);
    if (issue)
      throw Error("Mağaza kaynak verisi: " + record.name + ": " + issue);
    const matches = doc.managedChannels.filter(
      (c) =>
        c.kind === "stores" &&
        storeNameKey(c.name) === storeNameKey(record.name),
    );
    if (matches.length > 1) {
      report.conflicts.push(record.name);
      continue;
    }
    const old = matches[0];
    if (old) {
      const before = JSON.stringify(old);
      for (const [key, value] of Object.entries(record)) {
        if (key === "images") continue;
        if (key === "status" && !old.status && typeof old.active === "boolean")
          old.status = old.active ? "Aktif" : "Pasif";
        if (
          old[key] == null ||
          (typeof old[key] === "string" && !old[key].trim()) ||
          (Array.isArray(old[key]) && !old[key].length)
        )
          old[key] = structuredClone(value);
      }
      old.code ||= storeCode(old.name, doc.managedChannels, old.id);
      if (JSON.stringify(old) !== before) report.completed++;
    } else {
      doc.managedChannels.push({
        ...structuredClone(record),
        id: randomUUID(),
        kind: "stores",
        code: storeCode(record.name, doc.managedChannels),
      });
      report.created++;
    }
  }
  doc.storeImportVersion = STORE_IMPORT_VERSION;
  doc.storeImportReport = report;
  return true;
}
