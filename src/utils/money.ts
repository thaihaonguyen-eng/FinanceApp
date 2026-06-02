export const parseMoneyInput = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value;
  const raw = String(value || '').trim().replace(/\s/g, '');
  if (!raw) return NaN;

  const normalized = raw.replace(/[^\d.,-]/g, '');
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  let decimalSeparator: string | null = null;
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

export const formatCurrency = (amount: number, currency: string = 'VND'): string => {
  if (currency === 'VND') {
    return amount.toLocaleString('vi-VN') + 'đ';
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: currency,
  });
};

export const getExchangeRate = (currency: string | undefined, exchangeRates?: Record<string, number>): number => {
  if (!currency || currency === 'VND') return 1;
  if (exchangeRates && exchangeRates[currency] && exchangeRates['VND']) {
    return exchangeRates['VND'] / exchangeRates[currency];
  }
  // Fallback rates
  switch (currency) {
    case 'USD': return 25400;
    case 'EUR': return 27500;
    case 'JPY': return 165;
    default: return 1;
  }
};

export const convertToVND = (amount: number, currency: string | undefined, exchangeRates?: Record<string, number>): number => {
  return amount * getExchangeRate(currency, exchangeRates);
};
