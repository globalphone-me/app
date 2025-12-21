import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { isEthereumAddress } from "@/lib/handle";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Support both ?address= and ?identifier= for backward compatibility
  const identifier = searchParams.get("identifier") || searchParams.get("address");

  if (!identifier)
    return NextResponse.json({ error: "Identifier required" }, { status: 400 });

  // Detect if identifier is an Ethereum address or a handle
  let user;
  if (isEthereumAddress(identifier)) {
    user = await db.getByAddress(identifier);
  } else {
    // Treat as handle
    user = await db.getByHandle(identifier);
  }

  if (!user) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  // Check if the requester is the owner
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  const session = token ? verifySessionToken(token) : null;

  const isOwner =
    session && session.address.toLowerCase() === user.address.toLowerCase();

  // Return public profile data + found status
  return NextResponse.json({
    found: true,
    user: {
      address: user.address,
      handle: user.handle,
      phoneNumber: isOwner ? user.realPhoneNumber : undefined,
      price: user.price,
      name: user.name,
      onlyHumans: user.onlyHumans,
      rules: user.rules,
      availability: user.availability,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    },
  });
}
