const parseDuration = (durationObj) => {
    if (!durationObj || typeof durationObj !== 'object') return 0;

    const {
        years = 0,
        months = 0,
        days = 0,
        hours = 0,
        minutes = 0,
        seconds = 0
    } = durationObj;

    const msFromYears = years * 365.25 * 24 * 60 * 60 * 1000;
    const msFromMonths = months * 30.44 * 24 * 60 * 60 * 1000;
    const msFromDays = days * 24 * 60 * 60 * 1000;
    const msFromHours = hours * 60 * 60 * 1000;
    const msFromMinutes = minutes * 60 * 1000;
    const msFromSeconds = seconds * 1000;

    return (
        msFromYears +
        msFromMonths +
        msFromDays +
        msFromHours +
        msFromMinutes +
        msFromSeconds
    );
};

module.exports = { parseDuration };