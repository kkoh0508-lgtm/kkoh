export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value;
}
export function validState(s) {
  if (!s || !Number.isSafeInteger(s.version) || s.version < 0 || !Array.isArray(s.events) || s.events.length > 10000) return false;
  const ids = new Set();
  for (const e of s.events) {
    if (!e || typeof e.id !== 'string' || !e.id.length || e.id.length > 100 || ids.has(e.id) || !validDate(e.date) || typeof e.title !== 'string' || !e.title.trim() || e.title.length > 100 || typeof e.time !== 'string' || !/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/.test(e.time)) return false;
    ids.add(e.id);
  }
  if (!s.holidayOverrides || typeof s.holidayOverrides !== 'object' || Array.isArray(s.holidayOverrides) || Object.keys(s.holidayOverrides).length > 10000) return false;
  return Object.entries(s.holidayOverrides).every(([date, h]) => validDate(date) && h && ['public','substitute','temporary','hidden'].includes(h.type) && typeof h.name === 'string' && h.name.length <= 80 && (['hidden','temporary'].includes(h.type) || h.name.trim()));
}
