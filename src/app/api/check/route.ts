import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  console.log(db);
  return NextResponse.json({ db: db });
}
