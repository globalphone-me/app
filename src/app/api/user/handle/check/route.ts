import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateHandle, normalizeHandle } from "@/lib/handle";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const handle = searchParams.get("handle");

        if (!handle) {
            return NextResponse.json(
                { available: false, error: "Handle is required" },
                { status: 400 }
            );
        }

        // Validate format first
        const validation = validateHandle(handle);
        if (!validation.valid) {
            return NextResponse.json({
                available: false,
                error: validation.error,
            });
        }

        // Check if available in database
        const normalized = normalizeHandle(handle);
        const isAvailable = await db.isHandleAvailable(normalized);

        return NextResponse.json({
            available: isAvailable,
            handle: normalized,
        });
    } catch (error) {
        console.error("Handle check error:", error);
        return NextResponse.json(
            { available: false, error: "Failed to check handle" },
            { status: 500 }
        );
    }
}
