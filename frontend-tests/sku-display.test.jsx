import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import CodeManagement from "../src/modules/codes/CodeManagement.jsx";
import VariantFields from "../src/modules/variants/VariantFields.jsx";
import { createApp } from "../server/app.js";
import { productCardData, productCardPath } from "../src/product-card.js";
afterEach(cleanup);
async function snapshot() {
  const app = await createApp({ env: { SQLITE_PATH: ":memory:" } });
  try {
    return await app.service.saveProduct(
      {
        expectedRevision: 0,
        product: {
          name: "Test Baklava",
          category: "Baklavalar",
          status: "Aktif",
          variants: [
            {
              size: "S",
              typeId: "type-item",
              price: 100,
              weight: 500,
              slices: 0,
            },
          ],
        },
      },
      null,
      "test@example.test",
    );
  } finally {
    await app.close();
  }
}
test("code management displays dotted SKU and three-digit product code without an editable prefix", async () => {
  const catalog = await snapshot();
  render(
    <CatalogProvider snapshot={catalog} notify={vi.fn()}>
      <CodeManagement user={{ role: "admin" }} />
    </CatalogProvider>,
  );
  await settle();
  const table = document.querySelector("table");
  expect(table.textContent).toContain("001");
  expect(table.textContent).toContain("100.000001");
  expect(table.textContent).toContain("100.000001.01");
  expect(table.textContent).not.toContain("HM");
  expect(
    document.querySelector('sl-input[label="Yeni ürünler için SKU öneki"]'),
  ).toBeNull();
});
test("variant editor and public card show the same prefix-free SKU while QR address stays stable", async () => {
  const catalog = await snapshot(),
    product = catalog.products[0];
  render(
    <VariantFields
      product={product}
      categories={catalog.categories}
      variantTypes={catalog.variantTypes}
      onChange={vi.fn()}
    />,
  );
  await settle();
  expect(document.body.textContent).toContain("100.000001.01");
  expect(document.body.textContent).not.toContain("HM100.");
  const card = productCardData(product, catalog.categories);
  expect(card.productCode).toBe("001");
  expect(card.sku).toBe("100.000001");
  expect(card.variants[0].sku).toBe("100.000001.01");
  expect(productCardPath(product)).toBe("/p/P000001");
});
