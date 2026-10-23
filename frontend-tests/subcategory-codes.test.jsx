import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
const categories = [
  {
    id: "r",
    name: "Baklava",
    code: "0100",
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
    code: "0300",
    slug: "lokum",
    active: true,
    parentId: "",
  },
  {
    id: "last",
    name: "Son",
    code: "0999",
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
  expect(first.textContent).toContain("Baklava (0100)");
  expect(first.textContent).toContain("Lokum (0300)");
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
  ).toBe("0200");
});
test("direct child creation uses the same suggestion; existing category fields are disabled", async () => {
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
  expect(document.querySelector("sl-select").disabled).toBe(true);
  const code = [...document.querySelectorAll("sl-input")].find(
    (node) => node.label === "Kategori kodu",
  );
  expect(code.value).toBe("101");
  expect(code.readonly).toBe(true);
  expect(code.disabled).toBe(true);
});
test("exhausted code range warns and disables create actions", async () => {
  render(<CategoryManagement {...props} route="categories/new?parent=last" />);
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

test("new main categories continue at 1000 and form constraints switch to three digits for children", async () => {
  const mainCategories = Array.from({ length: 9 }, (_, i) => ({
    id: "root-" + i,
    name: "Root " + i,
    code: String((i + 1) * 100).padStart(4, "0"),
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
  expect(code().value).toBe("1000");
  expect(code().maxlength).toBe(4);
  expect(code().pattern).toBe("[0-9]{4}");
  await choose("root-8");
  expect(code().value).toBe("901");
  expect(code().maxlength).toBe(3);
  expect(code().pattern).toBe("[0-9]{3}");
  await choose("");
  expect(code().value).toBe("1000");
});
