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
} from "@phosphor-icons/react";
const existingModules = [
  {
    id: "overview",
    label: "Genel bakış",
    icon: SquaresFour,
    permission: "catalog.read",
  },
  {
    id: "categories",
    label: "Kategori yönetimi",
    icon: FolderSimple,
    permission: "catalog.read",
    description: "Ana kategoriler ve alt gruplar.",
  },
  {
    id: "products",
    label: "Ürün yönetimi",
    icon: Package,
    permission: "catalog.read",
    description: "Ürün bilgileri, kategoriler ve görseller.",
  },
  {
    id: "variants",
    label: "Varyant yönetimi",
    icon: Stack,
    permission: "catalog.read",
    description: "Boyut, gramaj, fiyat ve varyant durumları.",
  },
  {
    id: "codes",
    label: "Ürün kodu ve SKU yönetimi",
    icon: Barcode,
    permission: "catalog.read",
    description: "Kalıcı ürün kodları, SKU’lar ve kodlama kuralları.",
  },
  {
    id: "users",
    label: "Kullanıcı yönetimi",
    icon: UsersThree,
    permission: "users.manage",
    description: "Ekip hesapları, roller ve erişim yetkileri.",
  },
  {
    id: "media",
    label: "Medya",
    icon: Images,
    permission: "catalog.read",
    description: "Görsel yükleme, düzenleme ve ürünlerle ilişkilendirme.",
  },
];
export const secondaryModules = [
  {
    id: "prices",
    label: "Fiyat yönetimi",
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
    label: "Dijital mağazalar",
    icon: Globe,
    description: "E-ticaret mağazalarının yönetimi.",
  },
  {
    id: "food-platforms",
    label: "Yemek sipariş platformları",
    icon: Motorcycle,
    description: "Yemek sipariş platformlarındaki satış kanallarının yönetimi.",
  },
].map((module) => ({
  ...module,
  permission: "catalog.read",
  status: "planned",
}));
export const moduleGroups = [
  {
    id: "product-management",
    label: "Ürün yönetimi",
    icon: Package,
    description: "Kategori, ürün, varyant ve kod yapısını yönetin.",
    children: ["categories", "products", "variants", "codes"],
  },
  {
    id: "sales-management",
    label: "Satış yönetimi",
    icon: ChartLine,
    description: "Fiyat, satış grubu ve menü yapısını yönetin.",
    children: ["prices", "sales-groups", "menus"],
  },
  {
    id: "channel-management",
    label: "Kanal yönetimi",
    icon: TreeStructure,
    description: "Fiziksel ve dijital satış kanallarını yönetin.",
    children: ["stores", "digital-stores", "food-platforms"],
  },
].map((group) => ({ ...group, permission: "catalog.read" }));
export const primaryModules = [existingModules[0], ...moduleGroups];
export const sharedModules = existingModules.filter((module) =>
  ["users", "media"].includes(module.id),
);
export const modules = [
  ...existingModules,
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
  "Kullanıcı yönetimi": "users",
  Ayarlar: "settings",
  "İşlem geçmişi": "settings",
  Hesabım: "account",
  "Yardım merkezi": "help",
};
