"use client";

import Link from "next/link";
import { ChangeEvent, CompositionEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { buildQuery, money, qty } from "./clientSearchUtils";

type Mode = "po" | "item";

type PoFilters = {
  years: string[];
  departments: Array<{ value: string; label: string }>;
};

type PoDocumentRow = {
  id: string;
  po_no: string;
  po_date: string;
  pr_no: string | null;
  supplier_name: string;
  department_code: string | null;
  line_count: number;
  amount: number;
  vat: number;
  net_amount: number;
  currency: string | null;
};

type PoItemRow = {
  id: string;
  po_no: string;
  line_no: number;
  po_date: string;
  supplier_name: string;
  department_code: string | null;
  material_name: string;
  material_other: string | null;
  qty: number;
  unit: string | null;
  unit_price: number;
  net_amount: number;
};

export function PoSearchClient() {
  const [mode, setMode] = useState<Mode>("po");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [filters, setFilters] = useState<PoFilters>({ years: [], departments: [] });
  const [rows, setRows] = useState<Array<PoDocumentRow | PoItemRow>>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    fetch("/api/po/filters")
      .then((response) => response.json())
      .then((payload: PoFilters) => setFilters(payload))
      .catch(() => setFilters({ years: [], departments: [] }));
  }, []);

  useEffect(() => {
    setRows([]);
    setLoading(true);
    scheduleSearch(0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, year, department, dateFrom, dateTo, supplier]);

  function runSearch() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestMode = mode;
    setLoading(true);

    const query = buildQuery({ mode, q, year, department, dateFrom, dateTo, supplier });
    fetch(`/api/po/search?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { mode?: Mode; rows: Array<PoDocumentRow | PoItemRow> }) => {
        if (requestId !== requestIdRef.current) return;
        if (payload.mode && payload.mode !== requestMode) return;
        setRows(payload.rows ?? []);
      })
      .catch((error) => {
        if (error.name !== "AbortError" && requestId === requestIdRef.current) setRows([]);
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === requestIdRef.current) setLoading(false);
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

  return (
    <>
      <div className="segmented" aria-label="PO view mode">
        <button type="button" className={mode === "po" ? "active" : ""} onClick={() => setMode("po")}>
          By PO
        </button>
        <button type="button" className={mode === "item" ? "active" : ""} onClick={() => setMode("item")}>
          By Item
        </button>
      </div>

      <form className="filters" onSubmit={submit}>
        <label className="search-input">
          <Search size={18} />
          <input
            value={q}
            onChange={handleQChange}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={handleCompositionEnd}
            placeholder="PO no, supplier, material, PR"
          />
        </label>
        <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Year">
          <option value="">Year</option>
          {filters.years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Department">
          <option value="">Department</option>
          {filters.departments.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="Date from"
          title="Date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="Date to"
          title="Date to"
        />
        <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Supplier" />
        <button type="submit">{loading ? "Loading..." : "Search"}</button>
      </form>

      {mode === "item" ? (
        <PoItemTable rows={rows as PoItemRow[]} />
      ) : (
        <PoDocumentTable rows={rows as PoDocumentRow[]} />
      )}
    </>
  );
}

function PoDocumentTable({ rows }: { rows: PoDocumentRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>PO No</th>
            <th>Date</th>
            <th>PR No</th>
            <th>Supplier</th>
            <th>Dept</th>
            <th className="num">Lines</th>
            <th className="num">Amount</th>
            <th className="num">VAT</th>
            <th className="num">Net</th>
            <th>Currency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? `${row.po_no}-${index}`}>
              <td className="mono">
                <Link href={`/po/${encodeURIComponent(row.po_no)}`}>{row.po_no}</Link>
              </td>
              <td>{row.po_date}</td>
              <td className="mono">{row.pr_no}</td>
              <td>{row.supplier_name}</td>
              <td>{row.department_code}</td>
              <td className="num">{row.line_count}</td>
              <td className="num">{money(row.amount)}</td>
              <td className="num">{money(row.vat)}</td>
              <td className="num">{money(row.net_amount)}</td>
              <td>{row.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoItemTable({ rows }: { rows: PoItemRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>PO No</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Dept</th>
            <th>Material</th>
            <th>Spec</th>
            <th className="num">Qty</th>
            <th>Unit</th>
            <th className="num">Unit Price</th>
            <th className="num">Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? `${row.po_no}-${row.line_no}-${index}`}>
              <td className="mono">
                <Link href={`/po/${encodeURIComponent(row.po_no)}`}>{row.po_no}</Link>
              </td>
              <td>{row.po_date}</td>
              <td>{row.supplier_name}</td>
              <td>{row.department_code}</td>
              <td>{row.material_name}</td>
              <td>{row.material_other}</td>
              <td className="num">{qty(row.qty)}</td>
              <td>{row.unit}</td>
              <td className="num">{money(row.unit_price)}</td>
              <td className="num">{money(row.net_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
