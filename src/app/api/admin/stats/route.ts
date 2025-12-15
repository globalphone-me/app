import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await verifyAdminAccess();

    if (!auth.isAdmin) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    try {
        const stats = await db.getAdminStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error("Failed to fetch admin stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
