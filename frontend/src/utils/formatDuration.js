module.exports = function formatDuration(duration) {
    let parts = [];

    if (duration.years) parts.push(`${duration.years} year${duration.years > 1 ? 's' : ''}`);
    if (duration.months) parts.push(`${duration.months} month${duration.months > 1 ? 's' : ''}`);
    if (duration.days) parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
    if (duration.hours) parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
    if (duration.minutes) parts.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
    if (duration.seconds) parts.push(`${duration.seconds} second${duration.seconds > 1 ? 's' : ''}`);

    return parts.join(' ');
}