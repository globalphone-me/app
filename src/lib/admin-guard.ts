import { cookies } from "next/headers";
import { verifySessionToken, isAdmin } from "./auth";

export interface AdminGuardResult {
    isAdmin: boolean;
    address: string | null;
    error?: string;
}

/**
 * Server-side helper to verify admin access from request cookies.
 * Use in API routes and server components.
 */
export async function verifyAdminAccess(): Promise<AdminGuardResult> {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (!token) {
        return { isAdmin: false, address: null, error: "Not authenticated" };
    }

    const session = verifySessionToken(token);

    if (!session) {
        return { isAdmin: false, address: null, error: "Invalid session" };
    }

    if (!isAdmin(session.address)) {
        return { isAdmin: false, address: session.address, error: "Not an admin" };
    }

    return { isAdmin: true, address: session.address };
}
