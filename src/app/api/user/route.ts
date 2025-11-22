import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address)
    return NextResponse.json({ error: "Address required" }, { status: 400 });

  const user = await db.getByAddress(address);

  if (!user) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  // Return public profile data + found status
  return NextResponse.json({
    found: true,
    user: {
      address: user.address,
      phoneNumber: user.realPhoneNumber,
      price: user.price,
      name: user.name,
    },
  });
}
