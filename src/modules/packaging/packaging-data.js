const names = [
  "Kırmızı XL Metal Baklava Kutusu", "Kırmızı L Metal Baklava Kutusu", "Kırmızı M Metal Baklava Kutusu", "Kırmızı S Metal Baklava Kutusu", "Kırmızı XS Metal Baklava Kutusu",
  "Kırmızı L Metal Lokum Kutusu", "Kırmızı M Metal Lokum Kutusu", "Kırmızı S Metal Lokum Kutusu", "Kırmızı S Kristal Kapak Metal Lokum Kutusu",
  "Kırmızı L Karton Lokum Kutusu", "Kırmızı M Karton Lokum Kutusu", "Kırmızı S Karton Lokum Kutusu", "Kırmızı Silindir Metal Lokum Kutusu",
];
export const defaultPackagingItems = () => names.map((name, index) => ({ id: `packaging-default-${index + 1}`, name, code: "", material: name.includes("Karton") ? "Karton" : "Metal", length: null, width: null, height: null, emptyWeight: null, description: "", active: true }));
export const isBoxVariant = (variant, types = []) => variant.typeId === "type-box" || types.some(type => type.id === variant.typeId && type.name.trim().toLocaleLowerCase("tr-TR") === "kutu");

export const isPortionVariant = (variant, types = []) => variant.typeId === "type-portion" || types.some(type => type.id === variant.typeId && type.name.trim().toLocaleLowerCase("tr-TR") === "porsiyon");
