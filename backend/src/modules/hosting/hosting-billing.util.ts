import { BillingCycle } from '@prisma/client';

/** Contract term → number of months. No discount: price = monthly × months. */
export const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

/** Human-friendly label for the "Contract Period" display. */
export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
};

/** Add whole months to a date (clamps to end-of-month, e.g. Jan 31 + 1mo → Feb 28). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getMonth() + months;
  const result = new Date(d.getTime());
  result.setMonth(targetMonth);
  // If the day overflowed into the next month (e.g. Jan 31 → Mar 3), clamp back.
  if (result.getDate() !== d.getDate()) {
    result.setDate(0);
  }
  return result;
}

/** Expiry = start date + the term's months. */
export function computeExpiry(start: Date, cycle: BillingCycle): Date {
  return addMonths(start, BILLING_CYCLE_MONTHS[cycle]);
}
