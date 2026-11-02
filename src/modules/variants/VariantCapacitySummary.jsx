import React from "react";
const number = (value) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);

export default function VariantCapacitySummary({ capacity, box }) {
  return (
    <section
      className="variant-capacity-summary"
      aria-label="Kutu kapasitesi"
      aria-live="polite"
    >
      <h4>Kutu kapasitesi{box ? ` · ${box.name}` : ""}</h4>
      {capacity.ready ? (
        <>
          <div className="variant-capacity-stats">
            <span>
              Hacim doluluğu <strong>%{number(capacity.volumePercent)}</strong>
            </span>
            <span>
              Boş hacim{" "}
              <strong>
                %{number(Math.max(0, 100 - capacity.volumePercent))}
              </strong>
            </span>
            <span>
              Kalan hacim{" "}
              <strong>≈ {number(capacity.remainingVolume)} cm³</strong>
            </span>
            <span>
              Taban doluluğu <strong>%{number(capacity.basePercent)}</strong>
            </span>
          </div>
          <progress
            aria-label="Kutu taban doluluğu"
            max={100}
            value={Math.min(100, capacity.basePercent)}
          />
          {capacity.overCapacity && (
            <p role="alert">
              Tahmini kutu kapasitesi aşıldı. Ürün miktarlarını azaltın veya
              daha büyük kutu seçin.
            </p>
          )}
        </>
      ) : (
        <p role="status">{capacity.reason}</p>
      )}
      <small>
        Yaklaşık ölçülerle tek kat, dik yerleşim esas alınır; üst üste istifleme
        yapılmaz. Kutu ölçüleri kullanılabilir iç ölçüler olmalıdır. Karışık
        ürünler, şekil ve yerleşim boşlukları gerçek kapasiteyi değiştirebilir.
      </small>
    </section>
  );
}
