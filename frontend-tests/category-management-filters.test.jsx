import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
afterEach(cleanup);
const categories = [
  {
    id: "a",
    name: "Baklava",
    code: "0100",
    slug: "baklava",
    active: true,
    salesAvailability: { store: true, online: false, foodDelivery: true },
  },
  {
    id: "b",
    parentId: "a",
    name: "Fıstıklı",
    code: "101",
    slug: "fistikli",
    active: true,
    description: "Tam",
  },
  { id: "c", name: "Lokum", code: "0200", slug: "lokum", active: false },
];
async function setup() {
  render(
    <CategoryManagement
      categories={categories}
      products={[{ categoryId: "b" }]}
      readOnly
      onNavigate={vi.fn()}
    />,
  );
  await settle();
}
const rows = () => [...document.querySelectorAll("tbody tr")];
const button = (text) =>
  [...document.querySelectorAll("sl-button")].find((b) =>
    b.textContent.includes(text),
  );
async function choose(label, value) {
  const s = [...document.querySelectorAll("sl-select")].find(
    (s) => s.label === label,
  );
  s.value = value || "__empty__";
  fireEvent(s, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
}
test("summary shows per-channel counts and can be collapsed with its Shoelace header", async () => {
  await setup();
  const cards = [
    ...document.querySelectorAll(
      ".category-summary-channels .category-channel-summary",
    ),
  ];
  expect(cards.map((c) => c.querySelector("h3").textContent)).toEqual([
    "Mağaza",
    "E-Mağaza",
    "Sipariş Platformları",
  ]);
  expect(
    cards.map((c) => [...c.querySelectorAll("dd")].map((n) => n.textContent)),
  ).toEqual([
    ["1", "1"],
    ["0", "0"],
    ["1", "1"],
  ]);
  const filters = document.querySelector(".category-filter-accordion");
  expect(filters.hidden).toBe(true);
  expect(
    document
      .querySelector('sl-input[aria-label="Kategori ara"]')
      .closest("sl-details"),
  ).toBeNull();
  fireEvent.click(button("Filtreleri Aç"));
  await settle();
  expect(filters.hidden).toBe(false);
  const details = document.querySelector(".category-summary-accordion");
  expect(details.open).toBe(false);
  details.shadowRoot.querySelector(".details__header").click();
  await settle();
  expect(details.open).toBe(true);
});
test("filters combine, quality links filter records and clearing restores the complete table", async () => {
  await setup();
  await choose("Kategori türü", "child");
  expect(rows()).toHaveLength(1);
  await choose("Satış kanalı", "online");
  expect(document.querySelector("tbody").textContent).toContain(
    "Kategori bulunamadı",
  );
  fireEvent.click(button("Filtreleri temizle"));
  await settle();
  expect(rows()).toHaveLength(3);
  fireEvent.click(button("Açıklaması olmayan kategoriler"));
  await settle();
  expect(rows()).toHaveLength(2);
  expect(document.querySelector("tbody").textContent).not.toContain("Fıstıklı");
});
test("sort selector orders categories and restores hierarchy", async () => {
  await setup();
  await choose("Kategori sıralaması", "code:desc");
  expect(rows()[0].textContent).toContain("Lokum");
  expect(button("Kod")).toBeUndefined();
  await choose("Kategori sıralaması", "hierarchy:asc");
  expect(rows()[0].textContent).toContain("Baklava");
});
test("category view can switch between list and grid", async () => {
  await setup();
  const grid = document.querySelector('sl-button[aria-label="Döşeme görünümü"]');
  fireEvent.click(grid);
  await settle();
  expect(document.querySelectorAll(".category-grid-card")).toHaveLength(3);
  expect(grid.getAttribute("aria-pressed")).toBe("true");
  expect(document.querySelector('.table-scroll').hidden).toBe(true);
  fireEvent.click(document.querySelector('sl-button[aria-label="Liste görünümü"]'));
  await settle();
  expect(rows()).toHaveLength(3);
});
test("category filters support multiple selections and show hierarchical category badges", async () => {
  await setup();
  const selects = [...document.querySelectorAll(".category-filters sl-select")];
  expect(selects.slice(0, 2).map((s) => s.label)).toEqual([
    "Kategori türü",
    "Kategori",
  ]);
  for (const label of [
    "Kategori türü",
    "Kategori",
    "Satış kanalı",
    "Tamamlanacak kayıtlar",
  ]) {
    expect(selects.find((s) => s.label === label).multiple).toBe(true);
  }
  const categorySelect = selects.find((s) => s.label === "Kategori");
  const options = [...categorySelect.querySelectorAll("sl-option")];
  expect(options.map((o) => o.value)).toEqual(["a", "b", "c"]);
  expect(options[0].querySelector(".category-filter-code").textContent).toBe(
    "0100",
  );
  expect(options[1].className).toBe("category-filter-child");
  await choose("Kategori", ["b", "c"]);
  expect(rows()).toHaveLength(2);
  await choose("Kategori türü", ["main", "child"]);
  expect(rows()).toHaveLength(2);
  fireEvent.click(button("Filtreleri temizle"));
  await settle();
  await choose("Satış kanalı", ["store", "online"]);
  expect(rows()).toHaveLength(2);
  await choose("Tamamlanacak kayıtlar", ["description", "empty"]);
  expect(rows()).toHaveLength(1);
});
