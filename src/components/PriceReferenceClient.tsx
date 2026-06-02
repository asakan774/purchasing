"use client";

import { ChangeEvent, CompositionEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { buildQuery, money, qty } from "./clientSearchUtils";

type PriceRow = {
  id: string;
  po_no: string;
  line_no: number;
  po_date: string;
  supplier_name: string;
  material_code: string | null;
  material_name: string;
  material_other: string | null;
  unit: string | null;
  qty: number;
  unit_price: number;
  amount: number;
  cost_code: string | null;
};

export function PriceReferenceClient() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    scheduleSearch(0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, category]);

  function runSearch() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const query = buildQuery({ q, year, category });
    fetch(`/api/price-reference/search?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { rows: PriceRow[] }) => setRows(payload.rows ?? []))
      .catch((error) => {
        if (error.name !== "AbortError") setRows([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }

  function scheduleSearch(delay = 300) {
    if (composingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, delay);
  }

  function handleQChange(event: ChangeEvent<HTMLInputElement>) {
    setQ(event.target.value);
    scheduleSearch();
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    composingRef.current = false;
    setQ(event.currentTarget.value);
    scheduleSearch(0);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    scheduleSearch(0);
  }

  const prices = rows.map((row) => Number(row.unit_price ?? 0)).filter((value) => value > 0);
  const latest = rows[0];
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0;

  return (
    <>
      <form className="filters price-filters" onSubmit={submit}>
        <label className="search-input">
          <Search size={18} />
          <input
            value={q}
            onChange={handleQChange}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={handleCompositionEnd}
            placeholder="Material code or material name"
          />
        </label>
        <input value={year} onChange={(event) => setYear(event.target.value)} placeholder="Year" inputMode="numeric" />
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Cost code" />
        <button type="submit">{loading ? "Loading..." : "Search"}</button>
      </form>

      <div className="summary-row">
        <Metric label="Records" value={rows.length.toLocaleString("th-TH")} />
        <Metric label="Latest" value={latest ? money(latest.unit_price) : "0.00"} />
        <Metric label="Min" value={money(min)} />
        <Metric label="Avg" value={money(avg)} />
        <Metric label="Max" value={money(max)} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Spec</th>
              <th>PO No</th>
              <th>Date</th>
              <th>Supplier</th>
              <th className="num">Qty</th>
              <th>Unit</th>
              <th className="num">Unit Price</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.po_no}-${row.line_no}`}>
                <td>{row.material_name}</td>
                <td>{row.material_other}</td>
                <td className="mono">{row.po_no}</td>
                <td>{row.po_date}</td>
                <td>{row.supplier_name}</td>
                <td className="num">{qty(row.qty)}</td>
                <td>{row.unit}</td>
                <td className="num">{money(row.unit_price)}</td>
                <td className="num">{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
