const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const parseIsoDate = (value) => {
    if (!ISO_DATE_RE.test(value)) {
        throw new Error("Invalid weekId format");
    }
    const [yearText, monthText, dayText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() + 1 !== month ||
        date.getUTCDate() !== day) {
        throw new Error("Invalid weekId date");
    }
    return date;
};
const formatIsoDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
export const normalizeWeekIdToMonday = (weekId) => {
    const date = parseIsoDate(weekId);
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return formatIsoDate(date);
};
