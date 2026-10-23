import React from "react";
import { Plus, Trash, Copy, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
import SlSwitch from "@shoelace-style/shoelace/dist/react/switch/index.js";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeading,
  TableCell,
  Input,
  Select,
  Button,
} from "../../components/ui/Controls.jsx";
import { SalesChannelSwitches } from "../../components/ui/SalesChannels.jsx";
import { newVariant } from "../variants/VariantFields.jsx";
import { variantUnits, duplicateVariant } from "../../catalog.js";
import { money } from "../../catalog-tools.js";
export default function ProductVariantsTable({
  product,
  variantTypes = [],
  categories = [],
  editing = false,
  onChange,
  disabled = false,
}) {
  const variants = product.variants || [];
  const update = (i, patch) =>
    onChange({
      ...product,
      variants: variants.map((v, n) => (n === i ? { ...v, ...patch } : v)),
    });
  const move = (i, delta) => {
    const next = [...variants];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    onChange({ ...product, variants: next });
  };
  const control = (v, i, key, label, type = "text") => (
    <Input
      aria-label={`${v.size || "Yeni varyant"} ${label}`}
      type={type}
      value={v[key] ?? ""}
      required={["size", "weight", "price"].includes(key)}
      min={key === "price" ? 0.01 : key === "weight" ? 1 : 0}
      step={key === "price" ? "0.01" : 1}
      maxLength={key === "size" ? 30 : key === "packaging" ? 120 : undefined}
      disabled={disabled}
      onChange={(e) =>
        update(i, {
          [key]: type === "number" ? Number(e.target.value) : e.target.value,
        })
      }
    />
  );
  return (
    <div className="product-variants-table">
      {editing && (
        <Button
          type="button"
          disabled={disabled || variants.length >= 50}
          onClick={() =>
            onChange({ ...product, variants: [...variants, newVariant()] })
          }
        >
          <Plus size={15} />
          Varyant ekle
        </Button>
      )}
      {!variants.length ? (
        <p>Varyant eklemek isteğe bağlıdır.</p>
      ) : (
        <div
          className="table-scroll"
          role="region"
          aria-label="Varyantlar ve fiyatlar tablosu"
          tabIndex={0}
        >
          <Table aria-label="Ürün varyantları">
            <TableHead>
              <TableRow>
                {[
                  "Boyut / ad",
                  "Varyant tipi",
                  "Gramaj (g)",
                  "Fiyat (₺)",
                  "Dilim adedi",
                  "Birim",
                  "Ambalaj",
                  "Durum",
                  ...(editing ? ["Satış kanalları", "İşlemler"] : []),
                ].map((label) => (
                  <TableHeading key={label} scope="col">
                    {label}
                  </TableHeading>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {variants.map((v, i) => (
                <TableRow key={v.id || i}>
                  <TableCell>
                    {editing ? control(v, i, "size", "Boyut / ad") : v.size}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Select
                        aria-label={`${v.size || "Yeni varyant"} Varyant tipi`}
                        required
                        value={v.typeId || ""}
                        disabled={disabled}
                        onChange={(e) => update(i, { typeId: e.target.value })}
                      >
                        <option value="">Tip seçin</option>
                        {variantTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      v.typeName ||
                      variantTypes.find((t) => t.id === v.typeId)?.name ||
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? control(v, i, "weight", "Gramaj (g)", "number")
                      : v.weight}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? control(v, i, "price", "Fiyat (₺)", "number")
                      : money(v.price)}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? control(v, i, "slices", "Dilim adedi", "number")
                      : v.slices || "—"}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Select
                        aria-label={`${v.size || "Yeni varyant"} Birim`}
                        value={v.unit || "Adet"}
                        disabled={disabled}
                        onChange={(e) => update(i, { unit: e.target.value })}
                      >
                        {variantUnits.map((unit) => (
                          <option key={unit}>{unit}</option>
                        ))}
                      </Select>
                    ) : (
                      v.unit || "Adet"
                    )}
                  </TableCell>
                  <TableCell>
                    {editing
                      ? control(v, i, "packaging", "Ambalaj")
                      : v.packaging || "—"}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <SlSwitch
                        aria-label={`${v.size || "Yeni varyant"} aktif`}
                        checked={v.active !== false}
                        disabled={disabled}
                        onSlChange={(e) =>
                          update(i, { active: e.target.checked })
                        }
                      />
                    ) : (
                      <SlBadge
                        variant={v.active !== false ? "success" : "neutral"}
                      >
                        {v.active !== false ? "Aktif" : "Pasif"}
                      </SlBadge>
                    )}
                  </TableCell>
                  {editing && (
                    <>
                      <TableCell>
                        <SalesChannelSwitches
                          product={product}
                          variant={v}
                          categories={categories}
                          disabled={disabled}
                          onChange={(salesAvailability) =>
                            update(i, { salesAvailability })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="variant-table-actions">
                          {[
                            [ArrowUp, "yukarı taşı", () => move(i, -1), !i],
                            [
                              ArrowDown,
                              "aşağı taşı",
                              () => move(i, 1),
                              i === variants.length - 1,
                            ],
                            [
                              Copy,
                              "çoğalt",
                              () =>
                                onChange({
                                  ...product,
                                  variants: [
                                    ...variants,
                                    duplicateVariant(v, variants),
                                  ],
                                }),
                              variants.length >= 50,
                            ],
                            [
                              Trash,
                              "kaldır",
                              () =>
                                onChange({
                                  ...product,
                                  variants: variants.filter((_, n) => n !== i),
                                }),
                              false,
                            ],
                          ].map(([Icon, label, action, blocked]) => (
                            <Button
                              key={label}
                              type="button"
                              className="icon-btn"
                              aria-label={`${v.size || "Yeni varyant"} ${label}`}
                              disabled={disabled || blocked}
                              onClick={action}
                            >
                              <Icon size={16} />
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
