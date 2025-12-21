import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getTwilioUsage } from "@/lib/twilio-usage";

export async function GET() {
    const auth = await verifyAdminAccess();

    if (!auth.isAdmin) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    try {
        const [stats, twilioUsage] = await Promise.all([
            db.getAdminStats(),
            getTwilioUsage(),
        ]);

        return NextResponse.json({
            ...stats,
            twilioCost: twilioUsage.totalCost,
            twilioMinutes: twilioUsage.callMinutes,
            twilioStartDate: twilioUsage.startDate,
            twilioError: twilioUsage.error,
        });
    } catch (error) {
        console.error("Failed to fetch admin stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
