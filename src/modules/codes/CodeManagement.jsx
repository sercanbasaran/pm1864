import FormatMenu from "../transfer/FormatMenu.jsx";
import { downloadTransfer } from "../transfer/transfer.js";
import Card from "../../components/ui/Card.jsx";
import {
  Button,
  Input,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import React, { useState } from "react";
import {
  MagnifyingGlass,
  Barcode,
} from "@phosphor-icons/react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { categoryOf, categoryPath } from "../../hierarchy.js";
export default function CodeManagement({ user }) {
  const { products, categories, notify } = useCatalog(),
    [query, setQuery] = useState("");
  const rows = products.filter((p) =>
    `${p.productCode} ${p.sku} ${p.name} ${p.variants.map((v) => v.sku).join(" ")}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );
  return (
    <Card className="panel code-management">
      <div className="panel-title">
        <div>
          <h2>Ürün kodları ve SKU kayıtları</h2>
          <p className="muted">
            Ürün kodu kategori kod grubu içindeki sıra numarasıdır. Ürün SKU'su
            ve her varyantın SKU'su ayrı, kalıcı kodlardır.
          </p>
        </div>
        <FormatMenu direction="export" disabled={!rows.length} onSelect={format => downloadTransfer(["Ürün kodu", "Ürün", "Kategori", "Ürün SKU", "Varyant", "Varyant SKU"], rows.flatMap(p => p.variants.length ? p.variants.map(v => [p.productCode, p.name, categoryPath(categoryOf(p, categories), categories), p.sku, v.size, v.sku]) : [[p.productCode, p.name, categoryPath(categoryOf(p, categories), categories), p.sku, "", ""]]), format, "kodlar", "Kodlar").catch(() => notify("Dışa aktarma dosyası hazırlanamadı."))} />
      </div>
      <div className="module-toolbar">
        <div className="search">
          <Input
            prefix={<MagnifyingGlass size={17} />}
            aria-label="Ürün kodu veya SKU ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün kodu, ad veya SKU ara"
          />
        </div>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Kaydırılabilir tablo"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeading>ÜRÜN KODU</TableHeading>
              <TableHeading>ÜRÜN</TableHeading>
              <TableHeading>ÜRÜN SKU</TableHeading>
              <TableHeading>VARYANT SKU’LARI</TableHeading>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <code>{p.productCode}</code>
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <code>{p.sku}</code>
                </TableCell>
                <TableCell>
                  {p.variants.map((v) => (
                    <div className="sku-line" key={v.id}>
                      <span>{v.size}</span>
                      <code>{v.sku}</code>
                    </div>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!rows.length && <p className="muted">Eşleşen kod bulunamadı.</p>}
      <div className="code-settings">
        <h3>
          <Barcode size={20} />
          Kodlama kuralları
        </h3>
        <p>
          Ana kategori (4 rakam) · Alt kategori (3 rakam) · Ürün (3 rakam) ·
          Varyant (2 rakam).
        </p>
        <p>
          Varyant SKU örneği: <code>0100.101001.01</code>. Ürün SKU örneği:{" "}
          <code>0100.101001</code>.
        </p>
        <p>
          Ürün numaraları kategori kod grubu içinde 001–999; varyant numaraları
          ürün içinde 01–99 aralığında üretilir. Kodlar sunucuda atanır. Silinen
          varyant numaraları tekrar kullanılmaz. İsim veya kategori değişikliği
          mevcut SKU'yu değiştirmez.
        </p>
      </div>
    </Card>
  );
}
