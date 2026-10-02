import { AppError } from '../../shared/errors/index.js';

// ISO 4217 currencies supported by MDL 2. Explicit minor-unit exponents, never a global /100.
export const currencyDigits = {
  BRL: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  CHF: 2,
  JPY: 0,
  CLP: 0,
  KRW: 0,
  KWD: 3,
  BHD: 3,
} as const;
export type Currency = keyof typeof currencyDigits;
export interface Money {
  amountMinor: bigint;
  currency: Currency;
}
export const maxMinor = 9223372036854775807n;
export function money(amount: string, currency: string, positive = true): Money {
  if (!Object.hasOwn(currencyDigits, currency) || !/^-?(0|[1-9]\d*)$/.test(amount))
    throw new AppError('VALIDATION_ERROR');
  const amountMinor = BigInt(amount);
  if (amountMinor > maxMinor || amountMinor < -maxMinor || (positive && amountMinor <= 0n))
    throw new AppError('VALIDATION_ERROR');
  return { amountMinor, currency: currency as Currency };
}
export function name(value: string) {
  const result = value.trim();
  if (!result || result.length > 100) throw new AppError('VALIDATION_ERROR');
  return result;
}
export function dateRange(from?: string, to?: string) {
  if (
    (from && !Number.isFinite(Date.parse(from))) ||
    (to && !Number.isFinite(Date.parse(to))) ||
    (from && to && Date.parse(from) >= Date.parse(to))
  )
    throw new AppError('VALIDATION_ERROR');
}
