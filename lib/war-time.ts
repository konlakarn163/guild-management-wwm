export const DEFAULT_AVAILABLE_FROM = "19:30";
export const DEFAULT_AVAILABLE_UNTIL = "22:00";
export const TIMELINE_START = "19:30";
export const TIMELINE_END = "22:00";

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const fromMinutes = (total: number) => {
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const TIME_OPTIONS = Array.from({ length: (24 - 18) * 4 }, (_, index) => fromMinutes(18 * 60 + index * 15));

export const normalizeTime = (value: string | null | undefined, fallback: string) =>
  value && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : fallback;

export const formatTimeRange = (from: string, until: string) => `${from}–${until}`;

export const getLocalDayId = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLocalTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const isAvailabilityExpired = (dayId: string, availableUntil: string, now: Date) => {
  const today = getLocalDayId(now);
  if (dayId < today) {
    return true;
  }

  return dayId === today && getLocalTime(now) >= availableUntil;
};

export const coversTimeRange = (
  availableFrom: string,
  availableUntil: string,
  rangeFrom: string,
  rangeTo: string,
) => availableFrom <= rangeFrom && availableUntil >= rangeTo;

export const getTimelinePosition = (from: string, until: string) => {
  const start = toMinutes(TIMELINE_START);
  const span = toMinutes(TIMELINE_END) - start;
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const left = clamp(((toMinutes(from) - start) / span) * 100);
  const right = clamp(((toMinutes(until) - start) / span) * 100);
  return { left, width: Math.max(0, right - left) };
};

export const getTimelineTicks = () => {
  const ticks: string[] = [];
  for (let minutes = toMinutes(TIMELINE_START); minutes <= toMinutes(TIMELINE_END); minutes += 30) {
    ticks.push(fromMinutes(minutes));
  }
  return ticks;
};
