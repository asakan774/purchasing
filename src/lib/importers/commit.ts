import { createServiceClient } from "@/lib/supabase/server";
import { sha256Buffer } from "./fileHash";
import { parseMangoWorkbook } from "./mangoWorkbook";
import { ImportType, PoItemImportRow, SupplierImportRow, WoDocumentImportRow } from "./types";

export async function commitImport(file: File, importType: ImportType) {
  const buffer = await file.arrayBuffer();
  const parsed = await parseMangoWorkbook(buffer, importType);
  const fileHash = await sha256Buffer(buffer);
  const supabase = createServiceClient();
  const existingKeys = await fetchExistingKeys(importType, parsed.rows.map((row) => row.sourceKey));

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .upsert(
      {
        import_type: importType,
        source_report: parsed.sourceReport,
        file_name: file.name,
        file_hash: fileHash,
        period_year: inferYear(parsed.rows as Array<{ year?: number }>),
        period_month: inferMonth(parsed.rows as Array<{ poDate?: string; woDate?: string }>),
        row_count: parsed.rows.length,
        status: "committed"
      },
      { onConflict: "import_type,file_hash" }
    )
    .select("id")
    .single();

  if (batchError) throw batchError;
  const batchId = batch.id as string;

  if (importType === "PO") {
    await commitPoRows(batchId, parsed.rows as PoItemImportRow[], existingKeys);
  } else if (importType === "WO") {
    await commitWoRows(batchId, parsed.rows as WoDocumentImportRow[], existingKeys);
  } else {
    await commitSupplierRows(batchId, parsed.rows as SupplierImportRow[], existingKeys);
  }

  const updatedCount = parsed.rows.filter((row) => existingKeys.has(row.sourceKey)).length;
  const insertedCount = parsed.rows.length - updatedCount;

  await supabase
    .from("import_batches")
    .update({
      inserted_count: insertedCount,
      updated_count: updatedCount,
      skipped_count: 0,
      conflict_count: parsed.stats.duplicateRowsInFile
    })
    .eq("id", batchId);

  return {
    importType,
    batchId,
    sourceReport: parsed.sourceReport,
    fileName: file.name,
    fileHash,
    stats: parsed.stats
  };
}

async function commitSupplierRows(batchId: string, rows: SupplierImportRow[], existingKeys: Set<string>) {
  const supabase = createServiceClient();
  const payload = rows.map((row) => toSupplierPayload(row, batchId));
  const inserts = payload.filter((row) => !existingKeys.has(row.vendor_code));
  const updates = payload.filter((row) => existingKeys.has(row.vendor_code));

  if (inserts.length) {
    const { error } = await supabase.from("suppliers").insert(inserts);
    if (error) throw error;
  }

  for (const row of updates) {
    const { vendor_code: vendorCode, first_import_batch_id: _firstImportBatchId, ...update } = row;
    const { error } = await supabase.from("suppliers").update(update).eq("vendor_code", vendorCode);
    if (error) throw error;
  }

  await writeRawRows(batchId, rows, existingKeys);
}

function toSupplierPayload(row: SupplierImportRow, batchId: string) {
  return {
    vendor_code: row.vendorCode,
    supplier_name: row.supplierName,
    cheque_name: row.chequeName,
    tax_name: row.taxName,
    business_type_code: row.businessTypeCode,
    branch: row.branch,
    address_line1: row.addressLine1,
    address_line2: row.addressLine2,
    postal_code: row.postalCode,
    phone: row.phone,
    fax: row.fax,
    email: row.email,
    contact_name: row.contactName,
    tax_id: row.taxId,
    personal_id: row.personalId,
    withholding_tax_form: row.withholdingTaxForm,
    vat_rate: row.vatRate,
    payment_terms_days: row.paymentTermsDays,
    first_import_batch_id: batchId,
    last_import_batch_id: batchId
  };
}

async function commitPoRows(batchId: string, rows: PoItemImportRow[], existingKeys: Set<string>) {
  const supabase = createServiceClient();
  const documents = new Map<string, PoDocumentAggregate>();

  for (const row of rows) {
    const current =
      documents.get(row.poNo) ??
      ({
        po_no: row.poNo,
        po_date: row.poDate,
        year: row.year,
        pr_no: row.prNo,
        supplier_name: row.supplierName,
        department_code: row.departmentCode,
        department_name: row.departmentName,
        job_code: row.jobCode,
        job_name: row.jobName,
        line_count: 0,
        amount: 0,
        vat: 0,
        net_amount: 0,
        currency: row.currency,
        first_import_batch_id: batchId,
        last_import_batch_id: batchId
      } satisfies PoDocumentAggregate);
    current.line_count += 1;
    current.amount += row.amount;
    current.vat += row.vat;
    current.net_amount += row.netAmount;
    documents.set(row.poNo, current);
  }

  const { data: savedDocuments, error: docError } = await supabase
    .from("po_documents")
    .upsert(
      [...documents.values()].map((doc) => ({
        ...doc,
        amount: roundMoney(doc.amount),
        vat: roundMoney(doc.vat),
        net_amount: roundMoney(doc.net_amount)
      })),
      { onConflict: "po_no" }
    )
    .select("id,po_no");
  if (docError) throw docError;

  const documentIds = new Map((savedDocuments ?? []).map((doc) => [doc.po_no, doc.id]));
  const itemPayload = rows.map((row) => ({
    po_document_id: documentIds.get(row.poNo),
    po_no: row.poNo,
    line_no: row.lineNo,
    po_date: row.poDate,
    year: row.year,
    pr_no: row.prNo,
    supplier_name: row.supplierName,
    department_code: row.departmentCode,
    department_name: row.departmentName,
    job_code: row.jobCode,
    job_name: row.jobName,
    ref_code: row.refCode,
    delivery_date: row.deliveryDate,
    credit_term: row.creditTerm,
    cost_code: row.costCode,
    material_code: row.materialCode,
    material_name: row.materialName,
    material_other: row.materialOther,
    unit: row.unit,
    qty: row.qty,
    unit_price: row.unitPrice,
    amount: row.amount,
    discount: row.discount,
    vat: row.vat,
    net_amount: row.netAmount,
    currency: row.currency,
    vat_type: row.vatType,
    add_by: row.addBy,
    delivery_place_name: row.deliveryPlaceName,
    first_import_batch_id: batchId,
    last_import_batch_id: batchId
  }));

  const { error: itemError } = await supabase.from("po_items").upsert(itemPayload, {
    onConflict: "po_no,line_no"
  });
  if (itemError) throw itemError;
  await writeRawRows(batchId, rows, existingKeys);
}

async function commitWoRows(batchId: string, rows: WoDocumentImportRow[], existingKeys: Set<string>) {
  const supabase = createServiceClient();
  const payload = rows.map((row) => ({
    wo_no: row.woNo,
    revise: row.revise,
    wo_date: row.woDate,
    year: row.year,
    pr_no: row.prNo,
    quotation_no: row.quotationNo,
    quotation_date: row.quotationDate,
    vendor_name: row.vendorName,
    department_code: row.departmentCode,
    department_name: row.departmentName,
    project_code: row.projectCode,
    project_name: row.projectName,
    job_code: row.jobCode,
    job_name: row.jobName,
    ref_code: row.refCode,
    sign: row.sign,
    approve_date: row.approveDate,
    start_date: row.startDate,
    end_date: row.endDate,
    contract_amount: row.contractAmount,
    amount: row.amount,
    advance: row.advance,
    vat: row.vat,
    withholding_tax: row.withholdingTax,
    retention: row.retention,
    net_amount: row.netAmount,
    description: row.description,
    buyer: row.buyer,
    add_user: row.addUser,
    contract_type: row.contractType,
    first_import_batch_id: batchId,
    last_import_batch_id: batchId
  }));

  const { error } = await supabase.from("wo_documents").upsert(payload, { onConflict: "wo_no" });
  if (error) throw error;
  await writeRawRows(batchId, rows, existingKeys);
}

async function writeRawRows(
  batchId: string,
  rows: Array<{ rowNumber: number; sourceKey: string; raw: Record<string, unknown> }>,
  existingKeys: Set<string>
) {
  const supabase = createServiceClient();
  const payload = rows.map((row) => ({
    import_batch_id: batchId,
    row_number: row.rowNumber,
    source_key: row.sourceKey,
    status: existingKeys.has(row.sourceKey) ? "updated" : "inserted",
    raw_json: row.raw
  }));
  const { error } = await supabase.from("raw_import_rows").upsert(payload, {
    onConflict: "import_batch_id,source_key"
  });
  if (error) throw error;
}

async function fetchExistingKeys(importType: ImportType, keys: string[]) {
  const supabase = createServiceClient();
  if (keys.length === 0) return new Set<string>();

  if (importType === "PO") {
    const poNumbers = [...new Set(keys.map((key) => key.split("::")[0]))];
    const { data, error } = await supabase
      .from("po_items")
      .select("po_no,line_no")
      .in("po_no", poNumbers);
    if (error) throw error;
    return new Set((data ?? []).map((row) => `${row.po_no}::${row.line_no}`));
  }

  if (importType === "WO") {
    const { data, error } = await supabase.from("wo_documents").select("wo_no").in("wo_no", keys);
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.wo_no));
  }

  const { data, error } = await supabase.from("suppliers").select("vendor_code").in("vendor_code", keys);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.vendor_code));
}

type PoDocumentAggregate = {
  po_no: string;
  po_date: string;
  year: number;
  pr_no: string | null;
  supplier_name: string;
  department_code: string | null;
  department_name: string | null;
  job_code: string | null;
  job_name: string | null;
  line_count: number;
  amount: number;
  vat: number;
  net_amount: number;
  currency: string | null;
  first_import_batch_id: string;
  last_import_batch_id: string;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function inferYear(rows: Array<{ year?: number }>) {
  return rows.find((row) => row.year)?.year ?? null;
}

function inferMonth(rows: Array<{ poDate?: string; woDate?: string }>) {
  const value = rows.find((row) => row.poDate || row.woDate);
  const date = value?.poDate ?? value?.woDate;
  return date ? Number(date.slice(5, 7)) : null;
}
