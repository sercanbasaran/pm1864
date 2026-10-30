export const storeStatuses = ["Aktif", "Pasif", "Hazırlık Aşamasında"];
export const storeFields = [
  ["country", "Ülke", 100, true],
  ["city", "Şehir", 100, true],
  ["district", "İlçe / Bölge", 100, true],
  ["address", "Tam adres", 1000, true],
  ["phone", "Telefon", 80, false],
  ["openingHours", "Çalışma saatleri", 300, false],
  ["storeType", "Mağaza tipi", 100, true],
  ["notes", "Bilgi notu", 2000, false],
];
export function validateStore(value) {
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 100
  )
    return "Mağaza adı 1–100 karakter olmalıdır.";
  for (const [key, label, max, required] of storeFields) {
    const v = value[key];
    if (
      (v !== undefined && typeof v !== "string") ||
      (required && !v?.trim()) ||
      v?.length > max
    )
      return `${label} alanını kontrol edin (en fazla ${max} karakter).`;
  }
  if (
    value.code !== undefined &&
    value.code !== "" &&
    (typeof value.code !== "string" || !/^[A-Z0-9-]{1,80}$/.test(value.code))
  )
    return "Mağaza kodu büyük harf, rakam ve tireden oluşmalıdır (en fazla 80 karakter).";
  if (!storeStatuses.includes(value.status))
    return "Geçerli mağaza durumu seçin.";
  if (
    value.phone &&
    (!/^[+\d\s().-]+$/.test(value.phone) ||
      value.phone.replace(/\D/g, "").length < 7)
  )
    return "Telefonu uluslararası ülke koduyla girin veya bilgi yoksa boş bırakın.";
  if (
    !Array.isArray(value.services) ||
    value.services.length > 50 ||
    value.services.some(
      (s) => typeof s !== "string" || !s.trim() || s.length > 120,
    ) ||
    new Set(value.services.map((s) => s.trim().toLocaleLowerCase("tr-TR")))
      .size !== value.services.length
  )
    return "Hizmetleri kontrol edin; en fazla 50 farklı hizmet girilebilir.";
  return "";
}
export const storeNameKey = (name) =>
  String(name || "")
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/^hafız\s+mustafa\s*1864\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
export function storeCode(name, records, exceptId) {
  const slug =
    String(name)
      .replace(/^Hafız\s+Mustafa\s*1864\s*/i, "")
      .replaceAll("ı", "i")
      .replaceAll("İ", "I")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 65) || "MAGAZA";
  const base = "HM-" + slug;
  let code = base,
    n = 2;
  while (records.some((r) => r.id !== exceptId && r.code === code))
    code = base + "-" + n++;
  return code;
}
export const newStore = () => ({
  name: "",
  code: "",
  country: "",
  city: "",
  district: "",
  address: "",
  phone: "",
  openingHours: "",
  storeType: "",
  status: "Aktif",
  active: true,
  services: [],
  notes: "",
  description: "",
  images: [],
});
