import React, { useState } from "react";
import { Button, Select } from "../../components/ui/Controls.jsx";
import {
  satietyEntries,
  resolvedSatiety,
  defaultSatietyProducts,
} from "../../satiety.js";
import SatietyIndicator from "./SatietyIndicator.jsx";
export default function ProductSatiety({
  value,
  definitions = defaultSatietyProducts(),
  editing = false,
  onChange,
}) {
  const entries = satietyEntries(value);
  const available = definitions.filter(
    (d) => d.active && !entries.some((e) => e.ingredientId === d.id),
  );
  const [choice, setChoice] = useState("");
  if (!editing) {
    const items = entries[0]?.name
      ? entries
      : resolvedSatiety(entries, definitions);
    return (
      <div className="product-satiety-list">
        {items.map((e) => (
          <SatietyIndicator
            key={e.ingredientId}
            value={{ type: e.icon, level: e.level }}
            label={e.name}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="product-satiety-list">
      {entries.map((e, index) => {
        const d = definitions.find((d) => d.id === e.ingredientId);
        return (
          <section
            key={e.ingredientId}
            className="satiety-entry"
            aria-label={(d?.name || "İçerik") + " doygunluğu"}
          >
            <div className="satiety-entry-heading">
              <h3>
                {d?.name || "Tanım bulunamadı"}
                {d?.active === false ? " (Pasif)" : ""}
              </h3>
              <Button
                type="button"
                size="small"
                aria-label={
                  (d?.name || "İçerik") + " doygunluk bilgisini kaldır"
                }
                onClick={() => onChange(entries.filter((_, i) => i !== index))}
              >
                Kaldır
              </Button>
            </div>
            <SatietyIndicator
              value={{ type: d?.icon || "general", level: e.level }}
              label={d?.name || "İçerik"}
              editing
              showTypeSelector={false}
              radioName={"satiety-" + e.ingredientId}
              onChange={(next) =>
                onChange(
                  entries.map((row, i) =>
                    i === index ? { ...row, level: next?.level ?? null } : row,
                  ),
                )
              }
            />
          </section>
        );
      })}
      <div className="satiety-add-row">
        <Select
          label="Doygunluk ürünü"
          value={available.some((d) => d.id === choice) ? choice : ""}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="">İçerik seçin</option>
          {available.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          disabled={
            !available.some((d) => d.id === choice) || entries.length >= 50
          }
          onClick={() => {
            onChange([...entries, { ingredientId: choice, level: null }]);
            setChoice("");
          }}
        >
          Bilgi ekle
        </Button>
      </div>
      <p className="satiety-hint">
        Her içerik için ayrı bir 1–5 seviyesi seçin. Yeni içerikler Sistem
        Ayarları → Doygunluk Ürünleri bölümünden tanımlanır.
      </p>
    </div>
  );
}
