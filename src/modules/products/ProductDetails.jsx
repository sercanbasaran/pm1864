import ProductVariantsTable from "./ProductVariantsTable.jsx";
import React from "react";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import Card from "../../components/ui/Card.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import ProductImage from "../../components/ui/ProductImage.jsx";
import { money } from "../../catalog-tools.js";
import NutritionTable from "./NutritionTable.jsx";
import ProductSatiety from "./ProductSatiety.jsx";
import { hasSatiety } from "../../satiety.js";
import { productDetailSteps } from "../../product-information.js";

export default function ProductDetails({ product }) {
  const information = productDetailSteps.filter((field) =>
    field.key === "satiety"
      ? hasSatiety(product.satiety)
      : field.key && product[field.key],
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
            <h2>{product.name}</h2>
            <div className="product-detail-identifiers">
              <SlTag>{product.productCode}</SlTag>
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
        <ProductVariantsTable product={product} />
      </Card>
      {information.length > 0 && (
        <Card className="product-detail-card product-detail-information">
          <h3>Ürün bilgileri</h3>
          {information.map((field) => (
            <SlDetails
              key={field.key}
              summary={field.label}
              open={field.key === "allergens"}
            >
              {field.key === "satiety" ? (
                <ProductSatiety value={product.satiety} />
              ) : field.key === "nutrition" ? (
                <NutritionTable value={product.nutrition} />
              ) : (
                <p>{product[field.key]}</p>
              )}
            </SlDetails>
          ))}
        </Card>
      )}
    </div>
  );
}
