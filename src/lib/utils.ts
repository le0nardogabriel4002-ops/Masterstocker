import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EXCHANGE_RATE_USD_VES = 36.50; // Tasa de cambio ejemplo

export function formatCurrency(amount: number) {
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const ves = new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
  }).format(amount * EXCHANGE_RATE_USD_VES);

  return { usd, ves };
}

export function formatCurrencyString(amount: number) {
  const { usd, ves } = formatCurrency(amount);
  return `${usd} / ${ves}`;
}
