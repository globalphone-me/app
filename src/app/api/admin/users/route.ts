import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await verifyAdminAccess();

    if (!auth.isAdmin) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    try {
        const users = await db.getAllUsers();
        return NextResponse.json(users);
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
