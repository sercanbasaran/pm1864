import PackagingSelect from "../packaging/PackagingSelect.jsx";
import { suggestedVariantName } from "../../variant-name.js";
import {packagingAllowsProduct} from "../packaging/packaging-approval.js";
import { variantWizardSteps } from "./variant-wizard.js";
import { packagingOptions } from "../../variant-composition.js";
import React, { useState } from "react";
import EditorPage from "../../components/layout/EditorPage.jsx";
import { Button, Input, Select } from "../../components/ui/Controls.jsx";
import { useCatalog } from "../../app/CatalogContext.jsx";
import { newVariant } from "./VariantFields.jsx";
import VariantEditor from "./VariantEditor.jsx";
import VariantProductPicker from "./VariantProductPicker.jsx";
import "./variant-composition.css";
import {
  defaultPackagingItems,
  isBoxVariant,
  isPortionVariant,
} from "../packaging/packaging-data.js";

export default function VariantCreatePage({
  onClose,
  initialProduct,
  onSaved,
  onDuplicate,
  onCard,
  onCreate,
}) {
  const {
    products,
    categories,
    variantTypes,
    packagingItems = defaultPackagingItems(),
  } = useCatalog();
  const [typeId, setTypeId] = useState(""),
    [name, setName] = useState(""),
    [nameEdited, setNameEdited] = useState(false),
    [step, setStep] = useState(0),
    [owner, setOwner] = useState(null),
    [packagingId, setPackagingId] = useState(""),
    [packaging, setPackaging] = useState(""), [approvalError, setApprovalError] = useState("");
  const isBox = isBoxVariant({ typeId }, variantTypes);
  const isPortion = isPortionVariant({ typeId }, variantTypes);
  const selectedBox = packagingItems.find((item) => item.id === packagingId);
  const displayName = nameEdited ? name : suggestedVariantName(initialProduct, typeId, variantTypes);
  const selectOwner = p => { if(isBox && !packagingAllowsProduct(selectedBox,p.id,products,categories)) {setApprovalError("Bu ürün seçilen kutu için onaylı değil. Ambalaj Merkezi’nden ürün onayı verin veya başka kutu seçin."); return;} setApprovalError(""); setOwner(p); };
  if (owner) {
    const draft = {
      ...structuredClone(owner),
      variants: [
        ...structuredClone(owner.variants),
        {
          ...newVariant(),
          size: displayName.trim() || suggestedVariantName(owner, typeId, variantTypes),
          typeId,
          sourceProductId: owner.id,
          items: [{ productId: owner.id, quantity: 1 }],
          ...(isBox && selectedBox
            ? {
                packagingId: selectedBox.id,
                packaging:
                  selectedBox.material === "Karton"
                    ? "Karton kutu"
                    : "Metal kutu",
              }
            : isPortion
              ? { packagingId: "", packaging: "Tabakta servis" }
              : { packaging }),
        },
      ],
    };
    return (
      <VariantEditor
        product={draft}
        initialStep={1}
        onClose={onClose}
        onSaved={onSaved}
        onDuplicate={onDuplicate}
        onCard={onCard}
        onCreate={onCreate}
      />
    );
  }
  return (
    <EditorPage title="Varyant oluştur" onClose={onClose}>
      {approvalError && <p role="alert">{approvalError}</p>}
      <div className="variant-editor-layout">
        <nav
          className="variant-wizard-steps"
          aria-label="Varyant oluşturma adımları"
        >
          {variantWizardSteps.map((label, i) => (
            <span key={label} aria-current={i === step ? "step" : undefined}>
              <b>{i + 1}</b> {label}
            </span>
          ))}
        </nav>
        {step === 0 ? (
          <section className="variant-wizard-section">
            <h3>Varyant türü ve adı</h3>
            <p>Varyant adı ürün ve tür seçimine göre otomatik oluşturulur. İsterseniz değiştirebilirsiniz.</p>
            {initialProduct && (
              <p>
                Seçili ürün: <strong>{initialProduct.name}</strong>
              </p>
            )}
            <div className="variant-basic-grid">
              <Select
                label="Varyant türü"
                value={typeId}
                onChange={(e) => {
                  setTypeId(e.target.value);
                  setPackagingId("");
                  setPackaging("");
                }}
              >
                <option value="">Tür seçin</option>
                {variantTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Varyant adı"
                maxLength={45}
                value={displayName}
                placeholder="Ürün ismi [Varyant tipi]"
                onChange={(e) => {setName(e.target.value); setNameEdited(!!e.target.value.trim());}}
              />
              {isPortion && (
                <Input label="Servis şekli" value="Tabakta Servis" disabled />
              )}
              {!isBox && !isPortion && typeId && (
                <Select
                  label="Ambalaj / servis şekli"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                >
                  <option value="">Seçin</option>
                  {packagingOptions.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              )}
              {isBox && (
                <PackagingSelect items={packagingItems} value={packagingId} onChange={e=>setPackagingId(e.target.value)} />
              )}
            </div>
            {!variantTypes.length && (
              <p>Önce Sistem Ayarları bölümünden varyant tipi ekleyin.</p>
            )}
            <div className="variant-wizard-navigation">
              <Button
                type="button"
                variant="primary"
                disabled={
                  !typeId ||
                  (!isBox && !isPortion && !packaging) ||
                  (isBox && !selectedBox) ||
                  (initialProduct && initialProduct.variants.length >= 50)
                }
                onClick={() =>
                  initialProduct ? selectOwner(initialProduct) : setStep(1)
                }
              >
                Devam et
              </Button>
            </div>
          </section>
        ) : (
          <section className="variant-wizard-section">
            <h3>İlk ürünü seçin</h3>
            <p>
              İlk ürünü seçin; daha sonra farklı kategorilerden ürünler de
              ekleyebilirsiniz.
            </p>
            <VariantProductPicker
              products={products}
              categories={categories}
              requireCapacity
              isProductAllowed={p => !isBox || packagingAllowsProduct(selectedBox,p.id,products,categories)}
              onSelect={selectOwner}
            />
            <div className="variant-wizard-navigation">
              <Button type="button" onClick={() => setStep(0)}>
                Geri
              </Button>
            </div>
          </section>
        )}
      </div>
    </EditorPage>
  );
}
