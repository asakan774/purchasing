import { WoSearchClient } from "@/components/WoSearchClient";

export default function WoPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>WO Search</h1>
        <p>Search by WO number, vendor, quotation, project, contract type, or work description.</p>
      </header>
      <WoSearchClient />
    </div>
  );
}
