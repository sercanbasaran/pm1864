import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import SatietyProductManagement from "../src/modules/settings/SatietyProductManagement.jsx";
import { defaultSatietyProducts } from "../src/satiety.js";
import { moduleGroups, moduleFor } from "../src/app/modules.js";
import { settle } from "./shadow-queries.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const snapshot = {
  revision: 0,
  satietyProducts: defaultSatietyProducts(),
  products: [],
};
test("settings can add a custom ingredient, edit existing definitions and preserve their IDs", async () => {
  let catalog = snapshot;
  const fetch = vi.fn(async (url, options) => {
    if (!String(url).startsWith("/api/"))
      return new Response("<svg/>", { status: 200 });
    const body = JSON.parse(options.body);
    const definition = {
      id: body.id || "chocolate-test",
      name: body.name,
      icon: body.icon,
      active: body.active,
    };
    catalog = {
      ...catalog,
      revision: catalog.revision + 1,
      satietyProducts: body.id
        ? catalog.satietyProducts.map((d) =>
            d.id === body.id ? definition : d,
          )
        : [...catalog.satietyProducts, definition],
    };
    return new Response(JSON.stringify({ catalog }), { status: 200 });
  });
  const apiCalls = () =>
    fetch.mock.calls.filter(([url]) => String(url).startsWith("/api/"));
  vi.stubGlobal("fetch", fetch);
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <SatietyProductManagement canWrite />
    </CatalogProvider>,
  );
  await settle();
  const name = document.querySelector("sl-input");
  name.value = "Çikolata";
  fireEvent(name, new CustomEvent("sl-input", { bubbles: true }));
  const icon = document.querySelector("sl-select");
  icon.value = "chocolate";
  fireEvent(icon, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() => expect(apiCalls()).toHaveLength(1));
  await settle();
  expect(apiCalls()[0][0]).toBe("/api/satiety-products");
  expect(JSON.parse(apiCalls()[0][1].body)).toMatchObject({
    name: "Çikolata",
    icon: "chocolate",
    expectedRevision: 0,
  });
  fireEvent.click(
    document.querySelector('[aria-label="Fıstık doygunluk ürününü düzenle"]'),
  );
  await settle();
  name.value = "Antep fıstığı";
  fireEvent(name, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() => expect(apiCalls()).toHaveLength(2));
  expect(apiCalls()[1][0]).toBe("/api/satiety-products/pistachio");
  expect(apiCalls()[1][1].method).toBe("PUT");
});
test("definitions are visible without management controls and live under system settings", async () => {
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <SatietyProductManagement canWrite={false} />
    </CatalogProvider>,
  );
  await settle();
  expect(document.querySelector("form")).toBeNull();
  expect(document.body.textContent).toContain("Fıstık");
  expect(document.body.textContent).toContain("Ceviz");
  expect(
    moduleGroups.find((g) => g.id === "system-settings").children,
  ).toContain("satiety-products");
  expect(moduleFor("satiety-products").label).toBe("Doygunluk Ürünleri");
});
