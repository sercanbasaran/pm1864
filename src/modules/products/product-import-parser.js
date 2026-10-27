import * as XLSX from "xlsx";

// Bound work before converting cells to row objects; imported files are untrusted.
export function parseProductWorkbook(buffer) {
  const book = XLSX.read(buffer, {
    type: "array",
    sheets: 0,
    sheetRows: 502,
    cellHTML: false,
    cellFormula: false,
    bookVBA: false,
  });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet?.["!ref"]) throw new Error("Dosyada ürün tablosu bulunamadı.");
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  if (range.e.c > 31 || range.e.r > 500)
    throw new Error("Dosyada en fazla 500 ürün ve 32 sütun bulunabilir.");
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (!data.length || data.length > 500)
    throw new Error("Dosyada 1–500 ürün satırı bulunmalı.");
  return data;
}
