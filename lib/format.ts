/**
 * Money is paise, as integers, everywhere except here. Format only at the
 * render boundary.
 */
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatINR(paise: number): string {
  return INR.format(paise / 100);
}

export function formatDelta(paise: number): string {
  if (paise === 0) return "included";
  const sign = paise > 0 ? "+" : "−";
  return `${sign}${INR_WHOLE.format(Math.abs(Math.round(paise / 100)))}`;
}

/** Right-aligned rupee column for the docket. Plain digits, no symbol clash. */
export function docketAmount(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function titleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function formatIST(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(d).replace(",", "") + " IST";
}
