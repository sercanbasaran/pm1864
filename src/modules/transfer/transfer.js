import { MAX_TRANSFER_COLUMNS } from "./transfer-limits.js";
import { csvText } from "../../catalog-tools.js";
import { readProductWorkbook } from "../products/read-product-workbook.js";

export const formats = ["json", "csv", "xml", "xls"];
export const formatLabel = (format) =>
  ({ json: "JSON", csv: "CSV", xml: "XML", xls: "Excel (*.xls)" })[format];
export function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500)
    throw Error("Dosyada 1–500 kayıt bulunmalı.");
  return rows.map((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row) ||
      Object.keys(row).length > MAX_TRANSFER_COLUMNS ||
      Object.entries(row).some(
        ([key, value]) =>
          !key ||
          (typeof value === "object" && value !== null) ||
          (!["string", "number", "boolean", "undefined"].includes(
            typeof value,
          ) &&
            value !== null),
      )
    )
      throw Error("Dosyada geçersiz kayıt veya 64'ten fazla sütun var.");
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value == null ? "" : String(value),
      ]),
    );
  });
}
export function parseText(text, format) {
  if (format === "json") {
    try {
      return validateRows(JSON.parse(text));
    } catch (e) {
      if (e instanceof SyntaxError)
        throw Error("Geçerli bir JSON kayıt dizisi seçin.");
      throw e;
    }
  }
  if (format === "xml") {
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw Error("XML dosyasında DTD ve entity tanımları kullanılamaz.");
    const document = new DOMParser().parseFromString(text, "application/xml");
    if (
      document.querySelector("parsererror") ||
      document.documentElement.tagName !== "kayitlar"
    )
      throw Error("Geçerli bir aktarım XML dosyası seçin.");
    const children = [...document.documentElement.children];
    if (children.some((node) => node.tagName !== "kayit"))
      throw Error("XML kayıt yapısı geçersiz.");
    return validateRows(
      children.map((node) => {
        const fields = [...node.children];
        if (
          fields.length > MAX_TRANSFER_COLUMNS ||
          fields.some(
            (field) =>
              field.tagName !== "alan" ||
              !field.getAttribute("ad") ||
              field.children.length,
          ) ||
          new Set(fields.map((field) => field.getAttribute("ad"))).size !==
            fields.length
        )
          throw Error("XML alan yapısı geçersiz.");
        return Object.fromEntries(
          fields.map((field) => [field.getAttribute("ad"), field.textContent]),
        );
      }),
    );
  }
  throw Error("Desteklenmeyen dosya biçimi.");
}
export async function readTransferFile(file, format) {
  if (!formats.includes(format)) throw Error("Desteklenmeyen dosya biçimi.");
  if (file.size > 5 * 1024 * 1024) throw Error("Dosya en fazla 5 MB olabilir.");
  const ext = file.name.split(".").pop().toLowerCase();
  if (!(format === "xls" ? ["xls", "xlsx"].includes(ext) : ext === format))
    throw Error(`Seçilen dosya ${formatLabel(format)} biçiminde olmalı.`);
  if (format === "xls" || format === "csv")
    return validateRows(await readProductWorkbook(await file.arrayBuffer()));
  return parseText(await file.text(), format);
}
const escapeXml = (value) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export function serializeText(columns, rows, format) {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((column, i) => [column, row[i] ?? ""])),
  );
  if (format === "json") return JSON.stringify(data, null, 2);
  if (format === "csv") return csvText([columns, ...rows]);
  if (format === "xml")
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n<kayitlar>\n' +
      data
        .map(
          (row) =>
            "  <kayit>\n" +
            columns
              .map(
                (column) =>
                  `    <alan ad="${escapeXml(column)}">${escapeXml(row[column])}</alan>`,
              )
              .join("\n") +
            "\n  </kayit>",
        )
        .join("\n") +
      "\n</kayitlar>\n"
    );
  throw Error("Desteklenmeyen dosya biçimi.");
}
export async function downloadTransfer(
  columns,
  rows,
  format,
  filename,
  sheetName = "Kayıtlar",
  referenceSheets = [],
) {
  if (!formats.includes(format)) throw Error("Desteklenmeyen dosya biçimi.");
  if (format === "xls") {
    const xlsx = await import("xlsx");
    const book = xlsx.utils.book_new();
    const sheet = xlsx.utils.aoa_to_sheet([columns, ...rows]);
    sheet["!cols"] = columns.map(() => ({ wch: 24 }));
    xlsx.utils.book_append_sheet(book, sheet, sheetName);
    for (const reference of referenceSheets) {
      const page = xlsx.utils.aoa_to_sheet([
        reference.columns,
        ...reference.rows,
      ]);
      page["!cols"] = reference.columns.map((_, i) => ({
        wch: i === 1 ? 70 : 28,
      }));
      xlsx.utils.book_append_sheet(book, page, reference.name);
    }
    xlsx.writeFile(book, `${filename}.xls`, { bookType: "biff8" });
    return;
  }
  const type = {
    json: "application/json",
    csv: "text/csv",
    xml: "application/xml",
  }[format];
  const url = URL.createObjectURL(
    new Blob([serializeText(columns, rows, format)], {
      type: `${type};charset=utf-8`,
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
