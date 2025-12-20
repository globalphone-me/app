import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address)
    return NextResponse.json({ error: "Address required" }, { status: 400 });

  const user = await db.getByAddress(address);

  if (!user) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  // 1. Check if the requester is the owner
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  const session = token ? verifySessionToken(token) : null;

  const isOwner =
    session && session.address.toLowerCase() === user.address.toLowerCase();

  // 2. Only return private data (phoneNumber) if isOwner is true

  // Return public profile data + found status
  return NextResponse.json({
    found: true,
    user: {
      address: user.address,
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
