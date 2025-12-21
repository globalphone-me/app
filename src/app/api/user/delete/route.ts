import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function DELETE() {
    try {
        // 1. Get the session cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;
        const session = token ? verifySessionToken(token) : null;

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Reset the user's profile
        await db.resetProfile(session.address);

        // 3. Clear the session cookie
        cookieStore.delete("session_token");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Profile Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
