import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Get the session cookie set by /api/complete-siwe
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    const session = token ? verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, handle, address, phoneNumber, price, onlyHumans, rules, availability, bio } = body;

    if (!name || !address || !phoneNumber || !price) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 2. Verify ownership: Ensure the authenticated user is modifying their own profile
    if (session.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: "Forbidden: You can only update your own profile" },
        { status: 403 },
      );
    }

    await db.addUser(
      name,
      phoneNumber,
      address,
      price,
      onlyHumans || false,
      rules || [],
      availability,
      bio,
      handle,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
