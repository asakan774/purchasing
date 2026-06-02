import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { money, qty } from "@/lib/format";
import { canConnectSupabase, getPoDetail } from "@/lib/search/queries";

export default async function PoDetailPage({ params }: { params: Promise<{ poNo: string }> }) {
  const { poNo } = await params;
  if (!canConnectSupabase()) notFound();

  const decodedPoNo = decodeURIComponent(poNo);
  const detail = await getPoDetail(decodedPoNo);
  const document = detail.document;
  const items = detail.items;

  if (!document && items.length === 0) notFound();

  const header = document ?? {
    po_no: decodedPoNo,
    po_date: items[0]?.po_date,
    pr_no: items[0]?.pr_no,
    supplier_name: items[0]?.supplier_name,
    department_code: items[0]?.department_code,
    department_name: items[0]?.department_name,
    line_count: items.length,
    amount: items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    vat: items.reduce((sum, item) => sum + Number(item.vat ?? 0), 0),
    net_amount: items.reduce((sum, item) => sum + Number(item.net_amount ?? 0), 0),
    currency: items[0]?.currency
  };

  return (
    <div className="page-stack">
      <div>
        <Link href="/po" className="back-link">
          <ArrowLeft size={16} />
          Back to PO Search
        </Link>
      </div>
      <header className="page-header detail-header">
        <div>
          <h1>{header.po_no}</h1>
          <p>
            {header.supplier_name} · {header.po_date} · {header.department_code}
          </p>
        </div>
        <div className="detail-total">
          <span>Net Amount</span>
          <strong>{money(header.net_amount)}</strong>
        </div>
      </header>

      <section className="summary-row">
        <Metric label="PR No" value={header.pr_no ?? "-"} mono />
        <Metric label="Lines" value={String(header.line_count ?? items.length)} />
        <Metric label="Amount" value={money(header.amount)} />
        <Metric label="VAT" value={money(header.vat)} />
        <Metric label="Currency" value={header.currency ?? "-"} />
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Material Code</th>
              <th>Material</th>
              <th>Spec</th>
              <th>Cost Code</th>
              <th className="num">Qty</th>
              <th>Unit</th>
              <th className="num">Unit Price</th>
              <th className="num">Amount</th>
              <th className="num">VAT</th>
              <th className="num">Net</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.po_no}-${item.line_no}`}>
                <td className="mono">{item.line_no}</td>
                <td className="mono">{item.material_code}</td>
                <td>{item.material_name}</td>
                <td>{item.material_other}</td>
                <td className="mono">{item.cost_code}</td>
                <td className="num">{qty(item.qty)}</td>
                <td>{item.unit}</td>
                <td className="num">{money(item.unit_price)}</td>
                <td className="num">{money(item.amount)}</td>
                <td className="num">{money(item.vat)}</td>
                <td className="num">{money(item.net_amount)}</td>
                <td>{item.delivery_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
