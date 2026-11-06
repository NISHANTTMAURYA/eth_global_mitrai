import type { ReachPreferences } from './continuity-store';
export function nextAllowedTime(now: number, prefs: ReachPreferences): number {
  if (prefs.quietStart === prefs.quietEnd) return now;
  const hour = (time: number) =>
    Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: prefs.timezone,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(time),
    );
  const quiet = (h: number) =>
    prefs.quietStart < prefs.quietEnd
      ? h >= prefs.quietStart && h < prefs.quietEnd
      : h >= prefs.quietStart || h < prefs.quietEnd;
  let at = now;
  for (let i = 0; i < 26 * 60 && quiet(hour(at)); i++) at += 60000;
  return at;
}
