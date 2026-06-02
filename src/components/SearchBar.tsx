"use client";

import { Children, cloneElement, FormEvent, isValidElement, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type SearchBarProps = {
  action: string;
  placeholder: string;
  yearOptions?: string[];
  children?: React.ReactNode;
};

export function SearchBar({ action, placeholder, yearOptions, children }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [year, setYear] = useState(() => searchParams.get("year") ?? "");

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (form.contains(document.activeElement)) return;

    setQ(searchParams.get("q") ?? "");
    setYear(searchParams.get("year") ?? "");
  }, [searchParams]);

  function updateUrl() {
    const form = formRef.current;
    if (!form) return;

    const next = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      const text = String(value).trim();
      if (text) next.set(key, text);
    }

    const query = next.toString();
    router.replace(query ? `${action}?${query}` : action, { scroll: false });
  }

  function scheduleUpdate(delay = 700) {
    if (isComposingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(updateUrl, delay);
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.name === "q") setQ(target.value);
    if (target.name === "year") setYear(target.value);
    scheduleUpdate();
  }

  function handleChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    scheduleUpdate(0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateUrl();
  }

  const hydratedChildren = Children.map(children, (child) => {
    if (!isValidElement<{ name?: string; defaultValue?: string }>(child)) return child;
    const name = child.props.name;
    if (!name) return child;
    return cloneElement(child, {
      defaultValue: child.props.defaultValue ?? searchParams.get(name) ?? ""
    });
  });

  return (
    <form
      ref={formRef}
      className="filters"
      action={action}
      onChange={handleChange}
      onInput={handleInput}
      onSubmit={handleSubmit}
    >
      <label className="search-input">
        <Search size={18} />
        <input
          name="q"
          placeholder={placeholder}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            setQ(event.currentTarget.value);
            scheduleUpdate();
          }}
        />
      </label>
      {yearOptions?.length ? (
        <select name="year" defaultValue={searchParams.get("year") ?? ""} aria-label="Year">
          <option value="">Year</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      ) : (
        <input
          name="year"
          placeholder="Year"
          inputMode="numeric"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
      )}
      {hydratedChildren}
      <button type="submit">Search</button>
    </form>
  );
}
