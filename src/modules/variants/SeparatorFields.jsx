import React, { useState } from "react";
import {
  alignSeparators,
  fillWithSeparators,
} from "../packaging/box-separators.js";
import { Button, Input } from "../../components/ui/Controls.jsx";
export default function SeparatorFields({ box, capacity, onChange, disabled }) {
  const [notice, setNotice] = useState("");
  const shape = capacity?.shape || {
    width: box?.diameter || box?.length,
    length: box?.diameter || box?.width,
  };
  function align(direction, mode) {
    const result = alignSeparators(shape, values, direction, mode);
    setNotice(
      result.reason ||
        "Separatörler hizalandı. Ürün yerleşimi yeniden düzenlendi.",
    );
    if (result.values) onChange(result.values);
  }
  function fill() {
    const result = fillWithSeparators(shape, values, capacity.placements);
    setNotice(
      result.reason ||
        (result.added
          ? `${result.added} separatör eklendi.`
          : "Doldurulabilecek tam boy boş şerit bulunamadı veya separatör sınırına ulaşıldı."),
    );
    if (result.added) onChange(result.values, true);
  }
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
      <div className="separator-alignment-tools">
        <strong>Dikey separatörleri hizala</strong>
        <div className="variant-table-actions">
          {[
            ["start", "Sola"],
            ["center", "Ortala"],
            ["end", "Sağa"],
            ["justify", "Dikey eşit dağıt"],
          ].map(([mode, label]) => (
            <Button
              key={mode}
              type="button"
              disabled={
                disabled || !values.some((v) => v.orientation === "vertical")
              }
              onClick={() => align("vertical", mode)}
            >
              {label}
            </Button>
          ))}
        </div>
        <strong>Yatay separatörleri hizala</strong>
        <div className="variant-table-actions">
          {[
            ["start", "Yukarı"],
            ["center", "Ortala"],
            ["end", "Aşağı"],
            ["justify", "Yatay eşit dağıt"],
          ].map(([mode, label]) => (
            <Button
              key={mode}
              type="button"
              disabled={
                disabled || !values.some((v) => v.orientation === "horizontal")
              }
              onClick={() => align("horizontal", mode)}
            >
              {label}
            </Button>
          ))}
        </div>
        <small>
          Eşit dağıtma, dış boşluklar dahil aralıkları eşitler. Ortalama mevcut
          iç aralıkları korur.
        </small>
        <Button
          type="button"
          disabled={
            disabled ||
            !capacity?.ready ||
            capacity.overCapacity ||
            !capacity.placements?.length
          }
          onClick={fill}
        >
          Separatör ile doldur
        </Button>
        <small>
          Ürünlerin yerleri korunur. Yalnızca kutu boyunca uzanan boş şeritler
          doldurulur; kalan düzensiz boşluklar korunur.
        </small>
        <p role="status">{notice}</p>
      </div>
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
