import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  console.log("huh");
  // In a real app, add pagination here
  const users = await db.getAllUsers();
  console.log({ users });

  // Transform to match frontend expectations
  const list = users.map((u) => ({
    address: u.address,
    displayName: u.name || u.address,
    price: parseFloat(u.price),
  }));

  return NextResponse.json(list);
}
