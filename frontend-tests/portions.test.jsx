import React, { useState } from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import ProductPortion from "../src/modules/products/ProductPortion.jsx";
import ProductDetails from "../src/modules/products/ProductDetails.jsx";
import ProductEditor from "../src/modules/products/ProductEditor.jsx";
import VariantCompositionFields from "../src/modules/variants/VariantCompositionFields.jsx";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import { settle } from "./shadow-queries.js";
afterEach(cleanup);
const product = {
  id: 1,
  name: "Baklava",
  category: "Baklavalar",
  categoryId: "a",
  status: "Aktif",
  variants: [],
  unitPricing: { unit: "Dilim", price: 100, weight: 40 },
  portion: { quantity: 3, unit: "Dilim" },
};
const snapshot = {
  revision: 1,
  products: [product],
  categories: [{ id: "a", name: "Baklavalar", active: true }],
  variantTypes: [{ id: "portion", name: "Porsiyon" }],
  satietyProducts: [],
  consumables: [],
};
test("portion field uses the product unit and can be edited", async () => {
  function Example() {
    const [value, setValue] = useState(null);
    return (
      <ProductPortion
        pricing={{ unit: "Gram" }}
        value={value}
        editing
        onChange={setValue}
      />
    );
  }
  render(<Example />);
  await settle();
  const input = document.querySelector(
    'sl-input[aria-label="Bir kişilik porsiyon miktarı"]',
  );
  expect(input.label).toContain("gram");
  input.value = "150";
  fireEvent(input, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  expect(input.value).toBe("150");
});
test("new product wizard includes the per-person portion field", async () => {
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ProductEditor product={{ ...product, isNew: true }} onClose={vi.fn()} />
    </CatalogProvider>,
  );
  await settle();
  expect(
    document.querySelector(
      'sl-input[aria-label="Bir kişilik porsiyon miktarı"]',
    ).value,
  ).toBe("3");
});
test("variant wizard shows computed portions and explains missing product portions", async () => {
  const variant = {
    typeId: "portion",
    sourceProductId: 1,
    items: [{ productId: 1, quantity: 12 }],
    size: "Baklava [Porsiyon]",
    packaging: "Tabakta servis",
    consumables: [],
    images: [],
  };
  render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <VariantCompositionFields
        product={{ ...product, variants: [variant] }}
        onChange={vi.fn()}
        initialStep={2}
      />
    </CatalogProvider>,
  );
  await settle();
  expect(document.body.textContent).toContain("≈ 4 kişilik");
});
test("cards display product portions and variant portion counts", () => {
  const view = render(<ProductDetails product={product} />);
  expect(document.body.textContent).toContain("1 kişilik: 3 dilim");
  view.rerender(
    <ProductDetails
      product={{
        name: "Kutu",
        isVariantCard: true,
        portionCount: 2.5,
        variants: [],
      }}
    />,
  );
  expect(document.body.textContent).toContain("≈ 2,5 kişilik");
});
