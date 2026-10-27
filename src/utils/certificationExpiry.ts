/**
 * Pure functions for Skill Passport and certification expiry verification.
 */

export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired';

export interface CertificationExpiryResult {
  status: CertificationStatus;
  daysRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  formattedExpiry: string;
}

/**
 * Checks certification status against a reference date (defaults to current date).
 * Flags as expiring_soon if remaining days <= 30 and >= 0.
 */
export function checkCertificationStatus(
  expiryDateStr: string,
  referenceDate: Date = new Date()
): CertificationExpiryResult {
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      status: 'expired',
      daysRemaining: -999,
      isExpiringSoon: false,
      isExpired: true,
      formattedExpiry: 'Invalid Date',
    };
  }

  // Zero out time part for day comparison
  const expDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const refDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const diffMs = expDay.getTime() - refDay.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30;

  let status: CertificationStatus = 'valid';
  if (isExpired) {
    status = 'expired';
  } else if (isExpiringSoon) {
    status = 'expiring_soon';
  }

  const formattedExpiry = expiry.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return {
    status,
    daysRemaining,
    isExpiringSoon,
    isExpired,
    formattedExpiry,
  };
}
