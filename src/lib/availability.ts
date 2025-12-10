import { Availability } from "./db";

export function isUserAvailable(availability?: Availability): boolean {
    if (!availability || !availability.enabled) {
        // If availability is not set or not enabled, user is always available
        return true;
    }

    try {
        // Get current time in user's timezone
        const now = new Date();

        // We use Intl.DateTimeFormat to get the day of week and time in the user's timezone
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: availability.timezone,
            hour: "numeric",
            minute: "numeric",
            hour12: false,
        });

        const dayFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: availability.timezone,
            weekday: "long",
        });

        const currentTimeString = timeFormatter.format(now); // e.g., "14:30"
        const currentDay = dayFormatter.format(now); // e.g., "Monday"

        const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";
        const settings = isWeekend ? availability.weekends : availability.weekdays;

        if (!settings.enabled) {
            return false; // Unavailable on this type of day
        }

        // Compare times
        // We assume format is "HH:MM"
        const [currentHour, currentMinute] = currentTimeString.split(":").map(Number);
        const [startHour, startMinute] = settings.start.split(":").map(Number);
        const [endHour, endMinute] = settings.end.split(":").map(Number);

        const currentMinutes = currentHour * 60 + currentMinute;
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (error) {
        console.error("Error checking availability:", error);
        // Be conservative: if we can't check, assume available (or unavailable? let's say available to avoid blocking legitimate calls on errors)
        return true;
    }
}
