import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('Missing JWT_SECRET environment variable');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(jwtSecret);

    try {
      const { payload } = await jwtVerify(token, secret);

      // Token is valid - return call session info
      return NextResponse.json({
        success: true,
        message: 'Call authorized - payment verified!',
        callSession: {
          reference: payload.reference,
          caller: payload.callerAddress,
          recipient: payload.recipientAddress,
          amount: payload.amount,
          transactionHash: payload.transactionHash,
          transactionStatus: payload.transactionStatus,
        },
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in call endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}