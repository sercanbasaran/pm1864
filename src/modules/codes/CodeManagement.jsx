import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Card from "../../components/ui/Card.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
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
import React, { useEffect, useState } from "react";
import {
  MagnifyingGlass,
  Barcode,
  DownloadSimple,
} from "@phosphor-icons/react";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { can } from "../../permissions.js";
import { downloadCSV } from "../../catalog-tools.js";
import { categoryOf, categoryPath } from "../../hierarchy.js";
export default function CodeManagement({ user }) {
  const { products, categories, settings, busy, mutate, notify } = useCatalog(),
    [query, setQuery] = useState(""),
    [prefix, setPrefix] = useState(settings.skuPrefix),
    [error, setError] = useState("");
  useEffect(() => setPrefix(settings.skuPrefix), [settings.skuPrefix]);
  const rows = products.filter((p) =>
    `${p.productCode} ${p.sku} ${p.name} ${p.variants.map((v) => v.sku).join(" ")}`
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );
  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await mutate("/settings", { settings: { skuPrefix: prefix } }, "PATCH");
      notify("Kodlama ayarları kaydedildi.");
    } catch (e) {
      setError(e.message);
    }
  }
  const saveAction = can(user, "settings.write") ? (
    <Button
      type="submit"
      variant="primary"
      className="btn"
      disabled={busy || !prefix || prefix === settings.skuPrefix}
    >
      Ayarları kaydet
    </Button>
  ) : null;
  return (
    <Card className="panel code-management">
      <div className="panel-title">
        <div>
          <h2>Ürün kodları ve SKU kayıtları</h2>
          <p className="muted">
            Ürün kodu iç kayıt kimliğidir. Ürün SKU’su ve her varyantın SKU’su
            ayrı, kalıcı kodlardır.
          </p>
        </div>
        <Button
          className="btn"
          onClick={() =>
            downloadCSV(
              [
                [
                  "Ürün kodu",
                  "Ürün",
                  "Kategori",
                  "Ürün SKU",
                  "Varyant",
                  "Varyant SKU",
                ],
                ...rows.flatMap((p) =>
                  p.variants.map((v) => [
                    p.productCode,
                    p.name,
                    categoryPath(categoryOf(p, categories), categories),
                    p.sku,
                    v.size,
                    v.sku,
                  ]),
                ),
              ],
              "HM1864_Kodlar.csv",
            )
          }
        >
          <DownloadSimple size={16} />
          Kodları indir
        </Button>
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
          Ürün kodları P000001; ürün SKU’ları marka–ana kategori–sıra; varyant
          SKU’ları ürün SKU–V0001 biçiminde üretilir. İsim ve kategori
          değişiklikleri kodları değiştirmez. Silinen varyant numarası tekrar
          kullanılmaz.
        </p>
        {can(user, "settings.write") ? (
          <form onSubmit={save}>
            <ActionBar>{saveAction}</ActionBar>
            {error && (
              <SlAlert open variant="danger" className="form-error">
                {error}
              </SlAlert>
            )}
            <div>
              <Input
                label="Yeni ürünler için SKU öneki"
                maxLength={8}
                required
                pattern="[A-Z0-9]{1,8}"
                value={prefix}
                onChange={(e) =>
                  setPrefix(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
              />
            </div>
            <ActionBar position="bottom">{saveAction}</ActionBar>
          </form>
        ) : (
          <p>
            SKU öneki: <strong>{settings.skuPrefix}</strong>. Kodlama ayarlarını
            yöneticiler değiştirebilir.
          </p>
        )}
      </div>
    </Card>
  );
}
