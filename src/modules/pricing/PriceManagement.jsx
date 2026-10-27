import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Modal from "../../components/ui/Modal.jsx";
import Card from "../../components/ui/Card.jsx";
import ActionBar from "../../components/ui/ActionBar.jsx";
import {
  Button,
  Input,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
} from "../../components/ui/Controls.jsx";
import { categoryMatches, categoryOf, categoryPath } from "../../hierarchy.js";
import React, { useState } from "react";
import {
  MagnifyingGlass,
  Check,
  X,
  PencilSimple,
  Tag,
} from "@phosphor-icons/react";
import { money, dateTime, downloadCSV } from "../../catalog-tools.js";
export default function PriceManager({
  products,
  categories,
  canWrite,
  onSave,
  onBulk,
  busy,
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [draft, setDraft] = useState(null),
    [error, setError] = useState("");
  const visible = products.filter(
    (p) =>
      categoryMatches(p, category, categories) &&
      (!status || p.status === status) &&
      `${p.name} ${p.sku}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const rows = visible.flatMap((p) =>
    p.variants.map((v) => [
      p.name,
      p.sku,
      categoryPath(categoryOf(p, categories), categories),
      v.size,
      v.weight,
      v.price,
      p.status,
    ]),
  );
  async function save(e) {
    e.preventDefault();
    setError("");
    const prices = draft.prices.map(Number);
    if (prices.some((p) => !Number.isFinite(p) || p <= 0 || p > 1e8)) {
      setError(
        "Her varyant için 0’dan büyük, en fazla 100.000.000 TL fiyat girin.",
      );
      return;
    }
    const ok = await onSave(draft.id, prices);
    if (ok) setDraft(null);
    else
      setError(
        "Fiyatlar kaydedilemedi. Güncel fiyatları kontrol edip yeniden düzenleyin.",
      );
  }
  const bulkAction = canWrite ? (
    <Button
      type="button"
      variant="primary"
      className="btn"
      disabled={busy || !visible.length}
      onClick={() => onBulk(visible.map((p) => p.id))}
    >
      <Tag size={16} />
      Toplu güncelle
    </Button>
  ) : null;
  const saveAction = draft ? (
    <Button
      variant="primary"
      className="btn full"
      type="submit"
      disabled={busy}
    >
      <Check size={17} />
      {busy ? "Kaydediliyor…" : "Fiyatları kaydet"}
    </Button>
  ) : null;
  return (
    <Card className="panel price-manager">
      <div className="panel-title">
        <div>
          <h2>Varyant fiyatları</h2>
          <p className="muted">
            Fiyatlar TRY cinsindedir. Değişiklikler tüm varyantlar için birlikte
            kaydedilir.
          </p>
        </div>
        <div className="overview-actions">
          <Button
            className="btn"
            onClick={() =>
              downloadCSV(
                [
                  [
                    "Ürün",
                    "SKU",
                    "Kategori",
                    "Varyant",
                    "Gramaj",
                    "Fiyat (TRY)",
                    "Durum",
                  ],
                  ...rows,
                ],
                "HM1864_Fiyat_Listesi.csv",
              )
            }
          >
            Fiyat listesini indir
          </Button>
          {bulkAction}
        </div>
      </div>
      <div className="module-toolbar">
        <div className="search">
          <Input
            prefix={<MagnifyingGlass size={17} />}
            aria-label="Fiyat listesinde ara"
            placeholder="Ürün adı veya SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          aria-label="Fiyat kategorisi"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryPath(c, categories)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Fiyat ürün durumu"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tüm durumlar</option>
          <option>Aktif</option>
          <option>Taslak</option>
        </Select>
        <span className="muted">
          {visible.length} ürün · {rows.length} varyant
        </span>
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
              <TableHeading>ÜRÜN / VARYANT</TableHeading>
              <TableHeading>GRAMAJ</TableHeading>
              <TableHeading>FİYAT</TableHeading>
              <TableHeading>SON GÜNCELLEME</TableHeading>
              <TableHeading />
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.flatMap((p) =>
              p.variants.map((v, index) => (
                <TableRow key={p.id + "-" + index}>
                  <TableCell>
                    <strong>{p.name}</strong>
                    <small className="user-email">
                      {v.sku} · {v.size} · {p.status} ·{" "}
                      {v.active === false ? "Varyant pasif" : "Varyant aktif"}
                    </small>
                  </TableCell>
                  <TableCell>≈ {v.weight} g</TableCell>
                  <TableCell>
                    <strong>{money(v.price)}</strong>
                  </TableCell>
                  <TableCell>
                    <time dateTime={p.updated}>{dateTime(p.updated)}</time>
                  </TableCell>
                  <TableCell>
                    {index === 0 && canWrite && (
                      <Button
                        className="btn"
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setDraft({
                            id: p.id,
                            name: p.name,
                            variants: p.variants,
                            prices: p.variants.map((v) => String(v.price)),
                          });
                        }}
                      >
                        <PencilSimple size={15} />
                        Fiyat düzenle
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </div>
      {!rows.length && (
        <div className="empty">
          <Tag size={28} />
          <h3>Fiyat kaydı bulunamadı</h3>
          <p>Aramanızı değiştirin veya kataloğa ürün ekleyin.</p>
        </div>
      )}
      <ActionBar position="bottom">{bulkAction}</ActionBar>
      {draft && (
        <Modal
          title="Varyant fiyatlarını düzenle"
          busy={busy}
          onClose={() => setDraft(null)}
        >
          <h2>{draft.name}</h2>
          <p>Yalnızca varyant fiyatları güncellenir.</p>
          <form onSubmit={save}>
            <ActionBar>{saveAction}</ActionBar>
            {error && (
              <SlAlert open variant="danger" className="form-error">
                {error}
              </SlAlert>
            )}
            {draft.variants.map((v, index) => (
              <div key={index}>
                <Input
                  label={v.size + " · ≈ " + v.weight + " g"}
                  aria-label={v.size + " fiyatı"}
                  type="number"
                  min="0.01"
                  max="100000000"
                  step="0.01"
                  required
                  disabled={busy}
                  value={draft.prices[index]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      prices: draft.prices.map((value, i) =>
                        i === index ? e.target.value : value,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <ActionBar position="bottom">{saveAction}</ActionBar>
          </form>
        </Modal>
      )}
    </Card>
  );
}
