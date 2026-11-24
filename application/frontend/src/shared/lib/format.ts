/** Local date as YYYY-MM-DD — avoids toISOString() UTC shift */
export function localIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Indian number grouping: 1,23,456.78 */
function formatIndian(num: number, decimals?: number): string {
  const fixed = decimals !== undefined ? num.toFixed(decimals) : num.toString();
  const [integerPart, decimalPart] = fixed.split('.');

  const lastThree  = integerPart.slice(-3);
  const otherPart  = integerPart.slice(0, -3);
  const grouped    = otherPart !== ''
    ? otherPart.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;

  return decimalPart !== undefined ? `${grouped}.${decimalPart}` : grouped;
}

/** Plain number — 1,23,456 */
export function fmtNum(n: number | string): string {
  return formatIndian(Number(n));
}

/** Currency with 2 decimal places — ₹1,23,456.78 */
export function fmtCurrency(n: number | string, symbol = '₹'): string {
  return `${symbol}${formatIndian(Number(n), 2)}`;
}

/** Currency rounded to whole number — ₹1,23,456 */
export function fmtCurrencyInt(n: number | string, symbol = '₹'): string {
  return `${symbol}${formatIndian(Math.round(Number(n)))}`;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Date only — DD-MMM-YYYY (e.g. 07-May-2026) */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? new Date(d + 'T00:00:00')
    : new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${pad(dt.getDate())}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
}

/** Date + time — DD-MMM-YYYY HH:MM:SS (e.g. 07-May-2026 14:05:30) */
export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? new Date(d + 'T00:00:00')
    : new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${pad(dt.getDate())}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
