import { sourceFor } from './localization-service.js';
// Only publish current translations belonging to this card; never expose the cache.
export function cardLocalization(doc, kind, id) {
  const languages = (doc.languages || []).filter(l => l.active);
  const translations = {};
  let sourceHash;
  try { sourceHash = sourceFor(doc, kind, id).sourceHash; } catch {}
  for (const item of Object.values(doc.localization?.translations || {})) {
    if (item.kind === kind && String(item.recordId) === String(id) && item.sourceHash === sourceHash && languages.some(l => l.code === item.language)) {
      translations[item.language] = Object.fromEntries(['name','description','ingredients','allergens','servingSuggestion','storageConditions','longTermStorage'].filter(k => typeof item.fields?.[k] === 'string').map(k => [k,item.fields[k]]));
    }
  }
  return {
    languages: languages.map(({code,name,nativeName}) => ({code,name,nativeName})),
    currencies: (doc.currencies || []).filter(c => c.active).map(({code,name}) => ({code,name})),
    translations,
    rates: (doc.localization?.rates?.entries || []).filter(r => Number.isFinite(r.rate) && r.rate > 0).map(({currency,rate,date}) => ({currency,rate,date})),
  };
}
