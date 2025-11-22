import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload, nonce } = body;

    // Verify we have the required fields
    if (!payload || payload.status !== 'success') {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Get the stored nonce from cookie
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get('siwe-nonce')?.value;

    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 400 }
      );
    }

    // Verify the signature
    const isValid = await verifyMessage({
      address: payload.address as `0x${string}`,
      message: payload.message,
      signature: payload.signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Clear the used nonce
    cookieStore.delete('siwe-nonce');

    // Create authenticated session
    // Store user session (you can use your preferred session management here)
    cookieStore.set('wallet-address', payload.address, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      address: payload.address,
    });
  } catch (error) {
    console.error('SIWE verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}