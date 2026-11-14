export const createCalendarDate = (year: number, month: number, day = 1): Date => {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
};

export const formatCalendarValue = (date: Date): string =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const parseCalendarValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if (year < 1 || year > 9999) return null;
  const date = createCalendarDate(year, month - 1, day);
  return formatCalendarValue(date) === value ? date : null;
};

export const getCalendarDays = (year: number, month: number): Date[] => {
  const first = createCalendarDate(year, month);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => createCalendarDate(year, month, index - offset + 1));
};

export const shiftCalendarMonth = (date: Date, amount: number): Date => {
  const target = createCalendarDate(date.getFullYear(), date.getMonth() + amount);
  const lastDay = createCalendarDate(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return createCalendarDate(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
};
