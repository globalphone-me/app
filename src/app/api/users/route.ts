import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  // In a real app, add pagination here
  const users = await db.getAllUsers();

  // Transform to match frontend expectations
  const list = users.map((u) => ({
    address: u.address,
    displayName: u.name || u.address,
    bio: u.bio || "",
    price: parseFloat(u.price),
    onlyHumans: u.onlyHumans || false,
    availability: u.availability,
    avatarUrl: u.avatarUrl,
  }));

  return NextResponse.json(list);
}
