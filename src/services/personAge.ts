import { parseCalendarValue } from "@/src/services/calendar";
import type { Person } from "@/src/types/family";

const dateFormatter = new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

const currentDate = (): string => {
  const parts = dateFormatter.formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const getPersonAge = (person: Pick<Person, "birthDate" | "deathDate" | "deathPlace">, today = currentDate()): number | null => {
  const birth = parseCalendarValue(person.birthDate ?? "");
  // A recorded death without a date cannot produce an accurate age at death.
  if (!birth || (person.deathPlace && !person.deathDate)) return null;
  const end = parseCalendarValue(person.deathDate || today);
  if (!end || end < birth) return null;
  const birthdayPending = end.getMonth() < birth.getMonth() || (end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate());
  return end.getFullYear() - birth.getFullYear() - (birthdayPending ? 1 : 0);
};


export const getPersonAgeLabel = (person: Pick<Person, "birthDate" | "deathDate" | "deathPlace">, today = currentDate()): string | null => {
  const years = getPersonAge(person, today);
  if (years === null) return null;
  if (years > 0) return `${years} th`;
  const birth = parseCalendarValue(person.birthDate!)!;
  const end = parseCalendarValue(person.deathDate || today)!;
  const months = (end.getFullYear() - birth.getFullYear()) * 12 + end.getMonth() - birth.getMonth() - (end.getDate() < birth.getDate() ? 1 : 0);
  if (months > 0) return `${months} bln`;
  // Date-only UTC values keep the day count independent of daylight saving changes.
  const dayStamp = (date: Date) => {
    const utc = new Date(0);
    utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    utc.setUTCHours(0, 0, 0, 0);
    return utc.getTime();
  };
  const days = Math.round((dayStamp(end) - dayStamp(birth)) / 86400000);
  return `${days} hari`;
};
