import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CatalogProvider } from "../src/app/CatalogContext.jsx";
import ChannelManagement from "../src/modules/channels/ChannelManagement.jsx";
import { settle } from "./shadow-queries.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const store = {
  id: "store",
  kind: "stores",
  name: "Test Mağaza",
  code: "HM-TEST",
  country: "Türkiye",
  city: "İstanbul",
  district: "Fatih",
  address: "Adres",
  phone: "+90 212 555 11 22",
  openingHours: "7/24",
  storeType: "Cadde Mağaza",
  status: "Aktif",
  active: true,
  description: "",
  notes: "",
  services: ["Wi-Fi"],
  images: [],
};
const snapshot = {
  revision: 0,
  products: [],
  categories: [],
  managedChannels: [store],
};
const action = (text) =>
  [...document.querySelectorAll("sl-button")].find(
    (button) => button.textContent.trim() === text,
  );
function show(canWrite = true) {
  return render(
    <CatalogProvider snapshot={snapshot} notify={vi.fn()}>
      <ChannelManagement kind="stores" canWrite={canWrite} />
    </CatalogProvider>,
  );
}
test("store form includes spreadsheet fields, readiness status and multiple photo upload", async () => {
  show();
  await settle();
  fireEvent.click(action("Düzenle"));
  await settle();
  for (const label of [
    "Mağaza adı",
    "Mağaza kodu",
    "Ülke",
    "Şehir",
    "İlçe / Bölge",
    "Tam adres",
    "Telefon",
    "Çalışma saatleri",
    "Mağaza tipi",
    "Hizmetler",
  ])
    expect(
      [...document.querySelectorAll("sl-input,sl-textarea")].find(
        (input) => input.label === label,
      ),
    ).toBeTruthy();
  const upload = document.querySelector(
    'input[aria-label="Mağaza görsellerini yükle"]',
  );
  expect(upload.multiple).toBe(true);
  expect(document.querySelector(".store-photos").textContent).toContain("2 MB");
  const status = [...document.querySelectorAll("sl-select")].find(
    (select) => select.label === "Aktif durumu",
  );
  expect(status.textContent).toContain("Hazırlık Aşamasında");
});
test("editing services allows comma entry and saves the full store record", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ catalog: { ...snapshot, revision: 1 } })),
  );
  vi.stubGlobal("fetch", fetch);
  show();
  await settle();
  fireEvent.click(action("Düzenle"));
  await settle();
  const services = [...document.querySelectorAll("sl-textarea")].find(
    (input) => input.label === "Hizmetler",
  );
  services.value = "Wi-Fi,";
  fireEvent(services, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  expect(services.value).toBe("Wi-Fi,");
  services.value = "Wi-Fi, Paket Servis";
  fireEvent(services, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    name: store.name,
    services: ["Wi-Fi", "Paket Servis"],
    country: "Türkiye",
    openingHours: "7/24",
    images: [],
  });
});
test("photo upload refreshes revision, links the uploaded image and then allows save", async () => {
  const fetch = vi.fn(async (url) => {
    if (url === "/api/media")
      return new Response(
        JSON.stringify({
          asset: { id: "photo", url: "/api/media/photo/content" },
        }),
        { status: 201 },
      );
    return new Response(
      JSON.stringify({
        catalog: { ...snapshot, revision: url === "/api/catalog" ? 1 : 2 },
      }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  show();
  await settle();
  fireEvent.click(action("Düzenle"));
  await settle();
  fireEvent.change(
    document.querySelector('input[aria-label="Mağaza görsellerini yükle"]'),
    {
      target: {
        files: [new File(["image"], "store.png", { type: "image/png" })],
      },
    },
  );
  await waitFor(() =>
    expect(document.querySelector(".store-photos img")).not.toBeNull(),
  );
  await settle();
  fireEvent.submit(document.querySelector("form"));
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(
        ([url]) => url === "/api/managed-channels/stores/store",
      ),
    ).toBe(true),
  );
  const [, options] = fetch.mock.calls.find(
    ([url]) => url === "/api/managed-channels/stores/store",
  );
  expect(JSON.parse(options.body)).toMatchObject({
    expectedRevision: 1,
    images: [{ id: "photo", url: "/api/media/photo/content" }],
  });
});
test("store search works and viewers cannot create or edit stores", async () => {
  show(false);
  await settle();
  expect(action("Yeni ekle")).toBeUndefined();
  expect(action("Düzenle")).toBeUndefined();
  const search = [...document.querySelectorAll("sl-input")].find(
    (input) => input.label === "Mağaza ara",
  );
  search.value = "Dubai";
  fireEvent(search, new CustomEvent("sl-input", { bubbles: true }));
  await settle();
  expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
  expect(document.body.textContent).toContain("Aramaya uygun kayıt bulunamadı");
});
