type DateErrorFactory = (message: string) => Error;

type DateValidationMessages = {
  format: string;
  calendar?: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function defaultDateError(message: string) {
  return new Error(message);
}

export function assertValidIsoDate(
  value: string,
  messages: DateValidationMessages,
  errorFactory: DateErrorFactory = defaultDateError,
) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw errorFactory(messages.format);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw errorFactory(messages.calendar ?? messages.format);
  }
}

export function addUtcDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function compareIsoDate(left: string, right: string) {
  return left.localeCompare(right);
}

export function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function timezoneOffsetMs(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return asUtc - instant.getTime();
}

export function startOfDayInTimezoneIso(
  date: string,
  timezone: string,
  messages?: DateValidationMessages,
  errorFactory?: DateErrorFactory,
) {
  if (messages) {
    assertValidIsoDate(date, messages, errorFactory);
  }
  const [year, month, day] = date.split("-").map(Number);
  const initial = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0));
  const firstGuess = new Date(initial.getTime() - timezoneOffsetMs(initial, timezone));
  const secondGuess = new Date(initial.getTime() - timezoneOffsetMs(firstGuess, timezone));
  return secondGuess.toISOString();
}

export function timeOnDateInTimezoneIso(
  date: string,
  time: string,
  timezone: string,
  messages?: DateValidationMessages,
  errorFactory?: DateErrorFactory,
) {
  if (messages) {
    assertValidIsoDate(date, messages, errorFactory);
  }
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!match) {
    const parsed = Date.parse(time);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  const hour = Number(match?.[1] ?? "6");
  const minute = Number(match?.[2] ?? "0");
  const second = Number(match?.[3] ?? "0");
  const [year, month, day] = date.split("-").map(Number);
  const localAsUtc = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hour, minute, second));
  const firstGuess = new Date(localAsUtc.getTime() - timezoneOffsetMs(localAsUtc, timezone));
  const secondGuess = new Date(localAsUtc.getTime() - timezoneOffsetMs(firstGuess, timezone));
  return secondGuess.toISOString();
}
