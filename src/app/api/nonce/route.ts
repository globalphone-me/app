import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Generate a secure random nonce (must be at least 8 alphanumeric characters)
  const nonce = crypto.randomUUID().replace(/-/g, '');

  // Store nonce in a secure, httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 5, // 5 minutes
  });

  return NextResponse.json({ nonce });
}