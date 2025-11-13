export function parseDeadlineToTimestamp(input: string): number {
    const now = Math.floor(Date.now() / 1000);

    // Try duration: "1 week", "3 days", etc.
    const durationRegex = /(\d+)\s*(second|minute|hour|day|week|month)s?/i;
    const durationMatch = input.match(durationRegex);
    if (durationMatch) {
        const value = parseInt(durationMatch[1], 10);
        const unit = durationMatch[2].toLowerCase();
        const unitSeconds: Record<string, number> = {
            second: 1,
            minute: 60,
            hour: 3600,
            day: 86400,
            week: 604800,
            month: 2592000 // approx 30 days
        };
        return now + value * (unitSeconds[unit] || 0);
    }

    // Try date: "3 August 2025", "2025-08-03", etc.
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000);
    }

    throw new Error("Invalid deadline format. Use '1 week', '3 days', or a date like '3 August 2025'.");
}