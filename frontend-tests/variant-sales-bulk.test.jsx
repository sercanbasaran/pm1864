import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import { SalesChannelSwitches } from "../src/components/ui/SalesChannels.jsx";
import { settle } from "./shadow-queries.js";
const variants = Array.from({ length: 12 }, (_, i) => ({
  id: `v${i}`,
  size: `Varyant ${i}`,
  price: 100 + i,
  weight: 40,
  active: true,
  typeId: "type-item",
  salesAvailability: { store: true, online: i % 2 === 0, foodDelivery: false },
}));
const product = {
  id: 1,
  name: "Ürün",
  status: "Taslak",
  salesAvailability: { store: false },
  variants,
};
const snapshot = {
  revision: 4,
  products: [product],
  categories: [],
  variantTypes: [{ id: "type-item", name: "Adet" }],
};
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
async function show(canWrite = true) {
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <VariantManagement
        products={[product]}
        categories={[]}
        canWrite={canWrite}
        canEditPrices={canWrite}
        onEdit={vi.fn()}
      />
    </CatalogProvider>,
  );
  await settle();
}
const button = (text) =>
  [...document.querySelectorAll("sl-button")].find((b) =>
    b.textContent.includes(text),
  );
async function select(label, value) {
  const el = [...document.querySelectorAll("sl-select")].find(
    (s) => s.label === label,
  );
  el.value = value;
  fireEvent(el, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
}
async function check(el) {
  el.checked = !el.checked;
  fireEvent(el, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
}
test("selection spans pages and bulk dialog sends only chosen variant fields", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ catalog: { ...snapshot, revision: 5 } }),
          { status: 200 },
        ),
    );
  await show();
  expect(
    document.querySelector(".variant-desktop-table").textContent,
  ).toContain("SATIŞ KANALLARI");
  await check(
    document.querySelector(
      'sl-checkbox[aria-label="Bu sayfadaki varyantları seç"]',
    ),
  );
  expect(button("Toplu varyant işlemleri").textContent).toContain("(10)");
  fireEvent.click(button("Filtrelenen tümünü seç"));
  await settle();
  expect(button("Toplu varyant işlemleri").textContent).toContain("(12)");
  fireEvent.click(button("Toplu varyant işlemleri"));
  await settle();
  const dialog = document.querySelector(".bulk-variants-dialog");
  expect(dialog.textContent).toContain("12 varyant seçildi");
  await select("E-Mağaza", "off");
  await select("Varyant durumu", "inactive");
  await select("Fiyat güncelleme", "increase");
  const value = [...dialog.querySelectorAll("sl-input")].find(
    (s) => s.label === "Değişim oranı (%)",
  );
  value.value = "15";
  fireEvent(value, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  fireEvent.click(
    [...dialog.querySelectorAll("sl-button")].find((b) =>
      b.textContent.includes("Güncelle"),
    ),
  );
  await waitFor(() =>
    expect(
      fetch.mock.calls.filter(([url]) => url === "/api/variants/bulk"),
    ).toHaveLength(1),
  );
  const [url, options] = fetch.mock.calls.find(
    ([url]) => url === "/api/variants/bulk",
  );
  expect(url).toBe("/api/variants/bulk");
  const body = JSON.parse(options.body);
  expect(body.expectedRevision).toBe(4);
  expect(body.ids).toHaveLength(12);
  expect(body.changes).toEqual({
    channels: { online: false },
    active: false,
    price: { mode: "increase", value: 15 },
  });
  await waitFor(() =>
    expect(document.querySelector(".bulk-variants-dialog")).toBeNull(),
  );
  expect(button("Toplu varyant işlemleri").textContent).toContain("(0)");
});
test("grid checkboxes share selection, channel filtering selects exact results, and viewers have no bulk controls", async () => {
  await show();
  fireEvent.click(
    document.querySelector('sl-button[aria-label="Döşeme görünümü"]'),
  );
  await settle();
  await check(document.querySelector(".variant-summary-card sl-checkbox"));
  expect(button("Toplu varyant işlemleri").textContent).toContain("(1)");
  await select("Satış kanalı", "online");
  expect(document.querySelector(".variant-results").textContent).toContain(
    "6 varyant listeleniyor",
  );
  fireEvent.click(button("Filtrelenen tümünü seç"));
  await settle();
  expect(button("Toplu varyant işlemleri").textContent).toContain("(6)");
  cleanup();
  await show(false);
  expect(button("Toplu varyant işlemleri")).toBeUndefined();
  expect(document.querySelector(".variant-selection-toolbar")).toBeNull();
});
test("variant switches remain editable with inactive parents and keep preferences for inactive variants", async () => {
  const onChange = vi.fn();
  render(
    <SalesChannelSwitches
      product={product}
      categories={[{ active: false }]}
      variant={{
        active: false,
        salesAvailability: { store: false, online: true, foodDelivery: false },
      }}
      onChange={onChange}
    />,
  );
  await settle();
  const switches = [...document.querySelectorAll("sl-switch")];
  expect(switches.every((s) => !s.disabled)).toBe(true);
  expect(switches[1].checked).toBe(true);
  switches[0].checked = true;
  fireEvent(switches[0], new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  expect(onChange).toHaveBeenCalledWith({
    store: true,
    online: true,
    foodDelivery: false,
  });
});
