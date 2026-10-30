import CardNavigation from "./CardNavigation.jsx";
import {hasPortion, portionDefinition, portionCountLabel} from "../../portions.js";
import { salesChannels } from "../../sales-availability.js";
import "./product-details.css";
import { hasUnitPricing } from "../../unit-pricing.js";
import ProductVariantsTable from "./ProductVariantsTable.jsx";
import React, { useState, useEffect } from "react";
import { Select } from "../../components/ui/Controls.jsx";
import { convertedPrice } from "../../card-localization.js";
import SlDetails from "@shoelace-style/shoelace/dist/react/details/index.js";
import Card from "../../components/ui/Card.jsx";
import MediaGallery from "../categories/CategoryGallery.jsx";
import ProductImage from "../../components/ui/ProductImage.jsx";
import NutritionTable from "./NutritionTable.jsx";
import ProductSatiety from "./ProductSatiety.jsx";
import { hasSatiety } from "../../satiety.js";
import { productDetailSteps } from "../../product-information.js";

export default function ProductDetails({ product: source, localizationUrl, navigation, onNavigate }) {
  const [language, setLanguage] = useState('tr'), [currency, setCurrency] = useState('TRY');
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    setLoaded(null); setLanguage('tr'); setCurrency('TRY');
    if (!localizationUrl) return;
    const controller = new AbortController();
    fetch(localizationUrl, {credentials:'same-origin', cache:'no-store', signal:controller.signal})
      .then(r => r.ok ? r.json() : null).then(data => { if (!controller.signal.aborted) setLoaded(data?.product?.localization || null); }).catch(() => {});
    return () => controller.abort();
  }, [localizationUrl]);
  const localization = source.localization || loaded;
  const translation = localization?.translations?.[language];
  const product = {...source, ...(language !== 'tr' ? translation : {})};
  const rate = localization?.rates?.find(r => r.currency === currency);
  const activeCurrency = currency === 'TRY' || rate ? currency : 'TRY';
  const formatPrice = value => convertedPrice(value, activeCurrency, rate?.rate, language);

  const information = productDetailSteps.filter(
    (field) => field.key && field.key !== "satiety" && product[field.key],
  );
  return (
    <div className="product-details" lang={language} dir={['ar','fa','ur'].includes(language) ? 'rtl' : 'ltr'}>
      <CardNavigation navigation={navigation || source.navigation} onNavigate={onNavigate} />
      {localization && <div className="card-localization-controls product-pdf-action">
        <Select label="Dil" value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="tr">Türkçe</option>
          {localization.languages?.filter(l => l.code !== 'tr').map(l => <option key={l.code} value={l.code} disabled={!localization.translations?.[l.code]}>{l.nativeName || l.name}{!localization.translations?.[l.code] ? ' · Çeviri hazırlanmadı' : ''}</option>)}
        </Select>
        <Select label="Para birimi" value={activeCurrency} onChange={e => setCurrency(e.target.value)}>
          <option value="TRY">TRY</option>
          {localization.currencies?.filter(c => c.code !== 'TRY').map(c => <option key={c.code} value={c.code} disabled={!localization.rates?.some(r => r.currency === c.code)}>{c.code} · {c.name}</option>)}
        </Select>
        {activeCurrency !== 'TRY' && <small>Kur tarihi: {rate.date} · Tutarlar en yakın tam sayıya yuvarlanır.</small>}
      </div>}

      <Card className="product-detail-card">
        <div className="product-detail-hero">
          {product.images?.length ? (
            <MediaGallery
              label="Ürün"
              images={product.images}
              editable={false}
            />
          ) : (
            <ProductImage product={product} size="detail" eager />
          )}
          <div>
            <small className="product-detail-category">
              {product.category}
            </small>
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
                    {formatPrice(product.unitPricing.price)} /{" "}
                    {product.unitPricing.unit.toLocaleLowerCase("tr-TR")}
                  </dd>
                </div>
                <div>
                  <dt>Birim gramaj</dt>
                  <dd>
                    ≈ {new Intl.NumberFormat("tr-TR").format(
                      product.unitPricing.weight,
                    )}{" "}
                    g / {product.unitPricing.unit.toLocaleLowerCase("tr-TR")}
                  </dd>
                </div>
              </dl>
            )}
            {product.variantPricing && (
              <dl className="public-unit-pricing">
                <div><dt>Satış fiyatı</dt><dd>{formatPrice(product.variantPricing.price)}</dd></div>
                <div><dt>Net gramaj</dt><dd>≈ {new Intl.NumberFormat("tr-TR").format(product.variantPricing.weight)} g</dd></div>
              </dl>
            )}
            {hasPortion(product) && <p><strong>Porsiyon bilgisi:</strong> {portionDefinition(product)}</p>}
            {product.isVariantCard && <p><strong>Porsiyon bilgisi:</strong> {portionCountLabel(product.portionCount)}</p>}
            {product.salesAvailability && (
              <>
                <hr className="product-summary-divider" />
                <section
                  aria-label="Satış kanalları"
                  className="public-sales-channels"
                >
                  <h3>Satış kanalları</h3>
                  <ul>
                    {salesChannels
                      .filter(
                        (channel) => product.salesAvailability[channel.key],
                      )
                      .map((channel) => (
                        <li key={channel.key}>{channel.label}</li>
                      ))}
                  </ul>
                  {!salesChannels.some(
                    (channel) => product.salesAvailability[channel.key],
                  ) && <p>Aktif satış kanalı bulunmuyor.</p>}
                </section>
              </>
            )}
          </div>
        </div>
      </Card>
      {product.variantContents?.length > 0 && (
        <Card className="product-detail-card product-detail-information">
          <h3>Varyant içeriği</h3>
          <ul>{product.variantContents.map((item, index) => <li key={index}>{item.name} · {item.quantity} {item.unit}</li>)}</ul>
          {product.variantPricing?.packaging && <p>Ambalaj / servis: {product.variantPricing.packaging}</p>}
        </Card>
      )}
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
      {!product.isVariantCard && <Card className="product-detail-card product-card-variants">
        <h3>Ürünün dahil olduğu varyantlar</h3>
        {product.variants?.length ? (
          <ProductVariantsTable product={product} formatPrice={formatPrice} priceLabel={`Fiyat (${activeCurrency})`} />
        ) : (
          <p>Henüz eklenmiş bir varyant bulunmuyor.</p>
        )}
      </Card>}
    </div>
  );
}
