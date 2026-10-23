export const roles = [
  {
    id: "admin",
    name: "Yönetici",
    description: "Katalog, kullanıcılar ve sistem ayarları üzerinde tam yetki.",
    permissions: [
      "catalog.read",
      "categories.write",
      "products.write",
      "prices.write",
      "media.write",
      "settings.write",
      "users.manage",
    ],
  },
  {
    id: "editor",
    name: "Editör",
    description:
      "Kategori, ürün, varyant, fiyat ve kütüphane görsellerini düzenler; kullanıcıları yönetemez.",
    permissions: [
      "catalog.read",
      "categories.write",
      "products.write",
      "prices.write",
      "media.write",
    ],
  },
  {
    id: "viewer",
    name: "Görüntüleyici",
    description:
      "Kataloğu, kütüphane görsellerini ve işlem geçmişini yalnızca görüntüler.",
    permissions: ["catalog.read"],
  },
];
export const permissionLabels = {
  "catalog.read": "Kataloğu görüntüleme",
  "categories.write": "Kategori yönetimi",
  "products.write": "Ürün yönetimi",
  "prices.write": "Fiyat düzenleme",
  "media.write": "Görsel yönetimi",
  "settings.write": "Sistem ayarları",
  "users.manage": "Kullanıcı ve yetki yönetimi",
};
export const roleFor = (id) => roles.find((r) => r.id === id);
export const can = (user, permission) =>
  !!roleFor(user?.role)?.permissions.includes(permission);
