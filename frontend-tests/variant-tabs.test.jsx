import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import VariantManagement from "../src/modules/variants/VariantManagement.jsx";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import { settle } from "./shadow-queries.js";

afterEach(cleanup);
test("variant sections use separate tabs and retain form state across switches", async () => {
  render(
    <CatalogProvider
      snapshot={{ revision: 0, products: [], categories: [], variantTypes: [] }}
      notify={vi.fn()}
    >
      <VariantManagement
        products={[]}
        categories={[]}
        canWrite
        onEdit={vi.fn()}
      />
    </CatalogProvider>,
  );
  await settle();
  const tabs = [...document.querySelectorAll("sl-tab")];
  const management = document.querySelector('sl-tab-panel[name="management"]');
  const types = document.querySelector('sl-tab-panel[name="types"]');
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    "Varyant yönetimi",
    "Varyant tipleri",
  ]);
  expect(management.active).toBe(true);
  expect(types.active).toBe(false);
  fireEvent.click(tabs[1]);
  await waitFor(() => expect(types.active).toBe(true));
  expect(management.active).toBe(false);
  const input = types.querySelector("sl-input");
  input.value = "Hediye seti";
  fireEvent(input, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  fireEvent.click(tabs[0]);
  await waitFor(() => expect(management.active).toBe(true));
  expect(types.active).toBe(false);
  fireEvent.click(tabs[1]);
  await waitFor(() => expect(types.active).toBe(true));
  expect(input.value).toBe("Hediye seti");
});
