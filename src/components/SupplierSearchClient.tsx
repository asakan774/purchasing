"use client";

import { ChangeEvent, CompositionEvent, FormEvent, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

type SupplierRow = {
  id: string;
  vendor_code: string | null;
  supplier_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  payment_terms_days: number | null;
};

type SupplierSearchClientProps = {
  initialRows: SupplierRow[];
};

export function SupplierSearchClient({ initialRows }: SupplierSearchClientProps) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);

  function runSearch(nextQuery: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(async () => {
      const params = new URLSearchParams();
      const trimmed = nextQuery.trim();
      if (trimmed) params.set("q", trimmed);

      const response = await fetch(`/api/suppliers/search?${params.toString()}`, {
        signal: controller.signal
      });

      if (!response.ok) return;
      const payload = (await response.json()) as { rows: SupplierRow[] };
      setRows(payload.rows);
    });
  }

  function scheduleSearch(nextQuery: string, delay = 250) {
    if (composingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(nextQuery), delay);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setQ(next);
    scheduleSearch(next);
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    composingRef.current = false;
    const next = event.currentTarget.value;
    setQ(next);
    scheduleSearch(next, 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(q);
  }

  return (
    <>
      <form className="filters supplier-filters" onSubmit={handleSubmit}>
        <label className="search-input">
          <Search size={18} />
          <input
            value={q}
            onChange={handleChange}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={handleCompositionEnd}
            placeholder="Supplier, phone, contact, tax ID"
          />
        </label>
        <button type="submit">{isPending ? "Searching..." : "Search"}</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Tax ID</th>
              <th>Payment</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.vendor_code}</td>
                <td>{row.supplier_name}</td>
                <td>{row.contact_name}</td>
                <td>{row.phone}</td>
                <td>{row.email}</td>
                <td className="mono">{row.tax_id}</td>
                <td>{row.payment_terms_days ? `${row.payment_terms_days} days` : ""}</td>
                <td>{[row.address_line1, row.address_line2].filter(Boolean).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
