import { test, expect, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  downloadTransfer,
  parseText,
  serializeText,
  validateRows,
} from "../src/modules/transfer/transfer.js";
import { parseProductWorkbook } from "../src/modules/products/product-import-parser.js";
import {
  productTransferColumns,
  productReferenceSheets,
  parseProductTransferRows,
  productTransferRow,
} from "../src/modules/products/product-transfer.js";
vi.mock("xlsx", async (importOriginal) => ({
  ...(await importOriginal()),
  writeFile: vi.fn(),
}));
const categories = [
  { id: "root", name: "Tatlılar", code: "10", active: true },
  { id: "child", name: "Sütlü", code: "11", parentId: "root", active: true },
];
const context = {
  products: [],
  categories,
  variantTypes: [],
  satietyProducts: [],
};
const row = Object.fromEntries(
  productTransferColumns.map((column) => [column, ""]),
);
Object.assign(row, {
  "Ürün adı": "Muhallebi",
  "Kategori kodu": "10",
  "Alt kategori kodu": "11",
  Birim: "Gram",
  "Birim fiyat": "2,5",
  "1 kişilik porsiyon miktarı": "150",
  "Enerji (kcal/100 g)": "200",
  "Tuz (g/100 g)": "0",
});
test("expanded product schema survives JSON XML CSV and real XLS parsing", () => {
  expect(productTransferColumns.length).toBeGreaterThan(32);
  for (const format of ["json", "xml", "csv", "xls"]) {
    const values = productTransferColumns.map((column) => row[column]);
    let parsed;
    if (["json", "xml"].includes(format))
      parsed = parseText(
        serializeText(productTransferColumns, [values], format),
        format,
      );
    else if (format === "csv")
      parsed = parseProductWorkbook(
        new TextEncoder().encode(
          serializeText(productTransferColumns, [values], format),
        ),
      );
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([productTransferColumns, values]),
        "Ürünler",
      );
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([["Açıklama"], ["Bu satır ürün değildir"]]),
        "Kılavuz",
      );
      parsed = parseProductWorkbook(
        XLSX.write(book, { bookType: "biff8", type: "array" }),
      );
    }
    expect(validateRows(parsed)).toHaveLength(1);
    const result = parseProductTransferRows(parsed, context)[0];
    expect(result.issue).toBe("");
    expect(result.product.categoryId).toBe("child");
    expect(result.product.portion.quantity).toBe(150);
  }
});
test("Excel template includes separate instructions and current category, ingredient and media references", async () => {
  await downloadTransfer(
    productTransferColumns,
    [],
    "xls",
    "urun-ice-aktarma-sablonu",
    "Ürünler",
    productReferenceSheets(
      categories,
      [{ id: "banana", name: "Muz", active: true }],
      [{ id: "image", name: "urun.png" }],
    ),
  );
  const book = XLSX.writeFile.mock.calls.at(-1)[0];
  expect(book.SheetNames).toEqual([
    "Ürünler",
    "Alan kılavuzu",
    "Kategori kodları",
    "Doygunluk tanımları",
    "Görsel kimlikleri",
  ]);
  expect(
    XLSX.utils.sheet_to_json(book.Sheets["Kategori kodları"])[1],
  ).toMatchObject({ "Kategori kodu": "10", "Alt kategori kodu": "11" });
  expect(
    XLSX.utils.sheet_to_json(book.Sheets["Doygunluk tanımları"])[0].Ad,
  ).toBe("Muz");
  expect(
    XLSX.utils.sheet_to_json(book.Sheets["Görsel kimlikleri"])[0][
      "Görsel kimliği"
    ],
  ).toBe("image");
});
test("JSON and XML empty template records expose every field and cannot create blank products", () => {
  for (const format of ["json", "xml"]) {
    const data = parseText(
      serializeText(
        productTransferColumns,
        [productTransferColumns.map(() => "")],
        format,
      ),
      format,
    );
    expect(Object.keys(data[0])).toEqual(productTransferColumns);
    expect(() => parseProductTransferRows(data, context)).toThrow(
      "doldurulmuş",
    );
  }
});
test("bounded column limit still rejects oversized inputs", () => {
  const columns = Array.from({ length: 65 }, (_, i) => `Alan ${i}`);
  expect(() =>
    validateRows([Object.fromEntries(columns.map((key) => [key, "x"]))]),
  ).toThrow();
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([columns, columns]),
    "Ürünler",
  );
  expect(() =>
    parseProductWorkbook(
      XLSX.write(book, { bookType: "biff8", type: "array" }),
    ),
  ).toThrow("64 sütun");
});
