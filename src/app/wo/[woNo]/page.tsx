import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { money } from "@/lib/format";
import { canConnectSupabase, getWoDetail } from "@/lib/search/queries";

export const runtime = "edge";

export default async function WoDetailPage({ params }: { params: Promise<{ woNo: string }> }) {
  const { woNo } = await params;
  if (!canConnectSupabase()) notFound();

  const decodedWoNo = decodeURIComponent(woNo);
  const document = await getWoDetail(decodedWoNo);
  if (!document) notFound();

  return (
    <div className="page-stack">
      <div>
        <Link href="/wo" className="back-link">
          <ArrowLeft size={16} />
          Back to WO Search
        </Link>
      </div>

      <header className="page-header detail-header">
        <div>
          <h1>{document.wo_no}</h1>
          <p>
            {document.vendor_name} · {document.wo_date} · {document.contract_type}
          </p>
        </div>
        <div className="detail-total">
          <span>Net Amount</span>
          <strong>{money(document.net_amount)}</strong>
        </div>
      </header>

      <section className="summary-row">
        <Metric label="PR No" value={document.pr_no ?? "-"} mono />
        <Metric label="Quotation" value={document.quotation_no ?? "-"} mono />
        <Metric label="Amount" value={money(document.amount)} />
        <Metric label="VAT" value={money(document.vat)} />
        <Metric label="W/T" value={money(document.withholding_tax)} />
      </section>

      <section className="detail-grid">
        <DetailItem label="Vendor" value={document.vendor_name} />
        <DetailItem label="Project" value={document.project_name || document.department_name || "-"} />
        <DetailItem label="Job" value={document.job_name || "-"} />
        <DetailItem label="Department" value={formatCodeName(document.department_code, document.department_name)} />
        <DetailItem label="Ref Code" value={document.ref_code || "-"} />
        <DetailItem label="Sign" value={document.sign || "-"} />
        <DetailItem label="Approve Date" value={document.approve_date || "-"} />
        <DetailItem label="Start Date" value={document.start_date || "-"} />
        <DetailItem label="End Date" value={document.end_date || "-"} />
        <DetailItem label="Contract Amount" value={money(document.contract_amount)} />
        <DetailItem label="Advance" value={money(document.advance)} />
        <DetailItem label="Retention" value={money(document.retention)} />
        <DetailItem label="Buyer" value={document.buyer || "-"} />
        <DetailItem label="Add User" value={document.add_user || "-"} />
        <DetailItem label="Quotation Date" value={document.quotation_date || "-"} />
      </section>

      <section className="description-panel">
        <span>Description of Contract</span>
        <p>{document.description || "-"}</p>
      </section>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={mono ? "mono" : ""}>{value}</strong>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCodeName(code: string | null, name: string | null) {
  return [code, name].filter(Boolean).join(" - ") || "-";
}
