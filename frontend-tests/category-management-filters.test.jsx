import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
afterEach(() => { cleanup(); sessionStorage.clear(); });
const categories = [
  {
    id: "a",
    name: "Baklava",
    code: "10",
    slug: "baklava",
    active: true,
    salesAvailability: { store: true, online: false, foodDelivery: true },
  },
  {
    id: "b",
    parentId: "a",
    name: "Fıstıklı",
    code: "10",
    slug: "fistikli",
    active: true,
    description: "Tam",
  },
  { id: "c", name: "Lokum", code: "11", slug: "lokum", active: false },
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
test("category summary and filters do not expose channels", async () => {
 await setup();
 expect(document.querySelector('.category-summary-channels')).toBeNull();
 expect([...document.querySelectorAll('sl-select')].some(s => s.label === 'Satış kanalı')).toBe(false);
 const filters=document.querySelector('.category-filter-accordion'); expect(filters.hidden).toBe(true);
 fireEvent.click(button('Filtreleri Aç')); await settle(); expect(filters.hidden).toBe(false);
});
test("filters combine, quality links filter records and clearing restores the complete table", async () => {
  await setup();
  await choose("Kategori türü", "child");
  expect(rows()).toHaveLength(1);
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
    "Tamamlanacak kayıtlar",
  ]) {
    expect(selects.find((s) => s.label === label).multiple).toBe(true);
  }
  const categorySelect = selects.find((s) => s.label === "Kategori");
  const options = [...categorySelect.querySelectorAll("sl-option")];
  expect(options.map((o) => o.value)).toEqual(["a", "b", "c"]);
  expect(options[0].querySelector(".category-filter-code").textContent).toBe(
    "10",
  );
  expect(options[1].className).toBe("category-filter-child");
  await choose("Kategori", ["b", "c"]);
  expect(rows()).toHaveLength(2);
  await choose("Kategori türü", ["main", "child"]);
  expect(rows()).toHaveLength(2);
  fireEvent.click(button("Filtreleri temizle"));
  await settle();
  await choose("Tamamlanacak kayıtlar", ["description", "empty"]);
  expect(rows()).toHaveLength(2);
});
test("tamamlanacak kayıtlar özete bağlı olmayan kapalı bir akordiyondur", async () => {
  await setup();
  const summary = document.querySelector(".category-summary-accordion");
  const quality = document.querySelector(".category-summary-quality");
  expect(summary).toBeNull();
  expect(quality.open).toBe(false);
  expect(quality.summary).toBe("Tamamlanacak kategori kayıtları · 2 kategori");
  quality.shadowRoot.querySelector(".details__header").click();
  await settle();
  expect(quality.open).toBe(true);

  fireEvent.click(button("Açıklaması olmayan kategoriler"));
  await settle();
  expect(rows()).toHaveLength(2);
  expect(document.querySelector("#category-filter-panel").hidden).toBe(false);
});
test("aktif kategori sayıları ürün özetindeki gibi ayrı büyük kartlarda gösterilir", async () => {
  await setup();
  const stats = [...document.querySelectorAll('.management-summary-stat')];
  expect(stats.map((stat) => stat.querySelector('span').textContent)).toEqual(['Aktif ana kategori', 'Aktif alt kategori']);
  expect(stats.map((stat) => stat.querySelector('strong').textContent)).toEqual(['1', '1']);
  expect(document.querySelectorAll('.category-channel-summary')).toHaveLength(0);
});
test("kategori oluşturma işlemi özet kartında gösterilir", async () => {
  render(<CategoryManagement categories={categories} products={[]} onNavigate={vi.fn()} />);
  await settle();
  expect(document.querySelector('.management-summary-create').textContent).toContain('Yeni kategori ekle');
  expect(document.querySelectorAll('sl-button').length).toBeGreaterThan(0);
});
