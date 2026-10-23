import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ProductEditor from "../src/modules/products/ProductEditor.jsx";
import ProductManagement from "../src/modules/products/ProductManagement.jsx";
import { duplicateProduct } from "../src/duplicate-product.js";
import VariantEditor from "../src/modules/variants/VariantEditor.jsx";
import PlannedModule from "../src/modules/workspace/PlannedModule.jsx";
import {
  newMainModules,
  primaryModules,
  moduleFor,
} from "../src/app/modules.js";
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
async function show(readOnly = false, Editor = ProductEditor) {
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
      <Editor product={product} readOnly={readOnly} onClose={close} />
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
    [...document.querySelectorAll("dt")].slice(0, 2).map((n) => n.textContent),
  ).toEqual(["Ürün durumu", "Ürün kodu"]);
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
test("separate variant editing preserves IDs and other product fields", async () => {
  const { fetch } = await show(false, VariantEditor);
  expect(document.querySelectorAll("sl-input")).toHaveLength(0);
  await clickLabel("Varyantlar ve fiyatlar düzenle");
  const price = [...document.querySelectorAll("sl-input")].find((c) =>
    c.getAttribute("aria-label")?.endsWith("Fiyat (₺)"),
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
test("seven detail steps isolate ingredients and edit nutrition in a table", async () => {
  const { fetch } = await show();
  expect(
    [
      ...document
        .querySelector('[aria-label="Ürün bölümleri"]')
        .querySelectorAll("sl-button"),
    ].map((n) => n.textContent),
  ).toEqual([
    "Genel bilgiler",
    "İçindekiler",
    "Alerjen uyarısı",
    "Besin Değerleri",
    "Servis Önerisi",
    "Saklama Koşulları",
    "Uzun Süreli Muhafaza",
  ]);
  await action("İçindekiler");
  await clickLabel("İçindekiler ekle");
  const ingredients = document.querySelector("sl-textarea");
  ingredients.value = "Un, fıstık, tereyağı";
  fireEvent(ingredients, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await action("Kaydet");
  const ingredientsCall = fetch.mock.calls.find(
    ([url]) => url === "/api/products/1",
  );
  expect(JSON.parse(ingredientsCall[1].body).product.ingredients).toBe(
    "Un, fıstık, tereyağı",
  );
  await action("Besin Değerleri");
  expect(document.querySelector("table")).not.toBeNull();
  expect(document.querySelectorAll("sl-input")).toHaveLength(0);
  await clickLabel("Besin Değerleri ekle");
  const energy = [...document.querySelectorAll("sl-input")].find(
    (c) => c.getAttribute("aria-label") === "Enerji (kcal)",
  );
  energy.value = "297.5";
  fireEvent(energy, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  await action("Kaydet");
  const saved = fetch.mock.calls
    .filter(([url]) => url === "/api/products/1")
    .at(-1);
  expect(JSON.parse(saved[1].body).product.nutrition).toBe(
    "100 g için: Enerji 297,5 kcal.",
  );
});
test("variant step is optional and SKU is absent from the product UI", async () => {
  const draft = {
    ...product,
    isNew: true,
    id: undefined,
    productCode: undefined,
    sku: undefined,
    variants: [],
  };
  const close = vi.fn();
  const save = vi.fn(
    async () =>
      new Response(JSON.stringify({ catalog: snapshot }), { status: 200 }),
  );
  vi.stubGlobal("fetch", save);
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductEditor product={draft} onClose={close} />
    </CatalogProvider>,
  );
  await settle();
  expect(document.querySelector(".editor-page").textContent).not.toContain(
    "SKU",
  );
  fireEvent.submit(document.querySelector("form"));
  await settle();
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(JSON.parse(save.mock.calls[0][1].body).product.variants).toEqual([]);
});

test("new main modules have navigable landing pages and a working overview return", async () => {
  for (const module of newMainModules) {
    expect(primaryModules).toContain(module);
    expect(moduleFor(module.id)).toBe(module);
    const navigate = vi.fn();
    render(<PlannedModule module={module} onNavigate={navigate} />);
    expect(document.querySelector("h2").textContent).toBe(module.label);
    await action("Genel bakışa dön");
    expect(navigate).toHaveBeenCalledWith("overview");
    cleanup();
  }
});
test("product editor has no variant section, even through a legacy variant tab", async () => {
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductEditor
        product={product}
        tab="Varyant & fiyat"
        onClose={vi.fn()}
      />
    </CatalogProvider>,
  );
  await settle();
  expect(
    document.querySelector(".product-detail-steps .selected").textContent,
  ).toBe("Genel bilgiler");
  expect(document.querySelector("form").textContent).not.toContain(
    "Varyantlar ve fiyatlar",
  );
  expect(
    document.querySelector('[aria-label="Varyantlar ve fiyatlar düzenle"]'),
  ).toBeNull();
});

test("duplication actions are available in list and grid only for product editors", async () => {
  const duplicate = vi.fn();
  const showList = (role) =>
    render(
      <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
        <ProductManagement
          user={{ role }}
          onEdit={vi.fn()}
          onNew={vi.fn()}
          onBulk={vi.fn()}
          onCard={vi.fn()}
          onDuplicate={duplicate}
        />
      </CatalogProvider>,
    );
  showList("editor");
  await settle();
  await clickLabel("Baklava ürününü çoğalt");
  expect(duplicate).toHaveBeenCalledWith(product);
  await clickLabel("Kart görünümü");
  await clickLabel("Baklava ürününü çoğalt");
  expect(duplicate).toHaveBeenCalledTimes(2);
  cleanup();
  showList("viewer");
  await settle();
  expect(
    document.querySelector('[aria-label="Baklava ürününü çoğalt"]'),
  ).toBeNull();
});
test("a duplicated product opens as editable new content and posts to creation endpoint", async () => {
  const save = vi.fn(
    async () =>
      new Response(JSON.stringify({ catalog: snapshot }), { status: 200 }),
  );
  vi.stubGlobal("fetch", save);
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductEditor product={duplicateProduct(product)} onClose={vi.fn()} />
    </CatalogProvider>,
  );
  await settle();
  expect(document.querySelector('sl-input[aria-label="Ürün adı"]').value).toBe(
    "Baklava (Kopya)",
  );
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const call = save.mock.calls.find(([url]) => url === "/api/products");
  expect(call).toBeDefined();
  const sent = JSON.parse(call[1].body).product;
  expect(sent.id).toBeUndefined();
  expect(sent.sku).toBeUndefined();
  expect(sent.variants[0].id).toBeUndefined();
  expect(sent.publicCardEnabled).toBe(false);
});
