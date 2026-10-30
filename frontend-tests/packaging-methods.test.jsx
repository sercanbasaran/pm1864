import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import PackagingMethodManagement from "../src/modules/packaging/PackagingMethodManagement.jsx";
import VariantCreatePage from "../src/modules/variants/VariantCreatePage.jsx";
import { defaultPackagingMethods } from "../src/modules/packaging/packaging-methods.js";
import { moduleFor, parentFor, visibleChildren } from "../src/app/modules.js";
import { settle } from "./shadow-queries.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const snapshot = {
  revision: 0,
  products: [],
  categories: [],
  packagingMethods: [
    ...defaultPackagingMethods(),
    { id: "paper", kind: "custom", name: "Kağıt paket", active: true },
  ],
  variantTypes: [{ id: "type-item", name: "Adet" }],
};
const action = (name) =>
  [...document.querySelectorAll("sl-button")].find(
    (b) => b.textContent.trim() === name,
  );
test("packaging methods are a child module and are editable through their own form", async () => {
  expect(parentFor("packaging-methods").id).toBe("packaging-center");
  expect(moduleFor("packaging-center").children).toContain("packaging-items");
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ catalog: { ...snapshot, revision: 1 } })),
  );
  vi.stubGlobal("fetch", fetch);
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <PackagingMethodManagement canWrite />
    </CatalogProvider>,
  );
  await settle();
  fireEvent.click(action("Yeni şekil ekle"));
  await settle();
  const input = document.querySelector("sl-input");
  input.value = "Kese kağıdı";
  fireEvent(input, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(([url]) => url === "/api/packaging-methods"),
    ).toBe(true),
  );
  const call = fetch.mock.calls.find(
    ([url]) => url === "/api/packaging-methods",
  );
  expect(JSON.parse(call[1].body)).toMatchObject({
    name: "Kese kağıdı",
    active: true,
  });
});
test("variant wizard lists active managed methods and excludes inactive choices", async () => {
  const data = {
    ...snapshot,
    packagingMethods: [
      ...snapshot.packagingMethods,
      { id: "hidden", kind: "custom", name: "Kapalı servis", active: false },
    ],
  };
  render(
    <CatalogProvider snapshot={data} notify={vi.fn()}>
      <VariantCreatePage onClose={vi.fn()} />
    </CatalogProvider>,
  );
  await settle();
  const type = [...document.querySelectorAll("sl-select")].find(
    (s) => s.label === "Varyant türü",
  );
  type.value = "type-item";
  fireEvent(type, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  const select = [...document.querySelectorAll("sl-select")].find(
    (s) => s.label === "Ambalaj / servis şekli",
  );
  expect(select.textContent).toContain("Kağıt paket");
  expect(select.textContent).not.toContain("Kapalı servis");
});
