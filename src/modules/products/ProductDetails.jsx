import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import Card from "../../components/ui/Card.jsx";
import ProductImage from "../../components/ui/ProductImage.jsx";
import { money } from "../../catalog-tools.js";
import { productInformationFields } from "../../product-information.js";

export default function ProductDetails({ product }) {
  return (
    <div className="product-details">
      <Card className="product-detail-card">
        <div className="product-detail-hero">
          <ProductImage product={product} />
          <div>
            <p className="product-detail-category">{product.category}</p>
            <h2>{product.name}</h2>
            <div className="product-detail-identifiers">
              <SlTag>{product.productCode}</SlTag>
              <SlTag>SKU: {product.sku}</SlTag>
            </div>
            {product.description && (
              <p className="product-detail-description">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </Card>
      <Card className="product-detail-card">
        <h3>Varyantlar ve fiyatlar</h3>
        <div className="product-detail-variants">
          {product.variants.map((variant) => (
            <Card key={variant.sku} className="product-detail-variant">
              <div className="product-detail-variant-heading">
                <strong>{variant.size}</strong>
                <strong>{money(variant.price)}</strong>
              </div>
              <dl>
                {variant.weight > 0 && (
                  <>
                    <dt>Gramaj</dt>
                    <dd>
                      {new Intl.NumberFormat("tr-TR").format(variant.weight)} g
                    </dd>
                  </>
                )}
                <dt>Birim</dt>
                <dd>{variant.unit}</dd>
                {variant.packaging && (
                  <>
                    <dt>Ambalaj</dt>
                    <dd>{variant.packaging}</dd>
                  </>
                )}
                {variant.slices > 0 && (
                  <>
                    <dt>Dilim sayısı</dt>
                    <dd>{variant.slices}</dd>
                  </>
                )}
                <dt>SKU</dt>
                <dd>{variant.sku}</dd>
              </dl>
            </Card>
          ))}
        </div>
        {!product.variants.length && (
          <p className="muted">Görüntülenecek aktif varyant bulunmuyor.</p>
        )}
      </Card>
      {productInformationFields.some((field) => product[field.key]) && (
        <Card className="product-detail-card product-detail-information">
          <h3>Ürün bilgileri</h3>
          {productInformationFields
            .filter((field) => product[field.key])
            .map((field) => (
              <SlDetails
                key={field.key}
                summary={field.label}
                open={field.key === "allergens"}
              >
                <p>{product[field.key]}</p>
              </SlDetails>
            ))}
        </Card>
      )}
    </div>
  );
}
