import React from "react";
const number = (value) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
export default function VariantCapacitySummary({ capacity, box }) {
  return (
    <section
      className="variant-capacity-summary"
      aria-label="Kutu kapasitesi"
      aria-live="polite"
    >
      <h4>Kutu tabanı ve kilogram kontrolü{box ? ` · ${box.name}` : ""}</h4>
      {capacity.ready ? (
        <>
          <div className="variant-capacity-stats">
            <span>
              Taban doluluğu
              <strong>%{number(capacity.basePercent)} / en az %95</strong>
            </span>
            <span>
              Boş taban
              <strong>
                %{number(Math.max(0, 100 - capacity.basePercent))}
              </strong>
            </span>
            <span>
              Net ürün ağırlığı
              <strong>≈ {number(capacity.usedWeight / 1000)} kg</strong>
            </span>
            <span>
              Maksimum ürün ağırlığı
              <strong>
                {capacity.maxWeight === null
                  ? "Tanımlanmamış"
                  : `${number(capacity.maxWeight / 1000)} kg`}
              </strong>
            </span>
            {capacity.remainingWeight !== null && (
              <span>
                Kalan ağırlık
                <strong>{number(capacity.remainingWeight / 1000)} kg</strong>
              </span>
            )}
          </div>
          <progress
            aria-label="Kutu taban doluluğu"
            max={100}
            value={Math.min(100, capacity.basePercent)}
          />
          {capacity.reason ? (
            <p role="alert">{capacity.reason}</p>
          ) : (
            <p role="status">
              Yerleşim uygun. %95 taban doluluğu ve ağırlık kontrolleri
              sağlandı.
            </p>
          )}
        </>
      ) : (
        <p role="alert">{capacity.reason}</p>
      )}
      <small>
        Ürünler tek kat yerleştirilir. Kutu ölçüleri kullanılabilir iç ölçüler,
        ürün ölçüleri bir dilim / adet / kap içindir. Ölçülere göre otomatik
        yerleşim hesaplanır; gerçek ürün şekli ve ölçüm toleransları sonucu
        etkileyebilir. Ağırlık sınırı Ambalaj Merkezi’nden tanımlanır.
      </small>
    </section>
  );
}
