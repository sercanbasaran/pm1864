import React, { useRef, useState } from "react";
import SlQrCode from "@shoelace-style/shoelace/dist/react/qr-code/index.js";
import SlSwitch from "@shoelace-style/shoelace/dist/react/switch/index.js";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import { DownloadSimple, ArrowSquareOut, Copy } from "@phosphor-icons/react";
import EditorPage from "../../components/layout/EditorPage.jsx";
import Card from "../../components/ui/Card.jsx";
import { Button, Input } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { can } from "../../permissions.js";
import {
  productCardPath,
  productCardEligible,
  productCardData,
} from "../../product-card.js";
import ProductDetails from "./ProductDetails.jsx";

export default function ProductCardManagement({ product, user, onClose }) {
  const { categories, variantTypes, busy, mutate, notify } = useCatalog(),
    qr = useRef(null),
    [error, setError] = useState(""),
    [downloading, setDownloading] = useState(false);
  const url = new URL(productCardPath(product), window.location.origin).href;
  const eligible = productCardEligible(product, categories),
    enabled = product.publicCardEnabled === true,
    live = enabled && eligible;
  async function publish(event) {
    const next = event.target.checked;
    event.target.checked = enabled;
    setError("");
    try {
      await mutate(
        "/products/" + product.id + "/card",
        { enabled: next },
        "PATCH",
      );
      notify(
        next ? "Ürün kartı yayınlandı." : "Ürün kartı yayından kaldırıldı.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      notify("Ürün kartı bağlantısı kopyalandı.");
    } catch {
      setError("Bağlantıyı yukarıdaki alandan seçip kopyalayın.");
    }
  }
  async function download() {
    setDownloading(true);
    setError("");
    try {
      await qr.current.updateComplete;
      const source = qr.current.shadowRoot.querySelector("canvas");
      if (!source?.width)
        throw new Error("QR kod hazırlanamadı. Yeniden deneyin.");
      const canvas = document.createElement("canvas"),
        margin = Math.ceil(source.width * 0.1);
      canvas.width = canvas.height = source.width + margin * 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Bu tarayıcı QR indirmeyi desteklemiyor.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, margin, margin);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("QR dosyası oluşturulamadı.");
      const href = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = href;
      link.download = product.productCode + "-QR.png";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      notify("QR kod indirildi.");
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <EditorPage title="Ürün kartı ve QR" onClose={onClose} busy={busy}>
      <div className="product-card-workspace">
        <ProductDetails
          product={productCardData(
            product,
            categories,
            product.customImage,
            variantTypes,
          )}
        />
        <Card className="product-card-sharing">
          <h3>QR kod ve paylaşım</h3>
          <SlTag variant={live ? "success" : "neutral"}>
            {live ? "Yayında" : enabled ? "Yayın durduruldu" : "Yayınlanmadı"}
          </SlTag>
          <p className="muted">
            Yayınlanan kart, QR kod veya bağlantı üzerinden giriş yapmadan
            görüntülenir. Ürün güncellemeleri aynı bağlantıya yansır.
          </p>
          {can(user, "products.write") && (
            <SlSwitch
              checked={enabled}
              disabled={busy || (!enabled && !eligible)}
              onSlChange={publish}
            >
              Ürün kartını yayınla
            </SlSwitch>
          )}
          {!eligible && (
            <SlAlert open variant="neutral">
              Yayınlamak için ürün, ana kategori ve alt kategori aktif olmalı;
              en az bir aktif varyant bulunmalıdır.
            </SlAlert>
          )}
          {error && (
            <SlAlert open variant="danger">
              {error}
            </SlAlert>
          )}
          <div className="product-qr-frame">
            <SlQrCode
              ref={qr}
              value={url}
              label={product.name + " ürün kartı QR kodu"}
              size={200}
              errorCorrection="H"
              fill="#000000"
              background="#ffffff"
              radius={0}
            />
          </div>
          <div>
            <Input
              label="Ürün kartı bağlantısı"
              aria-label="Ürün kartı bağlantısı"
              value={url}
              readOnly
            />
          </div>
          <div className="product-card-share-actions">
            <Button type="button" onClick={copy}>
              <Copy size={18} />
              Bağlantıyı kopyala
            </Button>
            <Button type="button" disabled={downloading} onClick={download}>
              <DownloadSimple size={18} />
              QR kodu indir
            </Button>
            <Button
              type="button"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              disabled={!live}
            >
              <ArrowSquareOut size={18} />
              Public kartı aç
            </Button>
          </div>
          {!live && (
            <p className="muted">
              Bu QR kod ve bağlantı, kart yayınlandıktan sonra herkese açık
              olarak çalışır.
            </p>
          )}
        </Card>
      </div>
    </EditorPage>
  );
}
