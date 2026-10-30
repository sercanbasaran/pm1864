import React from "react";
import { Button, Input } from "../../components/ui/Controls.jsx";
import { countedUnit } from "../../unit-pricing.js";
import { portionDefinition } from "../../portions.js";
export default function ProductPortion({
  value,
  pricing,
  editing = false,
  onChange,
}) {
  if (!editing)
    return (
      <span>{portionDefinition({ portion: value, unitPricing: pricing })}</span>
    );
  return (
    <div className="unit-pricing-fields">
      <Input
        label={`1 kişilik porsiyon (${pricing?.unit?.toLocaleLowerCase("tr-TR") || "önce ürün birimi seçin"})`}
        aria-label="Bir kişilik porsiyon miktarı"
        type="number"
        disabled={!pricing?.unit}
        min={countedUnit(pricing?.unit) ? 1 : 0.001}
        max={100000}
        step={countedUnit(pricing?.unit) ? 1 : "any"}
        value={value?.quantity ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value === ""
              ? null
              : { unit: pricing.unit, quantity: Number(e.target.value) },
          )
        }
      />
      <p className="input-help">
        Bir kişi için kaç birim ürün servis edildiğini girin. Örneğin 3 dilim
        veya 150 gram. Varyantların kaç kişilik olduğu otomatik hesaplanır.
      </p>
      {value && (
        <Button type="button" size="small" onClick={() => onChange(null)}>
          Porsiyon bilgisini temizle
        </Button>
      )}
    </div>
  );
}
