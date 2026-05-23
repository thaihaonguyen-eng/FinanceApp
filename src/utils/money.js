export const parseMoneyInput = (value) => {
  if (typeof value === 'number') return value;
  const raw = String(value || '').trim().replace(/\s/g, '');
  if (!raw) return NaN;

  const normalized = raw.replace(/[^\d.,-]/g, '');
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  let decimalSeparator = null;
  if (lastComma !== -1 && lastDot !== -1) {
    decimalSeparator = lastComma > lastDot ? ',' : '.';
  } else if (lastComma !== -1) {
    const commaCount = (normalized.match(/,/g) || []).length;
    const digitsAfter = normalized.length - lastComma - 1;
    decimalSeparator = commaCount === 1 && digitsAfter > 0 && digitsAfter <= 2 ? ',' : null;
  } else if (lastDot !== -1) {
    const dotCount = (normalized.match(/\./g) || []).length;
    const digitsAfter = normalized.length - lastDot - 1;
    decimalSeparator = dotCount === 1 && digitsAfter > 0 && digitsAfter <= 2 ? '.' : null;
  }

  const thousandSeparatorPattern = decimalSeparator === ',' ? /\./g : /,/g;
  const cleaned = decimalSeparator
    ? normalized.replace(thousandSeparatorPattern, '').replace(decimalSeparator, '.')
    : normalized.replace(/[.,]/g, '');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
};
