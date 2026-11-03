import React from "react";
import ProductDimensions from "./ProductDimensions.jsx";
import "./product-measurements.css";

export default function ProductMeasurements({ products, showNames = false }) {
  return (
    <section className="product-card-measurements" aria-label="Ürün ölçüleri">
      <strong>{showNames ? "Tek ürün ölçüleri" : "Ürün ölçüleri"}</strong>
      {products.map((product) => (
        <div key={product.id}>
          {showNames && <span>{product.name}: </span>}
          <ProductDimensions value={product.dimensions} />
        </div>
      ))}
      {!products.length && <p>Ölçü bilgisi eklenmedi.</p>}
    </section>
  );
}
