import React from "react";
import ProductImage from "../../components/ui/ProductImage.jsx";
export default function VariantProductImage({ product }) {
  return (
    <ProductImage
      product={{
        name: product?.name,
        customImage:
          product?.images?.[0]?.url ||
          product?.customImage ||
          (product?.mediaId ? `/api/media/${product.mediaId}/content` : ""),
      }}
    />
  );
}
