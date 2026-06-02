export function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value.trim();
    if (trimmed) query.set(key, trimmed);
  }
  return query.toString();
}

export function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function qty(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}
