import React, { useState, useEffect } from "react";
import { Package } from "@phosphor-icons/react";
export default function ProductImage({ product: p }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [p.customImage]);
  return (
    <div className="product-image">
      {p.customImage && !failed ? (
        <img
          src={p.customImage}
          alt={p.name || "Ürün görseli"}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="image-placeholder"
          title={failed ? "Görsel yüklenemedi" : "Görsel eklenmedi"}
        >
          <Package size={28} />
          <small>{failed ? "Görsel yüklenemedi" : "Görsel eklenmedi"}</small>
        </div>
      )}
    </div>
  );
}
