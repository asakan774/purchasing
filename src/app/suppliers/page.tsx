import { SupplierSearchClient } from "@/components/SupplierSearchClient";
import { canConnectSupabase, searchSuppliers } from "@/lib/search/queries";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const rows = canConnectSupabase() ? await searchSuppliers({}) : [];

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Suppliers</h1>
        <p>Search supplier code, name, phone, contact, or tax ID.</p>
      </header>
      <SupplierSearchClient initialRows={rows} />
    </div>
  );
}
