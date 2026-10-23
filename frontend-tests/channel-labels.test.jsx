import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { settle } from "./shadow-queries.js";
import CategoryManagement from "../src/modules/categories/CategoryManagement.jsx";
import {
  SalesChannelSummary,
  SalesChannelSwitches,
} from "../src/components/ui/SalesChannels.jsx";
import { salesChannels } from "../src/sales-availability.js";
import { moduleFor } from "../src/app/modules.js";
const labels = ["Mağaza", "E-Mağaza", "Sipariş Platformları"];
const categories = [
  {
    id: "r",
    name: "Baklava",
    code: "100",
    slug: "baklava",
    active: true,
    parentId: "",
    salesAvailability: { store: true, online: false, foodDelivery: true },
  },
  {
    id: "c",
    name: "Fistikli",
    code: "101",
    slug: "fistikli",
    active: true,
    parentId: "r",
  },
];
afterEach(cleanup);
test("category roots are highlighted and small channel tags show only consistent names with disabled state", async () => {
  render(
    <CategoryManagement
      categories={categories}
      products={[]}
      readOnly
      route="categories"
      onNavigate={vi.fn()}
    />,
  );
  await settle();
  const rows = [...document.querySelectorAll("tbody tr")];
  expect(rows[0].classList.contains("category-main-row")).toBe(true);
  expect(rows[1].classList.contains("category-main-row")).toBe(false);
  for (const row of rows) {
    const tags = [...row.querySelectorAll("sl-tag")];
    expect(tags.map((t) => t.textContent.trim())).toEqual(labels);
    expect(tags.every((t) => t.size === "small")).toBe(true);
    expect(tags[0].variant).toBe("success");
    expect(tags[1].variant).toBe("neutral");
    expect(tags[1].getAttribute("aria-disabled")).toBe("true");
    expect(tags[1].classList.contains("is-disabled")).toBe(true);
    expect(tags[0].getAttribute("aria-disabled")).toBe("false");
  }
  expect(document.querySelector("table").textContent).not.toMatch(
    /Açık|Kapalı/,
  );
});
test("product and variant channel summaries share labels and disabled styling; switches and module names match", async () => {
  const product = {
    categoryId: "c",
    status: "Aktif",
    salesAvailability: { store: true, online: true, foodDelivery: false },
  };
  const view = render(
    <SalesChannelSummary product={product} categories={categories} />,
  );
  await settle();
  let tags = [...document.querySelectorAll("sl-tag")];
  expect(tags.map((t) => t.textContent.trim())).toEqual(labels);
  expect(tags.map((t) => t.variant)).toEqual(["success", "neutral", "neutral"]);
  view.rerender(
    <SalesChannelSummary
      product={product}
      variant={{ active: false }}
      categories={categories}
    />,
  );
  await settle();
  expect(
    [...document.querySelectorAll("sl-tag")].every(
      (t) => t.getAttribute("aria-disabled") === "true",
    ),
  ).toBe(true);
  view.rerender(
    <SalesChannelSwitches
      product={product}
      categories={categories}
      onChange={vi.fn()}
    />,
  );
  await settle();
  expect(
    [...document.querySelectorAll("sl-switch")].map((t) =>
      t.getAttribute("aria-label"),
    ),
  ).toEqual(labels);
  expect(salesChannels.map((c) => c.label)).toEqual(labels);
  expect(
    ["stores", "digital-stores", "food-platforms"].map(
      (id) => moduleFor(id).label,
    ),
  ).toEqual(labels);
});
