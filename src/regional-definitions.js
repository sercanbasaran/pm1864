// Imported from sercanbasaran/hm1864 settings/languages.json and regions.json.
export const defaultCurrencies = () => [
  ["USD", "Amerikan doları"], ["GBP", "İngiliz sterlini"], ["TRY", "Türk lirası"],
  ["AED", "Birleşik Arap Emirlikleri dirhemi"], ["EUR", "Euro"],
  ["DKK", "Danimarka kronu"], ["SEK", "İsveç kronu"], ["CNY", "Çin yuanı"], ["JPY", "Japon yeni"],
].map(([code, name]) => ({code, name, active:true}));
export const defaultLanguages = () => [
  ["tr", "Türkçe", "Türkçe"], ["en", "İngilizce", "English"], ["ar", "Arapça", "العربية"],
  ["de", "Almanca", "Deutsch"], ["fr", "Fransızca", "Français"], ["it", "İtalyanca", "Italiano"],
  ["es", "İspanyolca", "Español"], ["ru", "Rusça", "Русский"], ["zh-CN", "Basitleştirilmiş Çince", "简体中文"],
  ["ja", "Japonca", "日本語"], ["hi", "Hintçe", "हिन्दी"], ["ur", "Urduca", "اردو"],
  ["fa", "Farsça", "فارسی"], ["pt", "Portekizce", "Português"],
].map(([code,name,nativeName]) => ({code,name,nativeName,active:true}));
export const defaultRegionalDefinitions = () => ({currencies:defaultCurrencies(),languages:defaultLanguages(),defaultCurrency:"TRY",defaultLanguage:"tr",regionalDefinitionsVersion:1});
export function upgradeRegionalDefinitions(doc) {
  if (doc.regionalDefinitionsVersion === 1) return false;
  for (const [key, defaults] of [["currencies",defaultCurrencies()], ["languages",defaultLanguages()]]) {
    doc[key] ||= [];
    for (const item of defaults) if (!doc[key].some(existing => existing.code === item.code)) doc[key].push(item);
  }
  doc.defaultCurrency ||= "TRY"; doc.defaultLanguage ||= "tr";
  doc.regionalDefinitionsVersion = 1;
  return true;
}
