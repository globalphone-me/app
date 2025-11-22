import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Extract the new fields
    const { address, phoneNumber, price, onlyHumans, rules } = body;

    if (!address || !phoneNumber || !price) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Save everything to Redis
    await db.addUser(
      address,
      phoneNumber,
      address, // using address as name for now
      price,
      onlyHumans || false,
      rules || [],
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
