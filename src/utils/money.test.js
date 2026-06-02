import { parseMoneyInput, formatCurrency, getExchangeRate, convertToVND } from './money';

describe('Money Utilities', () => {
  test('parseMoneyInput should handle various formats', () => {
    expect(parseMoneyInput('1.000.000')).toBe(1000000);
    expect(parseMoneyInput('1,000,000')).toBe(1000000);
    expect(parseMoneyInput('1234.56')).toBe(1234.56);
    expect(parseMoneyInput('1234,56')).toBe(1234.56);
    expect(parseMoneyInput('abc 123')).toBe(123);
  });

  test('formatCurrency should format correctly', () => {
    expect(formatCurrency(1000000, 'VND')).toContain('1.000.000');
    expect(formatCurrency(100, 'USD')).toContain('$100.00');
  });

  test('getExchangeRate should return correct rates', () => {
    expect(getExchangeRate('VND')).toBe(1);
    expect(getExchangeRate('USD')).toBe(25400); // Default fallback
    const mockRates = { USD: 1, VND: 25000 };
    expect(getExchangeRate('USD', mockRates)).toBe(25000);
  });

  test('convertToVND should multiply correctly', () => {
    expect(convertToVND(10, 'USD', { USD: 1, VND: 25000 })).toBe(250000);
  });
});
