import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ProductEditor from "../src/modules/products/ProductEditor.jsx";
import { settle } from "./shadow-queries.js";
const category = {
  id: "r",
  name: "Baklava",
  slug: "baklava",
  active: true,
  parentId: "",
  code: "0100",
};
const product = {
  id: 1,
  productCode: "P000001",
  publicCardCode: "P000001",
  sku: "0100000001",
  name: "Baklava",
  categoryId: "r",
  category: "Baklava",
  status: "Aktif",
  description: "",
  salesAvailability: { store: true, online: false, foodDelivery: false },
  variants: [
    {
      id: "v1",
      sku: "0100000001001",
      size: "S",
      typeId: "item",
      price: 150,
      weight: 500,
      slices: 0,
      active: true,
    },
  ],
  publicCardEnabled: false,
};
const snapshot = {
  revision: 0,
  products: [product],
  categories: [category],
  variantTypes: [{ id: "item", name: "Adet" }],
  settings: { skuPrefix: "HM" },
  logs: [],
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function show(readOnly = false) {
  const close = vi.fn(),
    notify = vi.fn();
  const fetch = vi.fn(async (url, options = {}) => {
    if (!String(url).startsWith("/api/"))
      return new Response("<svg/>", { status: 200 });
    const body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        catalog: {
          ...snapshot,
          revision: 1,
          products: [
            {
              ...product,
              ...body.product,
              publicCardEnabled: body.enabled ?? false,
            },
          ],
        },
      }),
      { status: 200 },
    );
  });
  vi.stubGlobal("fetch", fetch);
  render(
    <CatalogProvider snapshot={snapshot} notify={notify}>
      <ProductEditor product={product} readOnly={readOnly} onClose={close} />
    </CatalogProvider>,
  );
  await settle();
  return { fetch, close };
}
async function clickLabel(label) {
  fireEvent.click(document.querySelector(`sl-button[aria-label="${label}"]`));
  await settle();
}
async function action(label) {
  fireEvent.click(
    [...document.querySelectorAll("sl-button")].find(
      (b) => b.textContent.trim() === label,
    ),
  );
  await settle();
}
test("existing products use text cards, immutable codes, matching back buttons and isolated field saves", async () => {
  const { fetch, close } = await show();
  expect(
    document.querySelectorAll("sl-input,sl-select,sl-textarea"),
  ).toHaveLength(0);
  expect(
    [...document.querySelectorAll("dt")].slice(0, 3).map((n) => n.textContent),
  ).toEqual(["Ürün durumu", "Ürün kodu", "SKU"]);
  expect(document.querySelector("form").textContent).not.toContain("*");
  expect(document.querySelectorAll(".editor-back-button")).toHaveLength(2);
  expect(document.querySelector("form").textContent).toContain("Özel");
  expect(
    document.querySelector('[aria-label="Kısa açıklama ekle"]').textContent,
  ).toContain("Ekle");
  await clickLabel("Ürün adı düzenle");
  const input = document.querySelector("sl-input");
  expect(input.required).toBe(true);
  input.value = "Yeni ad";
  fireEvent(input, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await action("Kaydet");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const sent = JSON.parse(fetch.mock.calls[0][1].body).product;
  expect(sent.name).toBe("Yeni ad");
  expect(sent.productCode).toBe(product.productCode);
  expect(sent.variants).toEqual(product.variants);
  expect(close).not.toHaveBeenCalled();
  await clickLabel("Kısa açıklama ekle");
  const description = document.querySelector("sl-textarea");
  description.value = "Vazgeç";
  fireEvent(description, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await action("Vazgeç");
  expect(document.querySelector("sl-textarea")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
test("private/public control uses the publication API and read-only product screens expose no edit controls", async () => {
  const { fetch } = await show();
  await clickLabel("Bağlantı erişimi düzenle");
  const select = document.querySelector("sl-select");
  select.value = encodeURIComponent("public");
  fireEvent(select, new CustomEvent("sl-change", { bubbles: true }));
  await settle();
  await action("Kaydet");
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  const publication = fetch.mock.calls.find(
    ([url]) => url === "/api/products/1/card",
  );
  expect(publication).toBeDefined();
  expect(JSON.parse(publication[1].body).enabled).toBe(true);
  cleanup();
  await show(true);
  expect(
    document.querySelectorAll("sl-input,sl-select,sl-textarea"),
  ).toHaveLength(0);
  expect(document.querySelector('[aria-label="Ürün adı düzenle"]')).toBeNull();
  expect(document.querySelector('[aria-label="Ürün durumu"]').disabled).toBe(
    true,
  );
});
test("variant editing starts in a summary card and preserves IDs and other product fields", async () => {
  const { fetch } = await show();
  await action("Varyant & fiyat");
  expect(document.querySelectorAll("sl-input")).toHaveLength(0);
  await clickLabel("Varyantlar ve fiyatlar düzenle");
  const price = [...document.querySelectorAll("sl-input")].find(
    (c) => c.label === "Fiyat (₺)",
  );
  price.value = "175";
  fireEvent(price, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await action("Kaydet");
  await waitFor(() =>
    expect(fetch.mock.calls.some(([path]) => path === "/api/products/1")).toBe(
      true,
    ),
  );
  const call = fetch.mock.calls.find(([path]) => path === "/api/products/1");
  const sent = JSON.parse(call[1].body).product;
  expect(sent.variants[0].price).toBe(175);
  expect(sent.variants[0].id).toBe("v1");
  expect(sent.sku).toBe(product.sku);
  expect(sent.name).toBe(product.name);
});
test("new products retain the complete creation form with required fields and private access", async () => {
  const draft = {
    ...product,
    isNew: true,
    id: undefined,
    productCode: undefined,
    sku: undefined,
  };
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductEditor product={draft} onClose={vi.fn()} />
    </CatalogProvider>,
  );
  await settle();
  const name = [...document.querySelectorAll("sl-input")].find(
    (c) => c.getAttribute("aria-label") === "Ürün adı",
  );
  expect(name.required).toBe(true);
  expect(document.querySelector("form").textContent).toContain("Özel");
  expect(
    [...document.querySelectorAll("sl-button")].some(
      (c) => c.textContent === "Ürünü oluştur",
    ),
  ).toBe(true);
});
