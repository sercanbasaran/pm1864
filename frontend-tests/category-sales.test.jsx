import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
const all = { store: true, online: true, foodDelivery: true };
const root = {
  id: "r",
  name: "Baklava",
  slug: "baklava",
  code: "100",
  active: true,
  parentId: "",
  salesAvailability: { ...all, online: false },
};
const child = {
  id: "c",
  name: "Fistikli",
  slug: "fistikli",
  code: "101",
  active: true,
  parentId: "r",
  salesAvailability: all,
};
afterEach(cleanup);
test("category editor opens and saves only the selected field and cancels drafts", async () => {
  const onSave = vi.fn(async () => true),
    onClose = vi.fn();
  render(
    <CategoryManagement
      categories={[root, child]}
      products={[]}
      route="categories/c/edit"
      onSave={onSave}
      onClose={onClose}
      onNavigate={vi.fn()}
    />,
  );
  await settle();
  const findControl = (label) =>
    [
      ...document.querySelectorAll(
        "sl-input,sl-select,sl-textarea,sl-checkbox",
      ),
    ].find((c) => c.label === label);
  const clickEdit = async (label) => {
    fireEvent.click(
      [...document.querySelectorAll("sl-button")].find(
        (b) => b.getAttribute("aria-label") === label + " düzenle",
      ),
    );
    await settle();
  };
  const clickAction = async (label) => {
    fireEvent.click(
      [...document.querySelectorAll("sl-button")].find(
        (b) => b.textContent.trim() === label,
      ),
    );
    await settle();
  };
  expect(
    document.querySelectorAll(
      "sl-input,sl-select,sl-textarea,sl-checkbox,sl-switch",
    ),
  ).toHaveLength(0);
  expect(
    [...document.querySelectorAll("dt")].map((c) => c.textContent),
  ).toContain("Kategori adı");
  expect(
    [...document.querySelectorAll("dd")].map((c) => c.textContent),
  ).toContain(child.name);
  expect(document.querySelector("form").textContent).not.toContain("*");
  await clickEdit("Kategori adı");
  const name = findControl("Kategori adı");
  expect(name.disabled).toBe(false);
  expect(findControl("Kategori bağlantısı")).toBeUndefined();
  expect(findControl("Kategori kodu")).toBeUndefined();
  expect(name.required).toBe(true);
  expect(document.querySelectorAll("sl-input")).toHaveLength(1);
  name.value = "Yeni Fistikli";
  fireEvent(name, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await clickAction("Kaydet");
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(onSave.mock.calls[0][0]).toEqual({ ...child, name: "Yeni Fistikli" });
  expect(onClose).not.toHaveBeenCalled();
  expect(findControl("Kategori adı")).toBeUndefined();
  await clickEdit("Açıklama");
  const description = findControl("Açıklama");
  description.value = "Kaydedilmeyen açıklama";
  fireEvent(description, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await clickEdit("Satış kanalları");
  expect(findControl("Açıklama")).toBeUndefined();
  const controls = [...document.querySelectorAll("sl-switch")];
  const online = controls.find(
    (c) => c.getAttribute("aria-label") === "E-Mağaza",
  );
  expect(online.disabled).toBe(true);
  expect(online.checked).toBe(false);
  const store = controls.find((c) => c.getAttribute("aria-label") === "Mağaza");
  expect(store.disabled).toBe(false);
  store.checked = false;
  fireEvent(store, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  await clickAction("Kaydet");
  expect(onSave.mock.calls[1][0]).toEqual({
    ...child,
    salesAvailability: { ...all, store: false },
  });
  expect(onClose).not.toHaveBeenCalled();
  await clickEdit("Kategori adı");
  const nextName = findControl("Kategori adı");
  nextName.value = "Vazgeçilecek";
  fireEvent(nextName, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  const cancel = [...document.querySelectorAll("sl-button")].find(
    (b) => b.textContent.trim() === "Vazgeç",
  );
  fireEvent.click(cancel);
  await settle();
  expect(
    [...document.querySelectorAll("dd")].map((c) => c.textContent),
  ).toContain(child.name);
  expect(findControl("Kategori adı")).toBeUndefined();
  expect(onSave).toHaveBeenCalledTimes(2);
});
test("category list shows channel status and read-only mode has no editing switches", async () => {
  render(
    <CategoryManagement
      categories={[root, child]}
      products={[]}
      readOnly
      route="categories"
      onNavigate={vi.fn()}
    />,
  );
  await settle();
  expect(document.querySelectorAll("sl-switch")).toHaveLength(0);
  expect(document.querySelector("table").textContent).toContain(
    "Satış kanalları",
  );
  expect(document.querySelector("table").textContent).toContain("E-Mağaza");
});
