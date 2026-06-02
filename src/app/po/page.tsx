import { PoSearchClient } from "@/components/PoSearchClient";

export default function PoPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>PO Search</h1>
        <p>Search by PO number, supplier, material name, material code, PR, or cost code.</p>
      </header>
      <PoSearchClient />
    </div>
  );
}
