import React, { useState } from "react";
import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SatietyIndicator from "../src/modules/products/SatietyIndicator.jsx";
import ProductDetails from "../src/modules/products/ProductDetails.jsx";
afterEach(cleanup);

test.each(["pistachio", "walnut"])(
  "%s shows five illustrations and a readable level",
  (type) => {
    render(<SatietyIndicator value={{ type, level: 3 }} />);
    expect(document.querySelectorAll(".satiety-icon")).toHaveLength(5);
    expect(document.querySelectorAll(".satiety-icon.is-filled")).toHaveLength(
      3,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "3 / 5",
    );
  },
);

test("suggesting walnut does not select a level, and the radio picker and clear control update the preview", () => {
  function Editor() {
    const [value, setValue] = useState(null);
    return (
      <SatietyIndicator
        value={value}
        editing
        suggestedType="walnut"
        onChange={setValue}
      />
    );
  }
  render(<Editor />);
  expect(screen.getByRole("group", { name: "Ceviz yoğunluğu" })).toBeTruthy();
  expect(screen.getAllByRole("radio").every((radio) => !radio.checked)).toBe(
    true,
  );
  fireEvent.click(screen.getByRole("radio", { name: "5 / 5 · Çok yoğun" }));
  expect(document.querySelectorAll(".satiety-icon.is-filled")).toHaveLength(5);
  fireEvent.click(
    [...document.querySelectorAll("sl-button")].find(
      (button) => button.textContent === "Seçimi temizle",
    ),
  );
  expect(document.querySelectorAll(".satiety-icon.is-filled")).toHaveLength(0);
});

test("product pages hide empty satiety and render entered satiety without object text", () => {
  const product = {
    name: "Baklava",
    category: "Baklavalar",
    productCode: "0100101001",
    variants: [],
  };
  const view = render(<ProductDetails product={product} />);
  expect(
    [...document.querySelectorAll("sl-details")].some(
      (item) => item.summary === "Doygunluk bilgisi",
    ),
  ).toBe(false);
  view.rerender(
    <ProductDetails
      product={{ ...product, satiety: { type: "walnut", level: 2 } }}
    />,
  );
  expect(
    [...document.querySelectorAll("sl-details")].some(
      (item) => item.summary === "Doygunluk bilgisi",
    ),
  ).toBe(true);
  expect(
    document.querySelector(".satiety-display").getAttribute("aria-label"),
  ).toBe("Ceviz yoğunluğu: 2 / 5 · Hafif");
});
