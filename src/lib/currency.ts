// Currency utilities

import { CURRENCIES } from '../types';

export const currencySymbols: Record<string, string> = CURRENCIES.reduce((acc, c) => {
  acc[c.value] = c.symbol;
  return acc;
}, {} as Record<string, string>);

export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  const symbol = currencySymbols[currency] || currency;
  const formatter = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatter.format(amount)}`;
}

export function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency] || currency;
}
