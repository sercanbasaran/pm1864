export function convertedPrice(value, currency, rate = 1, locale = 'tr-TR') {
  const amount = currency === 'TRY' ? Number(value) : Math.round(Number(value) * rate);
  return new Intl.NumberFormat(locale, {style:'currency', currency, ...(currency !== 'TRY' ? {minimumFractionDigits:0, maximumFractionDigits:0} : {})}).format(amount);
}
