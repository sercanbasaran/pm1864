import test from 'node:test';
import assert from 'node:assert/strict';
import {variantExportRecord} from '../src/modules/variants/variant-export.js';
const p={id:1,name:'Baklava',productCode:'100',status:'Aktif',unitPricing:{unit:'Dilim',weight:40,price:20},portion:{unit:'Dilim',quantity:3},ingredients:'Fıstık',images:[{id:'a b'},{url:'https://example.test/image.jpg'}],dimensions:{length:45,width:35,height:20},variants:[]};
const other={...p,id:2,name:'Lokum',productCode:'200',images:[],customImage:'/lokum.jpg'};
const v={id:'v1',sku:'10001',typeId:'box',size:'Karışık',items:[{productId:1,quantity:3},{productId:2,quantity:3}],quantity:3,weight:240,slices:6,price:125,calculatedPrice:120,priceOverride:125,active:false,salesAvailability:{store:true,online:false},packagingId:'box1',images:[{id:'variant'}],informationOverrides:{allergens:'Fındık'},consumables:[{id:'tissue',quantity:2}],futureField:{value:10}};
test('export includes full variant fields, all constituent photos as absolute URLs, resolved content and raw structured data',()=>{
 const r=variantExportRecord(p,v,[{id:'box',name:'Kutu'}],[p,other],[{id:'box1',name:'Kırmızı kutu',shape:'cylinder',diameter:10,height:20,imageUrl:'/box.png'}],{origin:'https://usta.test',consumables:[{id:'tissue',name:'Mendil'}]});
 assert.ok(Object.keys(r).length<=64);assert.equal(r['Satış fiyatı'],125);assert.equal(r['Manuel fiyat düzeltmesi'],125);assert.equal(r['Porsiyon bilgisi'],'≈ 2 kişilik');
 assert.equal(r['Mağaza'],'Açık');assert.equal(r['Mağaza satış uygunluğu'],'Kapalı');assert.equal(r['İçindekiler'],'Fıstık');assert.equal(r['Alerjen uyarısı'],'Fındık');assert.equal(r['Sarf malzemeler'],'Mendil: 2');
 assert.ok(r['Ürün fotoğraf linkleri'].includes('https://usta.test/api/media/a%20b/content'));assert.ok(r['Ürün fotoğraf linkleri'].includes('https://example.test/image.jpg'));assert.ok(r['Ürün fotoğraf linkleri'].includes('Lokum: https://usta.test/lokum.jpg'));
 assert.equal(r['Varyant fotoğraf linkleri'],'https://usta.test/api/media/variant/content');assert.equal(r['Kutu fotoğraf linkleri'],'https://usta.test/box.png');assert.equal(r['Kutu ölçüleri (mm)'],'10 × 20');
 assert.deepEqual(JSON.parse(r['Varyant tüm verileri (JSON)']),v);const members=JSON.parse(r['İçerikteki ürünlerin tüm verileri (JSON)']);assert.equal(members.length,2);assert.equal(members[0].variants,undefined);assert.equal(members[0].quantity,3);
});
test('legacy variants and empty optional data export without broken or unsafe photo links',()=>{
 const r=variantExportRecord(p,{size:'Eski',quantity:3,images:[{url:'javascript:alert(1)'}]},[],[p],[],{origin:'https://usta.test'});
 assert.equal(r['Ürünler ve miktarlar'],'100:3');assert.equal(r['Varyant fotoğraf linkleri'],'');assert.equal(r['Kutu tüm verileri (JSON)'],'');assert.equal(r['Manuel fiyat düzeltmesi'],'');
});

test('constituent portion weights and quantities convert grams and kilos separately and keep missing measurements explicit',()=>{
 const kilo={...p,id:3,name:'Kilogram ürün',productCode:'300',unitPricing:{unit:'Kilogram',price:100},portion:{unit:'Kilogram',quantity:0.15},dimensions:null};
 const gram={...p,id:4,name:'Gram ürün',productCode:'400',unitPricing:{unit:'Gram',price:1},portion:{unit:'Gram',quantity:125}};
 const r=variantExportRecord(p,{...v,items:[{productId:1,quantity:6},{productId:3,quantity:0.5},{productId:4,quantity:200}]},[],[p,kilo,gram],[]);
 assert.equal(Object.keys(r).length,64);
 assert.equal(r['Ürün porsiyon gramajları (g)'],'Baklava (100): 120\nKilogram ürün (300): 150\nGram ürün (400): 125');
 assert.equal(r['Varyanta eklenen ürün gramajları (g)'],'Baklava (100): 240\nKilogram ürün (300): 500\nGram ürün (400): 200');
 assert.ok(r['Ürün uzunlukları (mm)'].includes('Kilogram ürün (300): Belirtilmedi'));
 assert.ok(r['Ürün içerik ve kullanım bilgileri'].includes('Baklava (100): İçindekiler: Fıstık'));
 assert.ok(r['Ürün porsiyon miktarları'].includes('Kilogram ürün (300): 1 kişilik: 0,15 kilogram'));
});

test('card-visible channels, description, named satiety and fallback photos are exported',()=>{
 const variant={...v,active:true,salesAvailability:{store:true,online:false,foodDelivery:true},images:[],information:{ingredients:'Fıstık',satiety:[{ingredientId:'custom',level:4}]}};
 const r=variantExportRecord(p,variant,[],[p,other],[],{origin:'https://usta.test',satietyProducts:[{id:'custom',name:'Antep fıstığı',icon:'pistachio'}]});
 assert.equal(r['Satış kanalları'],'Mağaza; Sipariş Platformları');
 assert.equal(r['Kart açıklaması'],'Baklava · Lokum');
 assert.equal(r['Doygunluk bilgisi'],'Antep fıstığı: 4/5 (Yoğun)');
 assert.ok(r['Kartta gösterilen fotoğraf linkleri'].includes('https://usta.test/api/media/a%20b/content'));
 assert.ok(Object.keys(r).length<=64);
 const inactive=variantExportRecord(p,{...variant,active:false},[],[p,other],[]);
 assert.equal(inactive['Satış kanalları'],'Aktif satış kanalı bulunmuyor.');
});
