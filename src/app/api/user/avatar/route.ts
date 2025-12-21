import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { uploadAvatarToR2 } from "@/lib/r2";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const session = verifySessionToken(token);
        if (!session) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Parse the request body (expecting base64 image data)
        const body = await req.json();
        const { imageData, contentType } = body;

        if (!imageData || !contentType) {
            return NextResponse.json(
                { error: "Missing imageData or contentType" },
                { status: 400 }
            );
        }

        // Validate content type
        if (!["image/png", "image/jpeg", "image/jpg"].includes(contentType)) {
            return NextResponse.json(
                { error: "Invalid image type. Only PNG and JPEG are allowed." },
                { status: 400 }
            );
        }

        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Check size (max 2MB after base64 decode, ~1.5MB actual)
        if (imageBuffer.length > 2 * 1024 * 1024) {
            return NextResponse.json(
                { error: "Image too large. Maximum size is 2MB." },
                { status: 400 }
            );
        }

        // Get user to use their ID (not address, which may change in the future)
        const user = await db.getByAddress(session.address);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Upload to R2 using user ID
        const avatarUrl = await uploadAvatarToR2(
            imageBuffer,
            contentType,
            user.id
        );

        // Update user's avatar URL in database
        await db.updateUserAvatar(session.address, avatarUrl);

        return NextResponse.json({
            success: true,
            avatarUrl,
        });
    } catch (error) {
        console.error("Avatar upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload avatar" },
            { status: 500 }
        );
    }
}
