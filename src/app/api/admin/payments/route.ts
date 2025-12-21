import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await verifyAdminAccess();

    if (!auth.isAdmin) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    try {
        const payments = await db.getAllPaymentsAdmin();
        return NextResponse.json(payments);
    } catch (error) {
        console.error("Failed to fetch payments:", error);
        return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await verifyAdminAccess();

    if (!auth.isAdmin) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { paymentId, status } = body;

        if (!paymentId || !status) {
            return NextResponse.json({ error: "paymentId and status required" }, { status: 400 });
        }

        if (!["HELD", "FORWARDED", "REFUNDED", "STUCK"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        await db.updatePaymentStatus(paymentId, status);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update payment:", error);
        return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
    }
}
