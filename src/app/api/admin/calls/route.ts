import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await verifyAdminAccess();

    if (!auth.isAdmin) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    try {
        const calls = await db.getAllCallSessionsAdmin();
        return NextResponse.json(calls);
    } catch (error) {
        console.error("Failed to fetch calls:", error);
        return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
    }
}
