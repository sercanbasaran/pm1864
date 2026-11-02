import React from "react";
import { Button, Input } from "../../components/ui/Controls.jsx";
export default function SeparatorFields({ box, onChange, disabled }) {
  const values = box?.separators || [];
  const size = (direction) =>
    direction === "vertical"
      ? box?.shape === "cylinder"
        ? box.diameter
        : box?.length
      : box?.shape === "cylinder"
        ? box.diameter
        : box?.width;
  const update = (i, key, value) =>
    onChange(values.map((v, j) => (i === j ? { ...v, [key]: value } : v)));
  return (
    <section className="variant-layout-product" aria-label="Separatörler">
      <h4>Separatörler</h4>
      <small>
        Konum, kutunun sol / üst kenarından separatörün başlangıcına kadar olan
        mesafedir. Genişlik kullanılabilir alandan düşülür. En fazla 2 yatay ve
        3 dikey eklenebilir.
      </small>
      {["horizontal", "vertical"].map((direction) => (
        <Button
          key={direction}
          type="button"
          disabled={
            disabled ||
            !size(direction) ||
            values.filter((v) => v.orientation === direction).length >=
              (direction === "horizontal" ? 2 : 3)
          }
          onClick={() =>
            onChange([
              ...values,
              {
                orientation: direction,
                position:
                  (size(direction) *
                    (values.filter((v) => v.orientation === direction).length +
                      1)) /
                  (values.filter((v) => v.orientation === direction).length +
                    2),
                width: Math.min(2, size(direction) / 20),
              },
            ])
          }
        >
          {direction === "horizontal" ? "Yatay" : "Dikey"} separatör ekle
        </Button>
      ))}
      {values.map((v, i) => (
        <div className="variant-layout-product" key={i}>
          <strong>
            {i + 1}. {v.orientation === "horizontal" ? "Yatay" : "Dikey"}{" "}
            separatör
          </strong>
          <Input
            label="Konum (mm)"
            aria-label={`${i + 1}. separatör konumu`}
            type="number"
            min={0}
            max={Math.max(0, size(v.orientation) - v.width)}
            step="any"
            disabled={disabled}
            value={v.position}
            onChange={(e) => update(i, "position", Number(e.target.value))}
          />
          <input
            aria-label={`${i + 1}. separatörü kaydır`}
            type="range"
            min={0}
            max={Math.max(0, size(v.orientation) - v.width - 0.001)}
            step={0.1}
            disabled={disabled}
            value={v.position}
            onChange={(e) => update(i, "position", Number(e.target.value))}
          />
          <Input
            label="Genişlik (mm)"
            aria-label={`${i + 1}. separatör genişliği`}
            type="number"
            min={0.01}
            max={size(v.orientation)}
            step="any"
            disabled={disabled}
            value={v.width}
            onChange={(e) => update(i, "width", Number(e.target.value))}
          />
          <Button
            type="button"
            disabled={disabled}
            aria-label={`${i + 1}. separatörü kaldır`}
            onClick={() => onChange(values.filter((_, j) => i !== j))}
          >
            Separatörü kaldır
          </Button>
        </div>
      ))}
    </section>
  );
}
