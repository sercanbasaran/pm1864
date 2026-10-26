import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
import CategoryPromotion from "../src/modules/categories/CategoryPromotion.jsx";
afterEach(cleanup);
const root = {
  id: "r",
  name: "Baklava",
  code: "0100",
  slug: "baklava",
  active: true,
  salesAvailability: { store: true, online: false, foodDelivery: true },
};
const child = {
  id: "c",
  parentId: "r",
  name: "Fıstıklı",
  code: "101",
  slug: "fistikli",
  active: true,
};
const categories = [root, child];
const find = (text) =>
  [...document.querySelectorAll("sl-button")].find((b) =>
    b.textContent.includes(text),
  );
test("child editor previews promotion and submits the shown code/revision only after confirmation", async () => {
  const onPromote = vi.fn(async () => true),
    onClose = vi.fn();
  render(
    <CategoryManagement
      categories={categories}
      products={[{ categoryId: "c" }]}
      route="categories/c/edit"
      revision={7}
      onPromote={onPromote}
      onClose={onClose}
      onNavigate={vi.fn()}
    />,
  );
  await settle();
  fireEvent.click(find("Ana kategoriye dönüştür"));
  await settle();
  expect(onPromote).not.toHaveBeenCalled();
  expect(document.querySelector("sl-dialog").textContent).toContain(
    "101 → 0200",
  );
  expect(document.querySelector("sl-dialog").textContent).toContain(
    "Bağlı ürün1",
  );
  fireEvent.click(find("Dönüştürmeyi onayla"));
  await waitFor(() =>
    expect(onPromote).toHaveBeenCalledWith("c", {
      code: "0200",
      previewRevision: 7,
    }),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});
test("stale previews disable confirmation and failed submissions remain reviewable", async () => {
  const onPromote = vi.fn().mockRejectedValue(new Error("Kayıt değişti"));
  const props = {
    category: child,
    categories,
    products: [],
    revision: 7,
    onPromote,
    onClose: vi.fn(),
  };
  const view = render(<CategoryPromotion {...props} />);
  await settle();
  fireEvent.click(find("Dönüştürmeyi onayla"));
  await waitFor(() =>
    expect(document.querySelector("sl-alert")?.textContent).toContain(
      "Kayıt değişti",
    ),
  );
  view.rerender(<CategoryPromotion {...props} revision={8} />);
  await settle();
  expect(find("Dönüştürmeyi onayla").disabled).toBe(true);
  expect(document.querySelector("sl-alert").textContent).toContain(
    "Katalog değişti",
  );
});
test("root editors do not offer promotion", async () => {
  render(
    <CategoryManagement
      categories={categories}
      products={[]}
      route="categories/r/edit"
      revision={7}
      onPromote={vi.fn()}
      onClose={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );
  await settle();
  expect(find("Ana kategoriye dönüştür")).toBeUndefined();
});
