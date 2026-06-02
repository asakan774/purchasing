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
