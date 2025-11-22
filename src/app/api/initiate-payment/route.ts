import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { paymentReferences, verifications, cleanupOldReferences } from '@/lib/payment-store';

interface InitiatePaymentRequest {
  recipientAddress: string;
  amount: string;
  verifiedNullifier: string;
}

export async function POST(req: NextRequest) {
  try {
    const { recipientAddress, amount, verifiedNullifier } = await req.json() as InitiatePaymentRequest;

    if (!recipientAddress || !amount || !verifiedNullifier) {
      return NextResponse.json(
        { error: 'Missing recipientAddress, amount, or verifiedNullifier' },
        { status: 400 }
      );
    }

    // Check if the user has been verified
    const verification = verifications.get(verifiedNullifier);

    if (!verification) {
      console.log('[DEBUG] Verification not found for nullifier:', verifiedNullifier);
      console.log('[DEBUG] Available verifications:', Array.from(verifications.keys()));
      return NextResponse.json(
        { error: 'User not verified. Please verify your humanity first.' },
        { status: 403 }
      );
    }

    // Check if verification is still valid (not expired)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (verification.createdAt < fiveMinutesAgo) {
      verifications.delete(verifiedNullifier);
      return NextResponse.json(
        { error: 'Verification expired. Please verify again.' },
        { status: 403 }
      );
    }

    // Generate unique reference ID
    const id = randomUUID().replace(/-/g, '');

    // Store reference with metadata, linked to verification
    paymentReferences.set(id, {
      recipientAddress,
      amount,
      createdAt: Date.now(),
      verifiedNullifier,
    });

    // Clean up old references
    cleanupOldReferences();

    console.log('[DEBUG] Payment reference created:', id);
    console.log('[DEBUG] Linked to verification:', verifiedNullifier);
    console.log('[DEBUG] Total references in store:', paymentReferences.size);

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}