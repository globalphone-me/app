import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, phoneNumber, price, onlyHumans, rules } = body;

    if (!name || !address || !phoneNumber || !price) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await db.addUser(
      name,
      phoneNumber,
      address,
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
