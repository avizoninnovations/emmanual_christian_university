const DAY = 86_400_000;

export function semesterProgress(startDate: string | undefined, endDate: string | undefined, today: number) {
  const start = startDate ? Date.parse(`${startDate}T00:00:00Z`) : NaN;
  const end = endDate ? Date.parse(`${endDate}T00:00:00Z`) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return { elapsed: 0, days: 0, percentage: 0, week: 0, weeks: 0 };
  const days = Math.ceil((end - start) / DAY) + 1;
  const elapsed = Math.max(0, Math.min(days, Math.floor((today - start) / DAY) + 1));
  return { elapsed, days, percentage: Math.round(elapsed / days * 100), week: Math.ceil(elapsed / 7), weeks: Math.ceil(days / 7) };
}
