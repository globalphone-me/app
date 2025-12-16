import Twilio from "twilio";
import { db as drizzleDb } from "./drizzle";
import { callSessions } from "./schema";
import { asc } from "drizzle-orm";

/**
 * Fetches Twilio usage/costs from the earliest call in our database to now.
 */
export async function getTwilioUsage(): Promise<{
    totalCost: string;
    callMinutes: number;
    startDate: string | null;
    error?: string;
}> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;

    if (!accountSid || !apiKey || !apiSecret) {
        return { totalCost: "0", callMinutes: 0, startDate: null, error: "Twilio credentials not configured" };
    }

    try {
        // Get the earliest call from our database
        const [earliestCall] = await drizzleDb
            .select({ createdAt: callSessions.createdAt })
            .from(callSessions)
            .orderBy(asc(callSessions.createdAt))
            .limit(1);

        if (!earliestCall?.createdAt) {
            return { totalCost: "0", callMinutes: 0, startDate: null };
        }

        const startDate = earliestCall.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD format

        // Create Twilio client with API Key authentication
        const client = Twilio(apiKey, apiSecret, { accountSid });

        // Fetch usage records for calls from startDate to today
        const usageRecords = await client.usage.records.list({
            category: "calls",
            startDate: new Date(startDate),
            endDate: new Date(),
        });

        let totalCost = 0;
        let totalMinutes = 0;

        for (const record of usageRecords) {
            totalCost += parseFloat(record.price.toString() || "0");
            // Usage is in minutes for calls category
            totalMinutes += parseFloat(record.usage || "0");
        }

        return {
            totalCost: totalCost.toFixed(2),
            callMinutes: Math.round(totalMinutes),
            startDate,
        };
    } catch (error) {
        console.error("Failed to fetch Twilio usage:", error);
        return {
            totalCost: "0",
            callMinutes: 0,
            startDate: null,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
