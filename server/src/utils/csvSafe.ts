// Excel/Sheets treats a cell starting with = + - @ (or tab/CR, more obscurely)
// as a formula. A vendor/PO/invoice field containing one gets evaluated on
// open — classic CSV formula/DDE injection. Prefixing with a single quote
// forces spreadsheet apps to treat it as literal text; csv-stringify still
// quotes the field normally around that.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export const csvSafe = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return FORMULA_TRIGGER.test(value) ? `'${value}` : value;
};
