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

/**
 * Returns a human-readable string for when the user will next be available
 * e.g., "in 2 hours", "tomorrow at 9:00 AM", "Monday at 9:00 AM"
 */
export function getTimeUntilAvailable(availability?: Availability): string | null {
    if (!availability || !availability.enabled) {
        return null; // Always available
    }

    try {
        const now = new Date();
        const timezone = availability.timezone;

        // Get current time info in user's timezone
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "numeric",
            minute: "numeric",
            hour12: false,
        });

        const dayFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            weekday: "long",
        });

        const currentTimeString = timeFormatter.format(now);
        const currentDay = dayFormatter.format(now);
        const [currentHour, currentMinute] = currentTimeString.split(":").map(Number);
        const currentMinutes = currentHour * 60 + currentMinute;

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDayIndex = days.indexOf(currentDay);

        // Check up to 7 days ahead
        for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
            const checkDayIndex = (currentDayIndex + daysAhead) % 7;
            const checkDay = days[checkDayIndex];
            const isWeekend = checkDay === "Saturday" || checkDay === "Sunday";
            const settings = isWeekend ? availability.weekends : availability.weekdays;

            if (!settings.enabled) continue;

            const [startHour, startMinute] = settings.start.split(":").map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const [endHour, endMinute] = settings.end.split(":").map(Number);
            const endMinutes = endHour * 60 + endMinute;

            if (daysAhead === 0) {
                // Today - check if we're before the window or after
                if (currentMinutes < startMinutes) {
                    // Before availability window - calculate hours until start
                    const minutesUntil = startMinutes - currentMinutes;
                    if (minutesUntil <= 60) {
                        return `in ${minutesUntil} min`;
                    } else {
                        const hours = Math.round(minutesUntil / 60);
                        return `in ${hours} hour${hours > 1 ? 's' : ''}`;
                    }
                } else if (currentMinutes > endMinutes) {
                    // After today's window - will be available next available day
                    continue;
                }
            } else {
                // Future day
                const minutesUntilMidnight = 24 * 60 - currentMinutes;
                const minutesFromMidnight = startMinutes;
                const totalMinutes = minutesUntilMidnight + (daysAhead - 1) * 24 * 60 + minutesFromMidnight;
                const hours = Math.round(totalMinutes / 60);

                // Format the start time nicely
                const formattedTime = `${startHour % 12 || 12}:${startMinute.toString().padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`;

                if (daysAhead === 1) {
                    return `tomorrow at ${formattedTime}`;
                } else if (hours <= 48) {
                    return `in ${hours} hours`;
                } else {
                    return `${checkDay} at ${formattedTime}`;
                }
            }
        }

        return "not available this week";
    } catch (error) {
        console.error("Error calculating next available time:", error);
        return null;
    }
}
