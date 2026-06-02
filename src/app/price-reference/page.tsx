import { PriceReferenceClient } from "@/components/PriceReferenceClient";

export default function PriceReferencePage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>PO Price Reference</h1>
        <p>Use PO item history to compare latest, minimum, maximum, and average unit prices.</p>
      </header>
      <PriceReferenceClient />
    </div>
  );
}
