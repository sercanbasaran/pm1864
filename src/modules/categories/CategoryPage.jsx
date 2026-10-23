import React, { useEffect, useState } from "react";
import BackendGate from "../../app/BackendGate.jsx";
import CategoryGallery from "./CategoryGallery.jsx";
import ProductDetails from "../products/ProductDetails.jsx";
import { Button } from "../../components/ui/Controls.jsx";

export default function CategoryPage() {
  const [category, setCategory] = useState(null),
    [error, setError] = useState(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCategory(null);
    setError(null);
    (async () => {
      try {
        const slug = window.location.pathname.match(
          /^\/kategori\/([^/]+)\/?$/,
        )?.[1];
        if (!slug)
          throw Object.assign(new Error("Kategori bulunamadı."), {
            status: 404,
          });
        const response = await fetch("/api/category-pages/" + slug, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw Object.assign(
            new Error(data.error?.message || "Kategori yüklenemedi."),
            { status: response.status },
          );
        setCategory(data.category);
      } catch (e) {
        if (!controller.signal.aborted) setError(e);
      }
    })();
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const title = document.title;
    document.title = (category?.name || "Kategori") + " | Hafız Mustafa 1864";
    return () => {
      document.title = title;
    };
  }, [category?.name]);
  if (error?.status === 401)
    return <BackendGate>{() => <CategoryPage />}</BackendGate>;
  return (
    <div className="public-product-page">
      <header className="public-product-header">
        <strong>
          HAFIZ MUSTAFA <span>1864</span>
        </strong>
        <span>Kategori ürünleri</span>
      </header>
      <main className="public-product-content">
        {!category && !error && <p role="status">Kategori yükleniyor…</p>}
        {error && (
          <div role="alert">
            <p>{error.message}</p>
            {error.status !== 404 && (
              <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Yeniden dene
              </Button>
            )}
          </div>
        )}
        {category && (
          <>
            <h1>{category.name}</h1>
            {category.description && <p>{category.description}</p>}
            {category.images.length > 0 && (
              <CategoryGallery images={category.images} editable={false} />
            )}
            <div className="category-page-products">
              {category.products.map((product) => (
                <ProductDetails key={product.productCode} product={product} />
              ))}
            </div>
            {!category.products.length && (
              <p>Bu kategoride görüntülenecek aktif ürün bulunmuyor.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
