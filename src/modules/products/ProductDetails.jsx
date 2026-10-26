import "./product-details.css";
import { hasUnitPricing } from "../../unit-pricing.js";
import ProductVariantsTable from "./ProductVariantsTable.jsx";
import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import Card from "../../components/ui/Card.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import ProductImage from "../../components/ui/ProductImage.jsx";
import { money } from "../../catalog-tools.js";
import NutritionTable from "./NutritionTable.jsx";
import ProductSatiety from "./ProductSatiety.jsx";
import { hasSatiety } from "../../satiety.js";
import { productDetailSteps } from "../../product-information.js";

export default function ProductDetails({ product }) {
  const information = productDetailSteps.filter(
    (field) => field.key && field.key !== "satiety" && product[field.key],
  );
  return (
    <div className="product-details">
      <Card className="product-detail-card">
        <div className="product-detail-hero">
          {product.images?.length ? (
            <MediaGallery
              label="Ürün"
              images={product.images}
              editable={false}
            />
          ) : (
            <ProductImage product={product} />
          )}
          <div>
            <p className="product-detail-category">{product.category}</p>
            <small className="product-detail-identifiers">
              {product.productCode}
            </small>
            <h2>{product.name}</h2>
            {product.description && (
              <>
                <p className="product-detail-description">
                  {product.description}
                </p>
                <hr className="product-summary-divider" />
              </>
            )}
            {hasSatiety(product.satiety) && (
              <>
                <section aria-label="Doygunluk bilgisi">
                  <ProductSatiety value={product.satiety} />
                </section>
                <hr className="product-summary-divider" />
              </>
            )}
            {hasUnitPricing(product.unitPricing) && (
              <dl className="public-unit-pricing">
                <div>
                  <dt>Birim fiyatı</dt>
                  <dd>
                    {money(product.unitPricing.price)} /{" "}
                    {product.unitPricing.unit.toLocaleLowerCase("tr-TR")}
                  </dd>
                </div>
                <div>
                  <dt>Birim gramaj</dt>
                  <dd>
                    {new Intl.NumberFormat("tr-TR").format(
                      product.unitPricing.weight,
                    )}{" "}
                    g / {product.unitPricing.unit.toLocaleLowerCase("tr-TR")}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </Card>
      {information.length > 0 && (
        <Card className="product-detail-card product-detail-information">
          <h3>Ürün bilgileri</h3>
          {information.map((field) => (
            <SlDetails key={field.key} summary={field.label}>
              {field.key === "nutrition" ? (
                <NutritionTable value={product.nutrition} />
              ) : (
                <p>{product[field.key]}</p>
              )}
            </SlDetails>
          ))}
        </Card>
      )}
      <Card className="product-detail-card">
        <h3>Ürün varyantları</h3>
        {product.variants?.length ? (
          <ProductVariantsTable product={product} />
        ) : (
          <p>Henüz eklenmiş bir varyant bulunmuyor.</p>
        )}
      </Card>
    </div>
  );
}
