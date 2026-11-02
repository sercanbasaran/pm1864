import VariantProductImage from "./VariantProductImage.jsx";
import {
  boxLayout,
  placementData,
  layoutItemsWithAutoOrientation,
} from "../packaging/box-layout.js";
import SeparatorFields from "./SeparatorFields.jsx";
import VariantProductPicker from "./VariantProductPicker.jsx";
import { packagingAllowsProduct } from "../packaging/packaging-approval.js";
import React, { useId, useState, useRef } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { Button, Input } from "../../components/ui/Controls.jsx";
import { orientationCounts } from "../packaging/box-layout.js";
import VariantCapacitySummary from "./VariantCapacitySummary.jsx";
const colors = [
  "#dbeafe",
  "#fef3c7",
  "#dcfce7",
  "#fce7f3",
  "#ede9fe",
  "#cffafe",
  "#ffedd5",
  "#e2e8f0",
];
export function itemOrientation(item, capacity) {
  if (Object.hasOwn(item, "horizontal") || Object.hasOwn(item, "vertical"))
    return orientationCounts(item);
  const placed =
    capacity.placements?.filter((p) => p.productId === item.productId) || [];
  const vertical = placed.filter((p) => p.orientation === "vertical").length;
  return { horizontal: item.quantity - vertical, vertical };
}
export function OrientationFields({
  item,
  product,
  capacity,
  onChange,
  disabled,
}) {
  const counts = itemOrientation(item, capacity);
  return (
    <div className="variant-orientation-fields">
      <Input
        label="Yatay adet"
        aria-label={`${product?.name || "Ürün"} yatay adedi`}
        type="number"
        min={0}
        max={500}
        step={1}
        value={counts.horizontal}
        disabled={disabled}
        onChange={(e) => {
          const horizontal = Number(e.target.value);
          onChange({
            ...item,
            horizontal,
            vertical: counts.vertical,
            quantity: horizontal + counts.vertical,
          });
        }}
      />
      <Input
        label="Dikey adet"
        aria-label={`${product?.name || "Ürün"} dikey adedi`}
        type="number"
        min={0}
        max={500}
        step={1}
        value={counts.vertical}
        disabled={disabled}
        onChange={(e) => {
          const vertical = Number(e.target.value);
          onChange({
            ...item,
            horizontal: counts.horizontal,
            vertical,
            quantity: counts.horizontal + vertical,
          });
        }}
      />
      <small>
        Toplam: {item.quantity}{" "}
        {product?.unitPricing?.unit?.toLocaleLowerCase("tr-TR") || "adet"}
      </small>
    </div>
  );
}
export function LayoutRecommendations({ suggestions, onApply, disabled }) {
  if (!suggestions?.length) return null;
  return (
    <section
      className="variant-layout-suggestions"
      aria-label="Boşluk doldurma önerileri"
    >
      <h4>Boşluklara uygun ürünler</h4>
      {suggestions.map((s) => (
        <div key={s.product.id}>
          <span>
            <strong>{s.product.name}</strong> · {s.quantity} adet (
            {s.horizontal} yatay + {s.vertical} dikey) → taban %
            {s.basePercent.toLocaleString("tr-TR", {
              maximumFractionDigits: 1,
            })}
            {s.completes ? " · %95 hedefini sağlar" : ""}
          </span>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => onApply(s.items)}
            aria-label={`${s.product.name} önerisini uygula`}
          >
            Öneriyi uygula
          </Button>
        </div>
      ))}
    </section>
  );
}
function LayoutGrid({ capacity, products, box, onPlacementChange, disabled }) {
  const [selected, setSelected] = useState(null),
    [message, setMessage] = useState("");
  const drag = useRef(null);
  const point = (e) => {
    const svg = e.currentTarget.ownerSVGElement;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM().inverse(),
    );
  };
  function apply(index, x, y, rotate = false, magnet = false) {
    if (magnet) {
      const p = capacity.placements[index],
        others = capacity.placements
          .filter((_, i) => i !== index)
          .concat(capacity.separators || []);
      // Prefer a nearby edge over the unaligned coordinate.
      const nearest = (value, edges) => {
        const sorted = edges
          .filter((n) => Math.abs(n - value) <= 2)
          .sort((a, b) => Math.abs(a - value) - Math.abs(b - value));
        return sorted[0] ?? value;
      };
      x = nearest(x, [
        0,
        capacity.shape.width - p.w,
        ...others.flatMap((r) => [r.x + r.w, r.x - p.w]),
      ]);
      y = nearest(y, [
        0,
        capacity.shape.length - p.h,
        ...others.flatMap((r) => [r.y + r.h, r.y - p.h]),
      ]);
    }

    const placements = placementData(capacity).map((p, i) =>
      i === index
        ? {
            ...p,
            x,
            y,
            orientation: rotate
              ? p.orientation === "horizontal"
                ? "vertical"
                : "horizontal"
              : p.orientation,
          }
        : p,
    );
    const items = layoutItemsWithAutoOrientation(capacity.items, {
      placements,
    });
    const check = boxLayout({ ...box, placements }, items, products);
    if (!check.ready || check.overCapacity) {
      setMessage(check.reason || "Bu konum uygun değil.");
      return;
    }
    setMessage("Yerleşim güncellendi.");
    onPlacementChange(placements, items);
  }

  const pattern = useId(),
    title = useId();
  if (!capacity.shape) return <p>{capacity.reason}</p>;
  const { width, length, circle } = capacity.shape;
  const gap = Math.max(width, length) * 0.06;
  const step = 10 ** Math.floor(Math.log10(Math.max(width, length) / 20));
  const ids = [...new Set(capacity.items.map((item) => item.productId))];
  return (
    <div className="variant-layout-drawing">
      <p>
        Dilimi sürükleyerek taşıyın. Seçtiğiniz dilimi düğmeyle veya R tuşuyla
        çevirin; ok tuşlarıyla 1 mm taşıyın.
      </p>
      <Button
        type="button"
        disabled={
          disabled || selected === null || !capacity.placements[selected]
        }
        onClick={() => {
          const p = capacity.placements[selected];
          apply(selected, p.x, p.y, true);
        }}
      >
        Seçili dilimi yatay / dikey çevir
      </Button>
      <p role="status">{message}</p>
      <svg
        viewBox={`${-gap} ${-gap} ${width + gap * 2} ${length + gap * 2}`}
        role="img"
        aria-labelledby={title}
      >
        <title id={title}>
          Kutu tabanında ölçülere göre ürün yerleşimi.{" "}
          {capacity.placements.length} adet yerleştirildi,{" "}
          {capacity.unplaced.length} adet sığmadı.
        </title>
        <defs>
          <pattern
            id={pattern}
            width={step}
            height={step}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${step} 0 L 0 0 0 ${step}`}
              fill="none"
              stroke="var(--sl-color-neutral-300)"
              strokeWidth={step / 40}
            />
          </pattern>
        </defs>
        {circle ? (
          <circle
            cx={width / 2}
            cy={length / 2}
            r={width / 2}
            fill={`url(#${pattern})`}
            stroke="var(--sl-color-neutral-700)"
            strokeWidth={width / 300}
          />
        ) : (
          <rect
            width={width}
            height={length}
            fill={`url(#${pattern})`}
            stroke="var(--sl-color-neutral-700)"
            strokeWidth={width / 300}
          />
        )}
        <defs>
          <clipPath id={`${pattern}-separators`}>
            {circle ? (
              <circle cx={width / 2} cy={length / 2} r={width / 2} />
            ) : (
              <rect width={width} height={length} />
            )}
          </clipPath>
        </defs>
        <>
          {(capacity.separators || []).map((r, i) => (
            <rect
              key={i}
              clipPath={`url(#${pattern}-separators)`}
              className="box-separator"
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill="#64748b"
            >
              <title>Separatör {i + 1}</title>
            </rect>
          ))}
        </>
        {capacity.placements.map((p, i) => {
          const id = ids.indexOf(p.productId),
            name = products.find((product) => product.id === p.productId)?.name;
          const label = Array.from(name || "Ürün");
          const short =
            label.length > 30
              ? label.slice(0, 29).join("") + "…"
              : label.join("");
          const lines =
            short.length > 16 ? [short.slice(0, 16), short.slice(16)] : [short];
          const font = Math.min(
            p.h * 0.18,
            p.w / (Math.max(...lines.map((line) => line.length)) * 0.8),
          );
          return (
            <g
              key={`${p.productId}-${p.pieceIndex}`}
              tabIndex={disabled ? -1 : 0}
              role="button"
              aria-label={`${name} ${p.pieceIndex + 1}. dilimi taşı veya çevir`}
              style={{
                cursor: disabled ? "default" : "grab",
                touchAction: "none",
                outline:
                  selected === i
                    ? "2px solid var(--sl-color-primary-600)"
                    : "none",
              }}
              onFocus={() => setSelected(i)}
              onKeyDown={(e) => {
                if (disabled) return;
                const key = e.key.toLowerCase();
                if (
                  [
                    "r",
                    "arrowleft",
                    "arrowright",
                    "arrowup",
                    "arrowdown",
                  ].includes(key)
                ) {
                  e.preventDefault();
                  apply(
                    i,
                    p.x +
                      (key === "arrowleft" ? -1 : key === "arrowright" ? 1 : 0),
                    p.y +
                      (key === "arrowup" ? -1 : key === "arrowdown" ? 1 : 0),
                    key === "r",
                  );
                }
              }}
              onPointerDown={(e) => {
                if (disabled) return;
                setSelected(i);
                drag.current = { point: point(e), i };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current?.i !== i) return;
                const q = point(e);
                e.currentTarget.setAttribute(
                  "transform",
                  `translate(${q.x - drag.current.point.x} ${q.y - drag.current.point.y})`,
                );
              }}
              onPointerCancel={(e) => {
                drag.current = null;
                e.currentTarget.removeAttribute("transform");
              }}
              onPointerUp={(e) => {
                if (drag.current?.i !== i) return;
                const q = point(e),
                  start = drag.current.point;
                drag.current = null;
                e.currentTarget.removeAttribute("transform");
                apply(
                  i,
                  Math.round((p.x + q.x - start.x) * 10) / 10,
                  Math.round((p.y + q.y - start.y) * 10) / 10,
                  false,
                  true,
                );
              }}
            >
              <title>
                {name} · {p.orientation === "vertical" ? "Dikey" : "Yatay"} ·{" "}
                {p.w} × {p.h} mm · x: {p.x}, y: {p.y}
              </title>
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                fill={colors[id % colors.length]}
                stroke="#475569"
                strokeWidth={width / 500}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={font}
                fill="#111827"
                pointerEvents="none"
                className="grid-product-name"
              >
                {lines.map((line, n) => (
                  <tspan
                    key={n}
                    x={p.x + p.w / 2}
                    y={
                      p.y + p.h * (lines.length === 1 ? 0.38 : 0.28 + n * 0.24)
                    }
                  >
                    {line}
                  </tspan>
                ))}
                <tspan
                  x={p.x + p.w / 2}
                  y={p.y + p.h * 0.78}
                  fontSize={Math.min(p.h * 0.15, p.w * 0.12)}
                >
                  {id + 1}
                  {p.orientation === "vertical" ? "D" : "Y"}
                </tspan>
              </text>
            </g>
          );
        })}
        <text
          x={width / 2}
          y={-gap * 0.3}
          textAnchor="middle"
          fontSize={gap * 0.42}
          fill="currentColor"
        >
          {width} mm
        </text>
        <text
          transform={`translate(${-gap * 0.35} ${length / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={gap * 0.42}
          fill="currentColor"
        >
          {length} mm
        </text>
      </svg>
      <ul className="variant-layout-legend">
        {ids.map((id, index) => (
          <li key={id}>
            <span style={{ background: colors[index % colors.length] }} />
            {index + 1} · {products.find((p) => p.id === id)?.name}
          </li>
        ))}
      </ul>
      <small>
        Y = yatay, D = dikey. Yatayda ürün uzunluğu X ekseninde, dikeyde 90°
        döndürülür. Yükseklik değişmez. Grid çizgileri {step} mm aralıklıdır.
      </small>
    </div>
  );
}
export default function VariantLayoutEditor({
  box,
  capacity,
  items,
  products,
  categories = [],
  suggestions,
  onChange,
  onAutoArrange,
  onSeparatorsChange,
  onPlacementChange,
  onClose,
  disabled,
}) {
  return (
    <Modal
      title="Kutu yerleşimi ve taban doluluğu"
      className="variant-layout-dialog"
      onClose={onClose}
      busy={disabled}
    >
      <VariantCapacitySummary box={box} capacity={capacity} />
      <div className="variant-layout-workspace">
        <div>
          {capacity.ready ? (
            <LayoutGrid
              capacity={capacity}
              products={products}
              box={box}
              onPlacementChange={onPlacementChange}
              disabled={disabled}
            />
          ) : (
            <p>{capacity.reason}</p>
          )}
        </div>
        <div className="variant-layout-controls">
          <SeparatorFields
            box={box}
            capacity={capacity}
            onChange={onSeparatorsChange}
            disabled={disabled}
          />

          <Button type="button" onClick={onAutoArrange} disabled={disabled}>
            Yönleri otomatik düzenle
          </Button>
          {items.map((item, i) => {
            const p = products.find((p) => p.id === item.productId);
            return (
              <section className="variant-layout-product" key={item.productId}>
                <div className="variant-layout-product-heading">
                  <VariantProductImage product={p} />
                  <h4>{p?.name}</h4>
                </div>
                <small>
                  {p?.dimensions
                    ? `${p.dimensions.length ?? "—"} × ${p.dimensions.width ?? "—"} × ${p.dimensions.height ?? "—"} mm`
                    : "Ölçüler eksik"}
                </small>
                <OrientationFields
                  item={item}
                  product={p}
                  capacity={capacity}
                  disabled={disabled}
                  onChange={(next) =>
                    onChange(items.map((old, j) => (i === j ? next : old)))
                  }
                />
                <Button
                  type="button"
                  disabled={disabled || items.length <= 1}
                  aria-label={`${p?.name || "Ürün"} yerleşimden kaldır`}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  Ürünü kaldır
                </Button>
              </section>
            );
          })}
          {!!capacity.unplaced?.length && (
            <p role="alert">
              Sığmayan ürünler:{" "}
              {[...new Set(capacity.unplaced.map((p) => p.productId))]
                .map(
                  (id) =>
                    `${products.find((p) => p.id === id)?.name}: ${capacity.unplaced.filter((p) => p.productId === id).length} adet`,
                )
                .join(" · ")}
            </p>
          )}
          <h4>Ürün ekle</h4>
          <VariantProductPicker
            products={products}
            categories={categories}
            capacity={capacity}
            exclude={items.map((item) => item.productId)}
            disabled={disabled || items.length >= 50}
            isProductAllowed={(p) =>
              packagingAllowsProduct(box, p.id, products, categories)
            }
            onSelect={(p) =>
              onChange([...items, { productId: p.id, quantity: 1 }])
            }
          />
          <LayoutRecommendations
            suggestions={suggestions}
            onApply={onChange}
            disabled={disabled}
          />
          {capacity.ready &&
            !capacity.valid &&
            !capacity.overCapacity &&
            !suggestions.length && (
              <p>
                Mevcut boşluklara uygun bir ürün önerisi bulunamadı. Yönleri
                otomatik düzenlemeyi, ürün karışımını veya kutu boyutunu
                değiştirmeyi deneyin.
              </p>
            )}
        </div>
      </div>
      <div slot="footer">
        <Button type="button" disabled={disabled} onClick={onClose}>
          Yerleşime dön
        </Button>
      </div>
    </Modal>
  );
}
