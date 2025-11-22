// Shared in-memory store for payment references and verifications
// In production, this should be replaced with a proper database

interface PaymentReference {
  recipientAddress: string;
  amount: string;
  createdAt: number;
  verifiedNullifier?: string; // Link to verification
}

interface Verification {
  nullifierHash: string;
  action: string;
  verificationLevel: string;
  createdAt: number;
}

// Use global scope to persist across Next.js hot reloads in development
const globalForPayments = globalThis as unknown as {
  paymentReferences: Map<string, PaymentReference> | undefined;
  verifications: Map<string, Verification> | undefined;
};

export const paymentReferences =
  globalForPayments.paymentReferences ?? new Map<string, PaymentReference>();

export const verifications =
  globalForPayments.verifications ?? new Map<string, Verification>();

if (process.env.NODE_ENV !== 'production') {
  globalForPayments.paymentReferences = paymentReferences;
  globalForPayments.verifications = verifications;
}

// Clean up old references periodically
export function cleanupOldReferences() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of paymentReferences.entries()) {
    if (value.createdAt < fiveMinutesAgo) {
      paymentReferences.delete(key);
    }
  }
}

// Clean up old verifications (expire after 5 minutes)
export function cleanupOldVerifications() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of verifications.entries()) {
    if (value.createdAt < fiveMinutesAgo) {
      verifications.delete(key);
    }
  }
}