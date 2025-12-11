"use client";

/**
 * Safely checks if running inside World App without logging errors.
 * 
 * The MiniKit.isInstalled() method logs console errors when not running
 * in World App, which clutters the console and Sentry. This helper
 * checks for the World App context silently.
 */
export function isWorldApp(): boolean {
    if (typeof window === "undefined") return false;

    // Check for World App's injected MiniKit on window
    // This is the same check MiniKit.isInstalled() does internally,
    // but without the console.error logging
    return !!(window as unknown as { MiniKit?: unknown }).MiniKit;
}
