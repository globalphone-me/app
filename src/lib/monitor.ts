import * as Sentry from "@sentry/nextjs";

export const monitor = {
    // Capture an error with extra context
    error: (err: any, context?: Record<string, any>) => {
        console.error(err); // Keep console logs for Vercel/Axiom
        Sentry.captureException(err, { extra: context });
    },

    // Set the user (Call this after Wallet Connect / Login)
    setUser: (id: string, email?: string) => {
        Sentry.setUser({ id, email });
    },

    message: (message: string, context?: any) => {
        Sentry.captureMessage(message, {
            level: "info",
            extra: context
        });
    },

    // Add a breadcrumb (User did X)
    log: (message: string, data?: any) => {
        Sentry.addBreadcrumb({
            category: "app",
            message,
            data,
            level: "info",
        });
    }
};