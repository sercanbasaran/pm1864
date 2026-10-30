import test from "node:test";
import assert from "node:assert/strict";
import { missingProductInformation } from "../src/modules/products/product-quality.js";
test("quality checks distinguish missing product information without requiring optional variants", () => {
  const p = {
    name: "Baklava",
    category: "Fıstıklı Baklavalar",
    images: [{ id: "x" }],
    description: "Açıklama",
    ingredients: "Un",
    allergens: "Buğday",
    servingSuggestion: "Servis",
    storageConditions: "Serin",
    longTermStorage: "Dondurucu",
    satiety: [{ ingredientId: "pistachio", level: 3 }],
    unitPricing: { unit: "Dilim", price: 50, weight: 30 },
    nutrition:
      "100 g için: Enerji 400 kcal / 1673 kJ; Yağ 20 g; Doymuş yağ 3 g; Karbonhidrat 50 g; Şeker 25 g; Lif 2 g; Protein 6 g; Tuz 0,2 g.",
    variants: [],
  };
  assert.equal(missingProductInformation(p, "any"), false);
  assert.equal(
    missingProductInformation({ ...p, description: " " }, "description"),
    true,
  );
  assert.equal(missingProductInformation({ ...p, images: [] }, "image"), true);
  assert.equal(
    missingProductInformation(
      { ...p, nutrition: "100 g için: Enerji 400 kcal." },
      "nutrition",
    ),
    true,
  );
  assert.equal(
    missingProductInformation({ ...p, satiety: [] }, "satiety"),
    true,
  );
  assert.equal(
    missingProductInformation(
      { ...p, category: "Lokumlar", satiety: [] },
      "satiety",
    ),
    true,
  );
  assert.equal(
    missingProductInformation(
      {
        ...p,
        name: "Muzlu Muhallebi",
        category: "Muhallebiler",
        satiety: [{ ingredientId: "banana", level: 3 }],
      },
      "satiety",
    ),
    false,
  );
});
