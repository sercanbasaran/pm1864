import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNutrition,
  serializeNutrition,
  validateNutrition,
} from "../src/nutrition.js";
import {
  productDetailSteps,
  validateProductInformation,
} from "../src/product-information.js";
test("Turkish nutrition text round-trips through the table without filling missing values", () => {
  const source =
    "100 g için: Enerji 297,5 kcal / 1.244,7 kJ; Yağ 4,2 g; Doymuş yağ 1,7 g; Karbonhidrat 61,8 g; Şeker 12,8 g; Lif 0 g; Protein 3,1 g; Tuz 0,02 g.";
  const parsed = parseNutrition(source);
  assert.equal(parsed.values.energyKcal, "297.5");
  assert.equal(parsed.values.energyKj, "1244.7");
  assert.equal(parsed.values.fibre, "0");
  assert.equal(parsed.values.salt, "0.02");
  assert.equal(parsed.notes, "");
  assert.deepEqual(
    parseNutrition(serializeNutrition(parsed.values)).values,
    parsed.values,
  );
  const partial = parseNutrition("100 g için: Enerji 400 kcal.");
  assert.equal(partial.values.energyKj, "");
  assert.equal(partial.values.fat, "");
  assert.equal(partial.notes, "");
});
test("legacy nutrition notes survive table editing and negative quantities are rejected", () => {
  const parsed = parseNutrition("Değerler üreticiden alınacaktır.");
  assert.equal(parsed.notes, "Değerler üreticiden alınacaktır");
  const updated = serializeNutrition(
    { ...parsed.values, protein: "2.5" },
    parsed.notes,
  );
  assert.equal(parseNutrition(updated).notes, parsed.notes);
  assert.ok(validateNutrition("100 g için: Yağ -2 g."));
  assert.equal(validateNutrition("100 g için: Tuz 0 g."), "");
  assert.ok(validateProductInformation({ ingredients: "x".repeat(4001) }));
  assert.ok(validateProductInformation({ servingSuggestion: {} }));
});
test("product details expose precisely the eight requested steps", () => {
  assert.deepEqual(
    productDetailSteps.map((s) => s.label),
    [
      "Genel bilgiler",
      "İçindekiler",
      "Alerjen uyarısı",
      "Besin Değerleri",
      "Servis Önerisi",
      "Saklama Koşulları",
      "Uzun Süreli Muhafaza",
      "Varyantlar ve fiyatlar",
    ],
  );
});
