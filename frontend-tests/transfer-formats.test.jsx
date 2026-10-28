import { expect, test } from 'vitest';
import * as XLSX from 'xlsx';
import { parseText, serializeText, validateRows } from '../src/modules/transfer/transfer.js';
import { parseProductWorkbook } from '../src/modules/products/product-import-parser.js';
const columns = ['Ürün adı', 'Kategori kodu', 'Kısa açıklama'];
const rows = [['Baklava', '0100010', 'Fıstık & ceviz <özel>']];
const expected = {'Ürün adı':'Baklava','Kategori kodu':'0100010','Kısa açıklama':'Fıstık & ceviz <özel>'};
test('JSON and XML preserve codes, Unicode and special characters', () => {
 for (const format of ['json','xml']) expect(parseText(serializeText(columns, rows, format), format)).toEqual([expected]);
});
test('CSV and genuine XLS retain the text category code', () => {
 const csv = new TextEncoder().encode(serializeText(columns, rows, 'csv'));
 expect(parseProductWorkbook(csv)).toEqual([expected]);
 const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([columns, ...rows]), 'Ürünler');
 const buffer = XLSX.write(workbook, { bookType:'biff8', type:'array' });
 expect(parseProductWorkbook(buffer)).toEqual([expected]);
});
test('unsafe or malformed records and XML declarations are rejected', () => {
 expect(() => parseText('<!DOCTYPE x [<!ENTITY y "abc">]><kayitlar/>','xml')).toThrow();
 expect(() => parseText('<kayitlar><kayit><alan ad="x">1</alan><alan ad="x">2</alan></kayit></kayitlar>','xml')).toThrow();
 expect(() => validateRows(Array.from({length:501}, () => ({x:'a'})))).toThrow();
 expect(() => validateRows([{nested:{x:1}}])).toThrow();
});
