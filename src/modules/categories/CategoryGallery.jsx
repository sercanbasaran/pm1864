import {imageUrl} from "../../image-sizes.js";
import { Plus } from "@phosphor-icons/react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Controls.jsx";
import useImageDrop from "../../components/ui/useImageDrop.js";
import { uploadFile } from "../media/media-api.js";

export default function CategoryGallery({
  images = [],
  onChange,
  onRefresh,
  disabled = false,
  editable = true,
  label = "Kategori",
  onUploadingChange,
  maxImages = Infinity,
}) {
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const input = useRef(null);
  const current = Math.min(index, Math.max(0, images.length - 1));
  useEffect(() => { onUploadingChange?.(uploading); }, [uploading,onUploadingChange]);
  useEffect(() => {
    if (
      paused ||
      images.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(
      () => setIndex((n) => (n + 1) % images.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [paused, images.length]);
  async function uploadFiles(files) {
    if (!files.length || disabled || uploading || !editable) return;
    if(images.length + files.length > maxImages) {setError(`En fazla ${maxImages} görsel yükleyebilirsiniz.`); return;}
    setUploading(true);
    setError("");
    const added = [];
    let failure;
    try {
      for (const file of files) {
        const { asset } = await uploadFile(file);
        added.push({ id: asset.id, url: asset.url });
      }
    } catch (e) {
      failure = e.message;
    }
    try {
      // Media uploads update the catalog revision. Refresh before linking them.
      if (added.length) {
        const refreshed = await onRefresh?.();
        if (
          (await onChange(
            [...images, ...added],
            refreshed?.categories,
            refreshed,
          )) === false
        )
          throw new Error("Görseller kaydedilemedi. Yeniden deneyin.");
        setIndex(images.length);
      }
      if (failure) setError(failure);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  const { dragging, dropProps } = useImageDrop(uploadFiles, disabled || uploading || !editable);
  async function remove() {
    setError("");
    try {
      if ((await onChange(images.filter((_, n) => n !== current))) === false)
        throw new Error("Görsel kaldırılamadı.");
    } catch (e) {
      setError(e.message);
    }
  }
  const busy = disabled || uploading;
  return (
    <div
      className={`category-gallery image-drop-target${dragging ? " is-dragging" : ""}`}
      {...dropProps}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      {editable && (
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          aria-label={label + " görsellerini yükle"}
          onChange={(event) => { const files = [...event.target.files]; event.target.value = ""; uploadFiles(files); }}
          disabled={busy}
        />
      )}
      {images.length ? (
        <div className="category-gallery-frame">
          <div
            className="category-gallery-track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {images.map((image, n) => (
              <img
                key={image.id}
                src={imageUrl(image.url || `/api/media/${image.id}/content`, "detail")}
                width={1200} height={1200} loading={n === current ? "eager" : "lazy"} decoding="async"
                alt={`${label} görseli ${n + 1}`}
              />
            ))}
          </div>
          {editable && (
            <div className="category-gallery-overlay">
              <Button type="button" disabled={busy} onClick={remove}>
                Kaldır
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => input.current.click()}
              >
                {!uploading && <Plus size={15} />}
                {uploading ? "Yükleniyor…" : "Ekle"}
              </Button>
            </div>
          )}
          {images.length > 1 && (
            <div className="category-gallery-navigation">
              <Button
                type="button"
                aria-label="Önceki görsel"
                onClick={() =>
                  setIndex((current + images.length - 1) % images.length)
                }
              >
                ‹
              </Button>
              <span aria-live="polite">
                {current + 1} / {images.length}
              </span>
              <Button
                type="button"
                aria-label="Sonraki görsel"
                onClick={() => setIndex((current + 1) % images.length)}
              >
                ›
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="category-gallery-empty">
          {editable ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => input.current.click()}
            >
              {!uploading && <Plus size={15} />}
              {uploading ? "Yükleniyor…" : "Görsel ekle"}
            </Button>
          ) : (
            "Görsel yok"
          )}
        </div>
      )}
      {editable && <small className="image-drop-help">Görselleri buraya sürükleyip bırakabilirsiniz.</small>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
