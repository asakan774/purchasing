"use client";

import Link from "next/link";
import { ChangeEvent, CompositionEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { buildQuery, money } from "./clientSearchUtils";

type WoRow = {
  wo_no: string;
  wo_date: string;
  vendor_name: string;
  department_code: string | null;
  department_name: string | null;
  project_name: string | null;
  job_name: string | null;
  contract_type: string | null;
  description: string | null;
  amount: number;
  withholding_tax: number;
  net_amount: number;
};

type WoFilters = {
  years: string[];
  departments: Array<{ value: string; label: string }>;
};

export function WoSearchClient() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [filters, setFilters] = useState<WoFilters>({ years: [], departments: [] });
  const [rows, setRows] = useState<WoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    fetch("/api/wo/filters")
      .then((response) => response.json())
      .then((payload: WoFilters) => setFilters(payload))
      .catch(() => setFilters({ years: [], departments: [] }));
  }, []);

  useEffect(() => {
    scheduleSearch(0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, department, dateFrom, dateTo, supplier]);

  function runSearch() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const query = buildQuery({ q, year, department, dateFrom, dateTo, supplier });
    fetch(`/api/wo/search?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { rows: WoRow[] }) => setRows(payload.rows ?? []))
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

  return (
    <>
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
            placeholder="WO no, vendor, project, description"
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
        <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Vendor" />
        <button type="submit">{loading ? "Loading..." : "Search"}</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>WO No</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Project</th>
              <th>Job</th>
              <th>Type</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th className="num">W/T</th>
              <th className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.wo_no}>
                <td className="mono">
                  <Link href={`/wo/${encodeURIComponent(row.wo_no)}`}>{row.wo_no}</Link>
                </td>
                <td>{row.wo_date}</td>
                <td>{row.vendor_name}</td>
                <td>{row.project_name || row.department_name}</td>
                <td>{row.job_name}</td>
                <td>{row.contract_type}</td>
                <td>{row.description}</td>
                <td className="num">{money(row.amount)}</td>
                <td className="num">{money(row.withholding_tax)}</td>
                <td className="num">{money(row.net_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
