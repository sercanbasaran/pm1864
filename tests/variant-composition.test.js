import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateVariant,
  defaultConsumables,
} from "../src/variant-composition.js";
test("variant totals use product units and separate override; consumables never change net weight", () => {
  const products = [
    { id: 1, unitPricing: { unit: "Dilim", price: 32.35, weight: 42 } },
  ];
  const supplies = defaultConsumables();
  const v = {
    sourceProductId: 1,
    quantity: 3,
    packaging: "Tabakta servis",
    consumables: [{ id: supplies[0].id, quantity: 2 }],
    priceOverride: null,
  };
  const result = calculateVariant(v, products, supplies);
  assert.equal(result.price, 97.05);
  assert.equal(result.weight, 126);
  assert.equal(result.slices, 3);
  assert.equal(
    calculateVariant({ ...v, priceOverride: 100 }, products, supplies).price,
    100,
  );
  assert.throws(() =>
    calculateVariant({ ...v, quantity: 1.5 }, products, supplies),
  );
  assert.throws(() =>
    calculateVariant(
      { ...v, consumables: [{ id: "fake", quantity: 1 }] },
      products,
      supplies,
    ),
  );
});
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security.js";
test("API recalculates submitted variant price and weight and keeps composition", async () => {
  const password = "Variant-unit-test-1864";
  const app = await createApp({
    env: {
      SQLITE_PATH: ":memory:",
      ADMIN_EMAIL: "variant@test.example",
      ADMIN_PASSWORD_HASH: await hashPassword(password),
    },
  });
  let cookie = "";
  const call = async (path, method = "GET", body) => {
    const r = await app.handle(
      new Request("https://test.example/api" + path, {
        method,
        headers: {
          origin: "https://test.example",
          cookie,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (r.headers.has("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, ...(await r.json()) };
  };
  try {
    await call("/login", "POST", { email: "variant@test.example", password });
    let catalog = (await call("/catalog")).catalog;
    catalog = (
      await call("/products", "POST", {
        expectedRevision: catalog.revision,
        product: {
          name: "Baklava",
          category: "Baklavalar",
          status: "Aktif",
          variants: [],
          unitPricing: { unit: "Dilim", price: 32.35, weight: 42 },
        },
      })
    ).catalog;
    const product = catalog.products[0];
    const saved = await call("/products/" + product.id, "PUT", {
      expectedRevision: catalog.revision,
      product: {
        ...product,
        variants: [
          {
            size: "Porsiyon",
            typeId: catalog.variantTypes[0].id,
            sourceProductId: product.id,
            quantity: 3,
            packaging: "Tabakta servis",
            images: [],
            consumables: [{ id: catalog.consumables[0].id, quantity: 2 }],
            priceOverride: 100,
            price: 1,
            weight: 1,
          },
        ],
      },
    });
    assert.equal(saved.status, 200);
    const v = saved.catalog.products[0].variants[0];
    assert.equal(v.price, 100);
    assert.equal(v.calculatedPrice, 97.05);
    assert.equal(v.weight, 126);
    assert.equal(v.consumables[0].quantity, 2);
  } finally {
    await app.close();
  }
});
test("karma varyant toplamı, ağırlıklı besin bilgisi ve manuel düzeltmeler", async () => {
  const { deriveVariantInformation } = await import("../src/variant-composition.js");
  const nutrition = (n) => `100 g için: Enerji ${n} kcal / ${n * 4} kJ; Yağ ${n} g; Doymuş yağ ${n} g; Karbonhidrat ${n} g; Şeker ${n} g; Lif ${n} g; Protein ${n} g; Tuz ${n} g.`;
  const products = [
    {id:1,name:"Fıstıklı",unitPricing:{unit:"Dilim",price:100,weight:50},nutrition:nutrition(10),ingredients:"Fıstık",allergens:"Fıstık",satiety:[{ingredientId:"pistachio",level:4}]},
    {id:2,name:"Cevizli",unitPricing:{unit:"Dilim",price:80,weight:100},nutrition:nutrition(20),ingredients:"Ceviz",allergens:"Ceviz",satiety:[{ingredientId:"walnut",level:3}]},
  ];
  const v = {sourceProductId:1,quantity:2,items:[{productId:1,quantity:2},{productId:2,quantity:1}],packaging:"Tabakta servis",consumables:[],priceOverride:275,informationOverrides:{allergens:"Özel alerjen uyarısı"}};
  const result = calculateVariant(v, products, []);
  assert.equal(result.calculatedPrice,280); assert.equal(result.price,275); assert.equal(result.weight,200); assert.equal(result.slices,3);
  assert.equal(result.information.allergens,"Özel alerjen uyarısı"); assert.match(result.information.nutrition,/15 kcal/); assert.match(result.information.ingredients,/Fıstıklı: Fıstık/); assert.equal(result.information.satiety.length,2);
  const missing = deriveVariantInformation(v, [products[0], {...products[1], nutrition:""}]);
  assert.equal(missing.nutritionComplete,false); assert.equal(missing.nutrition,"");
  assert.throws(() => calculateVariant({...v,items:[{productId:1,quantity:1},{productId:1,quantity:1}]}, products, []));
});
test("API karma ürünleri ve düzenlenmiş varyant bilgilerini saklar", async () => {
  const password="Variant-mixed-test-1864";
  const app=await createApp({env:{SQLITE_PATH:":memory:",ADMIN_EMAIL:"mixed@test.example",ADMIN_PASSWORD_HASH:await hashPassword(password)}}); let cookie="";
  const call=async(path,method="GET",body)=>{const r=await app.handle(new Request("https://test.example/api"+path,{method,headers:{origin:"https://test.example",cookie,...(body?{"content-type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has("set-cookie"))cookie=r.headers.get("set-cookie").split(";")[0];return {status:r.status,...await r.json()};};
  try {
    await call("/login","POST",{email:"mixed@test.example",password}); let catalog=(await call("/catalog")).catalog;
    for(const [name,price,weight] of [["Fıstıklı",100,50],["Cevizli",80,100]]) {const r=await call("/products","POST",{expectedRevision:catalog.revision,product:{name,category:"Baklavalar",status:"Aktif",variants:[],ingredients:name,unitPricing:{unit:"Dilim",price,weight}}});assert.equal(r.status,200);catalog=r.catalog;}
    const p1=catalog.products.find(p=>p.name === "Fıstıklı"), p2=catalog.products.find(p=>p.name === "Cevizli");
    const result=await call(`/products/${p1.id}`,"PUT",{expectedRevision:catalog.revision,product:{...p1,variants:[{size:"Karışık",typeId:catalog.variantTypes[0].id,sourceProductId:p1.id,quantity:2,items:[{productId:p1.id,quantity:2},{productId:p2.id,quantity:1}],packaging:"Metal kutu",consumables:[],images:[],priceOverride:275,informationOverrides:{allergens:"Özel uyarı"},price:1,weight:1}]}});
    assert.equal(result.status,200);const v=result.catalog.products.find(p=>p.id===p1.id).variants[0];assert.equal(v.items.length,2);assert.equal(v.calculatedPrice,280);assert.equal(v.price,275);assert.equal(v.weight,200);assert.equal(v.information.allergens,"Özel uyarı");assert.match(v.information.ingredients,/Cevizli/);
  } finally {await app.close();}
});

test('tekrarlanan ürün bilgileri tek kez gösterilir, farklı bilgiler ürünleriyle korunur', async () => {
 const {deriveVariantInformation} = await import('../src/variant-composition.js');
 const products=[{id:1,name:'A',allergens:'Fıstık içerir',storageConditions:'Serin yerde saklayın.'},{id:2,name:'B',allergens:'  FISTIK   İÇERİR ',storageConditions:'Serin yerde saklayın.'},{id:3,name:'C',allergens:'Ceviz içerir',storageConditions:'Serin yerde saklayın.'}];
 const result=deriveVariantInformation({items:products.map(p=>({productId:p.id,quantity:1}))},products);
 assert.equal(result.allergens,'A / B: Fıstık içerir\nC: Ceviz içerir');
 assert.equal(result.storageConditions,'Serin yerde saklayın.');
});
