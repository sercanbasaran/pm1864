import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
const categories = [
  {
    id: "r",
    name: "Baklava",
    code: "100",
    slug: "baklava",
    active: true,
    parentId: "",
  },
  {
    id: "c",
    name: "Fistikli",
    code: "101",
    slug: "fistikli",
    active: true,
    parentId: "r",
  },
  {
    id: "r2",
    name: "Lokum",
    code: "300",
    slug: "lokum",
    active: true,
    parentId: "",
  },
  {
    id: "last",
    name: "Son",
    code: "999",
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
afterEach(cleanup);
async function choose(id) {
  const select = document.querySelector("sl-select");
  select.value = id === "" ? "__empty__" : id;
  fireEvent(select, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
}
test("parent selector is first, labels include codes and switching parent recalculates the new-category suggestion", async () => {
  render(<CategoryManagement {...props} route="categories/new" />);
  await settle();
  const first = document.querySelector(".editor-content").firstElementChild;
  expect(first.querySelector("sl-select")).toBeTruthy();
  expect(first.textContent).toContain("Baklava (100)");
  expect(first.textContent).toContain("Lokum (300)");
  await choose("r");
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("102");
  await choose("r2");
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("301");
  await choose("");
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("200");
});
test("direct child creation uses the same suggestion; existing category codes remain unchanged on parent edits", async () => {
  const view = render(
    <CategoryManagement {...props} route="categories/new?parent=r" />,
  );
  await settle();
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("102");
  view.rerender(<CategoryManagement {...props} route="categories/c/edit" />);
  await settle();
  await choose("r2");
  const code = [...document.querySelectorAll("sl-input")].find(
    (node) => node.label === "Kategori kodu",
  );
  expect(code.value).toBe("101");
  expect(code.readonly).toBe(true);
});
test("exhausted code range warns and disables create actions", async () => {
  render(<CategoryManagement {...props} route="categories/new?parent=last" />);
  await settle();
  expect(
    [...document.querySelectorAll("sl-input")].find(
      (node) => node.label === "Kategori kodu",
    ).value,
  ).toBe("");
  expect(document.body.textContent).toContain("boş üç haneli kod kalmadı");
  const buttons = [...document.querySelectorAll("sl-button")].filter((b) =>
    b.textContent.includes("Kategoriyi oluştur"),
  );
  expect(buttons).toHaveLength(2);
  expect(buttons.every((b) => b.disabled)).toBe(true);
});
