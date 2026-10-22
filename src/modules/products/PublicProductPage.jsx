import React, { useEffect, useState } from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import Card from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Controls.jsx";
import ProductDetails from "./ProductDetails.jsx";

export default function PublicProductPage() {
  const [product, setProduct] = useState(null),
    [error, setError] = useState(null),
    [attempt, setAttempt] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController(),
      code = window.location.pathname.match(/^\/p\/(P\d{6,})\/?$/)?.[1];
    setLoading(true);
    setError(null);
    setProduct(null);
    async function load() {
      try {
        if (!code)
          throw Object.assign(
            new Error("Ürün kartı bulunamadı veya yayından kaldırıldı."),
            { status: 404 },
          );
        const response = await fetch("/api/public/products/" + code, {
          signal: controller.signal,
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok)
          throw Object.assign(
            new Error(
              response.status === 404
                ? "Ürün kartı bulunamadı veya yayından kaldırıldı."
                : "Ürün bilgileri alınamadı. Lütfen yeniden deneyin.",
            ),
            { status: response.status },
          );
        const data = await response.json();
        if (active) setProduct(data.product);
      } catch (e) {
        if (active && e.name !== "AbortError")
          setError(
            e.status
              ? e
              : new Error("Sunucuya ulaşılamadı. Lütfen yeniden deneyin."),
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  useEffect(() => {
    const old = document.title;
    document.title = product
      ? product.name + " | Hafız Mustafa 1864"
      : "Ürün kartı | Hafız Mustafa 1864";
    return () => {
      document.title = old;
    };
  }, [product]);
  return (
    <div className="public-product-page">
      <header className="public-product-header">
        <strong>
          HAFIZ MUSTAFA <span>1864</span>
        </strong>
        <span>Ürün kartı</span>
      </header>
      <main className="public-product-content">
        <h1 className="visually-hidden">{product?.name || "Ürün kartı"}</h1>
        {loading && <Card role="status">Ürün kartı yükleniyor…</Card>}
        {error && (
          <SlAlert open variant={error.status === 404 ? "neutral" : "danger"}>
            <strong>
              {error.status === 404
                ? "Kart görüntülenemiyor"
                : "Bağlantı sorunu"}
            </strong>
            <p>{error.message}</p>
            {error.status !== 404 && (
              <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Yeniden dene
              </Button>
            )}
          </SlAlert>
        )}
        {product && <ProductDetails product={product} />}
      </main>
      <footer>HAFIZ MUSTAFA 1864 · Ürün bilgileri</footer>
    </div>
  );
}
