import type { Booking } from "./tipos";

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => isoDate(new Date());

const minutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};

export function availableTimes(
  date: string,
  duration: number,
  bookings: Booking[],
  open: number,
  close: number,
  days: number[],
) {
  if (!date || date < today() || !days.includes(new Date(`${date}T12:00:00`).getDay())) return [];
  const result: string[] = [];
  const now = new Date();
  for (let start = open * 60; start + duration <= close * 60; start += 30) {
    if (date === today() && start <= now.getHours() * 60 + now.getMinutes()) continue;
    if (
      bookings.some(
        (b) =>
          b.date === date &&
          !["Cancelado", "Não compareceu"].includes(b.status) &&
          start < minutes(b.time) + b.duration &&
          start + duration > minutes(b.time),
      )
    )
      continue;
    result.push(
      `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
    );
  }
  return result;
}
