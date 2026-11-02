import VariantProductPicker from "./VariantProductPicker.jsx";
import { packagingAllowsProduct } from "../packaging/packaging-approval.js";
import React, { useId } from "react";
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
function LayoutGrid({ capacity, products }) {
  const pattern = useId(),
    title = useId();
  if (!capacity.shape) return <p>{capacity.reason}</p>;
  const { width, length, circle } = capacity.shape;
  const gap = Math.max(width, length) * 0.06;
  const step = 10 ** Math.floor(Math.log10(Math.max(width, length) / 20));
  const ids = [...new Set(capacity.items.map((item) => item.productId))];
  return (
    <div className="variant-layout-drawing">
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
        {capacity.placements.map((p, i) => {
          const id = ids.indexOf(p.productId),
            name = products.find((product) => product.id === p.productId)?.name;
          return (
            <g key={`${p.productId}-${p.pieceIndex}`}>
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
                x={p.x + p.w / 2}
                y={p.y + p.h / 2}
                dominantBaseline="central"
                textAnchor="middle"
                fontSize={Math.min(p.w, p.h) * 0.22}
                fill="#111827"
              >
                {id + 1}
                {p.orientation === "vertical" ? "D" : "Y"}
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
            <LayoutGrid capacity={capacity} products={products} />
          ) : (
            <p>{capacity.reason}</p>
          )}
        </div>
        <div className="variant-layout-controls">
          <Button type="button" onClick={onAutoArrange} disabled={disabled}>
            Yönleri otomatik düzenle
          </Button>
          {items.map((item, i) => {
            const p = products.find((p) => p.id === item.productId);
            return (
              <section className="variant-layout-product" key={item.productId}>
                <h4>{p?.name}</h4>
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
