import Link from "next/link";

type Segment = {
  label: string;
  value: string;
};

type SegmentedControlProps = {
  name: string;
  current: string;
  segments: Segment[];
  basePath: string;
  searchParams: Record<string, string>;
};

export function SegmentedControl({ name, current, segments, basePath, searchParams }: SegmentedControlProps) {
  return (
    <div className="segmented" aria-label={name}>
      {segments.map((segment) => {
        const next = new URLSearchParams(searchParams);
        next.set(name, segment.value);
        const active = current === segment.value;
        return (
          <Link
            key={segment.value}
            href={`${basePath}?${next.toString()}`}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            {segment.label}
          </Link>
        );
      })}
    </div>
  );
}
