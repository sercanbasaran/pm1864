import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
const categories = [
  {
    id: "r",
    name: "Baklava",
    code: "10",
    slug: "baklava",
    active: true,
    parentId: "",
  },
  {
    id: "c",
    name: "Fistikli",
    code: "10",
    slug: "fistikli",
    active: true,
    parentId: "r",
  },
  {
    id: "r2",
    name: "Lokum",
    code: "11",
    slug: "lokum",
    active: true,
    parentId: "",
  },
  {
    id: "last",
    name: "Son",
    code: "12",
    slug: "son",
    active: true,
    parentId: "",
  },
];
const props = {
  categories,
  products: [],
  onSave: vi.fn(),
  onNavigate: vi.fn(),
  onClose: vi.fn(),
};
afterEach(() => { cleanup(); sessionStorage.clear(); });
async function choose(id) {
  const select = document.querySelector("sl-select");
  select.value = id === "" ? "__empty__" : id;
  fireEvent(select, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
}
test("parent selector labels include codes and switching parent recalculates the new-category suggestion", async () => {
  render(<CategoryManagement {...props} route="categories/new" />);
  await settle();
  const first = document.querySelector('sl-select[aria-label="Kategori türü"]').parentElement;
  expect(document.querySelector('sl-select[aria-label="Kategori türü"]')).toBeTruthy();
  expect(first.textContent).toContain("Baklava (10)");
  expect(first.textContent).toContain("Lokum (11)");
  await choose("r");
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("11");
  await choose("r2");
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("10");
  await choose("");
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("13");
});
test("direct child creation uses the same suggestion; existing code is disabled while parent remains editable", async () => {
  const view = render(
    <CategoryManagement {...props} route="categories/new?parent=r" />,
  );
  await settle();
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("11");
  view.rerender(<CategoryManagement {...props} route="categories/c/edit" />);
  await settle();
  fireEvent.click(document.querySelector('sl-button[aria-label="Kategori türü düzenle"]'));
  await settle();
  expect(document.querySelector("sl-select").disabled).toBe(false);
  await choose("r2");
  expect(document.querySelector('sl-input[aria-label="Kategori kodu"]')).toBeNull();
  expect([...document.querySelectorAll('sl-badge')].some(badge => badge.textContent === '10')).toBe(true);
});
test("exhausted code range warns and disables create actions", async () => {
  render(<CategoryManagement {...props} categories={[...categories, {id:"full",name:"Full",code:"99",parentId:"last",active:true,slug:"full"}]} route="categories/new?parent=last" />);
  await settle();
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("");
  expect(document.body.textContent).toContain("boş alt kategori kodu kalmadı");
  const buttons = [...document.querySelectorAll("sl-button")].filter((b) =>
    b.textContent.includes("Kategoriyi oluştur"),
  );
  expect(buttons).toHaveLength(2);
  expect(buttons.every((b) => b.disabled)).toBe(true);
});

test("main and child category forms use two-digit code constraints", async () => {
  const mainCategories = Array.from({ length: 9 }, (_, i) => ({
    id: "root-" + i,
    name: "Root " + i,
    code: String(i + 10),
    slug: "root-" + i,
    active: true,
    parentId: "",
  }));
  render(
    <CategoryManagement
      {...props}
      categories={mainCategories}
      route="categories/new"
    />,
  );
  await settle();
  const code = () =>
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    );
  expect(code().value).toBe("19");
  expect(code().maxlength).toBe(2);
  expect(code().pattern).toBe("[1-9][0-9]");
  await choose("root-8");
  expect(code().value).toBe("10");
  expect(code().maxlength).toBe(2);
  expect(code().pattern).toBe("[1-9][0-9]");
  await choose("");
  expect(code().value).toBe("19");
});
