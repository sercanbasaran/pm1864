import {FolderSimple,Package,Stack,Barcode,UsersThree,Images,Tag,ClockCounterClockwise,SquaresFour,UserCircle,Question} from '@phosphor-icons/react';
export const primaryModules=[
 {id:'categories',label:'Kategori yönetimi',icon:FolderSimple,permission:'catalog.read',description:'Ana kategoriler ve alt gruplar.'},
 {id:'products',label:'Ürün yönetimi',icon:Package,permission:'catalog.read',description:'Ürün bilgileri, kategoriler ve görseller.'},
 {id:'variants',label:'Varyant yönetimi',icon:Stack,permission:'catalog.read',description:'Boyut, gramaj, fiyat ve varyant durumları.'},
 {id:'codes',label:'Ürün kodu ve SKU yönetimi',icon:Barcode,permission:'catalog.read',description:'Kalıcı ürün kodları, SKU’lar ve kodlama kuralları.'},
 {id:'users',label:'Kullanıcı yönetimi',icon:UsersThree,permission:'users.manage',description:'Ekip hesapları, roller ve erişim yetkileri.'},
 {id:'media',label:'Medya',icon:Images,permission:'catalog.read',description:'Görsel yükleme, düzenleme ve ürünlerle ilişkilendirme.'}
];
export const secondaryModules=[{id:'overview',label:'Genel bakış',icon:SquaresFour,permission:'catalog.read'},{id:'prices',label:'Fiyat yönetimi',icon:Tag,permission:'catalog.read'},{id:'activity',label:'İşlem geçmişi',icon:ClockCounterClockwise,permission:'catalog.read'},{id:'account',label:'Hesabım',icon:UserCircle,permission:'catalog.read'},{id:'help',label:'Yardım merkezi',icon:Question,permission:'catalog.read'}];
export const modules=[...primaryModules,...secondaryModules];
export const legacyPages={'Kategoriler':'categories','Kategori yönetimi':'categories','Ürün kataloğu':'products','Ürün yönetimi':'products','Varyant yönetimi':'variants','Fiyat yönetimi':'prices','Kullanıcılar ve yetkiler':'users','Kullanıcı yönetimi':'users','Ayarlar':'codes','İşlem geçmişi':'activity','Hesabım':'account','Yardım merkezi':'help'};
