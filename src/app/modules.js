import {
  FolderSimple,
  Package,
  Stack,
  Barcode,
  UsersThree,
  Images,
  Tag,
  ClockCounterClockwise,
  SquaresFour,
  UserCircle,
  Question,
  Gear,
  Storefront,
  Globe,
  Motorcycle,
  ListBullets,
  ChartLine,
  TreeStructure,
  Books,
  ShieldCheck,
  CurrencyCircleDollar,
  Translate,
  Files,
} from "@phosphor-icons/react";
const existingModules = [
  {
    id: "overview",
    label: "Genel Bakış",
    icon: SquaresFour,
    permission: "catalog.read",
  },
  {
    id: "categories",
    label: "Kategoriler",
    icon: FolderSimple,
    permission: "catalog.read",
    description: "Ana kategoriler ve alt gruplar.",
  },
  {
    id: "products",
    label: "Ürünler",
    icon: Package,
    permission: "catalog.read",
    description: "Ürün bilgileri, kategoriler ve görseller.",
  },
  {
    id: "variants",
    label: "Varyantlar",
    icon: Stack,
    permission: "catalog.read",
    description: "Boyut, gramaj, fiyat ve varyant durumları.",
  },
  {
    id: "codes",
    label: "Ürün Kodları",
    icon: Barcode,
    permission: "catalog.read",
    description: "Kalıcı ürün kodları, SKU’lar ve kodlama kuralları.",
  },
  {
    id: "users",
    label: "Kullanıcılar",
    icon: UsersThree,
    permission: "users.manage",
    description: "Ekip hesapları, roller ve erişim yetkileri.",
  },
  {
    id: "media",
    label: "Görseller",
    icon: Images,
    permission: "catalog.read",
    description: "Görsel yükleme, düzenleme ve ürünlerle ilişkilendirme.",
  },
];
export const secondaryModules = [
  {
    id: "prices",
    label: "Fiyatlama",
    icon: Tag,
    permission: "catalog.read",
  },
  {
    id: "activity",
    label: "İşlem geçmişi",
    icon: ClockCounterClockwise,
    permission: "catalog.read",
  },
  {
    id: "settings",
    label: "Ayarlar",
    icon: Gear,
    permission: "catalog.read",
    description: "Katalog ve hesap işlemlerinin geçmişini inceleyin.",
  },
  {
    id: "account",
    label: "Hesabım",
    icon: UserCircle,
    permission: "catalog.read",
  },
  {
    id: "help",
    label: "Yardım merkezi",
    icon: Question,
    permission: "catalog.read",
  },
];
// Stable leaf IDs keep existing bookmarks, editors and public card links valid.
const plannedModules = [
  {
    id: "currencies",
    label: "Para Birimleri",
    icon: CurrencyCircleDollar,
    permission: "settings.write",
    description: "Sistemde kullanılacak para birimlerinin tanımları.",
  },
  {
    id: "languages",
    label: "Diller",
    icon: Translate,
    permission: "settings.write",
    description: "İçerik ve arayüz dillerinin tanımları.",
  },
  {
    id: "documents",
    label: "Dokümanlar",
    icon: Files,
    description: "Ürün ve operasyon dokümanlarının kütüphanesi.",
  },
  {
    id: "sales-groups",
    label: "Satış grupları",
    icon: UsersThree,
    description: "Satışa sunulacak ürünlerin gruplandırılması.",
  },
  {
    id: "menus",
    label: "Menü",
    icon: ListBullets,
    description: "Ürün ve satış gruplarından oluşan menülerin yönetimi.",
  },
  {
    id: "stores",
    label: "Mağazalar",
    icon: Storefront,
    description: "Fiziksel mağazaların ve şubelerin yönetimi.",
  },
  {
    id: "digital-stores",
    label: "E-Mağazalar",
    icon: Globe,
    description: "E-ticaret mağazalarının yönetimi.",
  },
  {
    id: "food-platforms",
    label: "Sipariş platformları",
    icon: Motorcycle,
    description: "Yemek sipariş platformlarındaki satış kanallarının yönetimi.",
  },
].map((module) => ({
  ...module,
  permission: module.permission || "catalog.read",
  status: "planned",
}));
export const moduleGroups = [
  {
    id: "product-management",
    label: "Ürün Yönetimi",
    icon: Package,
    description: "Kategori, ürün ve varyant yapısını yönetin.",
    children: ["categories", "products", "variants"],
  },
  {
    id: "sales-management",
    label: "Satış Yönetimi",
    icon: ChartLine,
    description: "Fiyat, satış grubu ve menü yapısını yönetin.",
    children: ["prices", "sales-groups", "menus"],
  },
  {
    id: "channel-management",
    label: "Kanal Yönetimi",
    icon: TreeStructure,
    description: "Fiziksel ve dijital satış kanallarını yönetin.",
    children: ["stores", "digital-stores", "food-platforms"],
  },
  {
    id: "system-settings",
    label: "Sistem Ayarları",
    icon: Gear,
    description: "Kod/SKU, para birimi ve dil tanımlarını yönetin.",
    children: ["codes", "currencies", "languages"],
  },
  {
    id: "user-management",
    label: "Kullanıcı Yönetimi",
    icon: UsersThree,
    permission: "users.manage",
    description: "Ekip hesaplarını ve kullanıcı rollerini yönetin.",
    children: ["users", "user-roles"],
  },
  {
    id: "library",
    label: "Kütüphane",
    icon: Books,
    description: "Görselleri ve dokümanları tek bir kütüphanede toplayın.",
    children: ["media", "documents"],
  },
].map((group) => ({
  ...group,
  permission: group.permission || "catalog.read",
}));
export const primaryModules = [existingModules[0], ...moduleGroups];
export const modules = [
  ...existingModules,
  {
    id: "user-roles",
    label: "Kullanıcı rolleri",
    icon: ShieldCheck,
    permission: "users.manage",
    description: "Merkezi roller ve sunucuda uygulanan erişim izinleri.",
  },
  ...secondaryModules,
  ...plannedModules,
  ...moduleGroups,
];
export const moduleFor = (id) => modules.find((module) => module.id === id);
export const parentFor = (id) =>
  moduleGroups.find((group) => group.children.includes(id));
export const visibleChildren = (group, user, can) =>
  group.children
    .map(moduleFor)
    .filter((module) => module && can(user, module.permission));
export const legacyPages = {
  "Ürün yönetimi ana modülü": "product-management",
  Kategoriler: "categories",
  "Kategori yönetimi": "categories",
  "Ürün kataloğu": "products",
  "Ürün yönetimi": "products",
  "Varyant yönetimi": "variants",
  "Fiyat yönetimi": "prices",
  "Kullanıcılar ve yetkiler": "users",
  "Kullanıcı yönetimi": "user-management",
  "Kullanıcı Yönetimi": "user-management",
  Kullanıcılar: "users",
  "Kullanıcı rolleri": "user-roles",
  "Sistem Ayarları": "system-settings",
  "Sistem ayarları": "system-settings",
  Kütüphane: "library",
  Görseller: "media",
  Medya: "media",
  Ayarlar: "settings",
  "İşlem geçmişi": "settings",
  Hesabım: "account",
  "Yardım merkezi": "help",
};
