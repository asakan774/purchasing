import ExcelJS from "exceljs";
import {
  ImportPreview,
  ImportType,
  PoItemImportRow,
  SupplierImportRow,
  WoDocumentImportRow
} from "./types";

type RowObject = Record<string, unknown>;

const HEADER_ROW = 8;

export async function parseMangoWorkbook(
  buffer: ArrayBuffer,
  importType: ImportType
): Promise<
  | ImportPreview<PoItemImportRow>
  | ImportPreview<WoDocumentImportRow>
  | ImportPreview<SupplierImportRow>
> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error("Workbook has no worksheets.");
  }

  const sourceReport = cleanText(sheet.getCell(1, 1).value);

  if (importType === "PO") {
    return parsePoSheet(sheet, sourceReport);
  }
  if (importType === "WO") {
    return parseWoSheet(sheet, sourceReport);
  }
  return parseSupplierSheet(sheet, sourceReport);
}

function parsePoSheet(sheet: ExcelJS.Worksheet, sourceReport: string): ImportPreview<PoItemImportRow> {
  const headers = readHeaders(sheet);
  const rows: PoItemImportRow[] = [];
  const sourceKeys = new Set<string>();
  let duplicateRowsInFile = 0;
  let invalidRows = 0;
  let departmentCode: string | null = null;
  let departmentName: string | null = null;

  for (let rowNumber = HEADER_ROW + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = rowToObject(sheet.getRow(rowNumber), headers);
    const first = cleanText(row["P/O No."]);

    if (!first) continue;
    if (first.startsWith("Department :")) {
      const group = parseGroup(first, "Department :");
      departmentCode = group.code;
      departmentName = group.name;
      continue;
    }
    if (!first.startsWith("PO")) continue;

    const lineNo = toInt(row["Line No."]);
    const poNo = first;
    const materialName = cleanText(row["Material Name"]);
    const poDate = toIsoDate(row["P/O Date"]);
    const sourceKey = `${poNo}::${lineNo}`;

    if (!poNo || !lineNo || !materialName || !poDate) {
      invalidRows += 1;
      continue;
    }
    if (sourceKeys.has(sourceKey)) duplicateRowsInFile += 1;
    sourceKeys.add(sourceKey);

    rows.push({
      rowNumber,
      sourceKey,
      poNo,
      poDate,
      year: Number(poDate.slice(0, 4)),
      prNo: nullableText(row["PR/MR No."]),
      supplierName: cleanText(row["Vendor Name"]),
      departmentCode,
      departmentName,
      jobCode: nullableText(row["Job Code"]),
      jobName: nullableText(row["Job Name"]),
      refCode: nullableText(row["Ref.Code"]),
      deliveryDate: nullableDate(row["Deli. Date"]),
      creditTerm: nullableText(row["Cr.Term"]),
      costCode: nullableText(row["Cost Code"]),
      materialCode: nullableText(row["Material Code"]),
      materialName,
      materialOther: nullableText(row["Material Other"]),
      unit: nullableText(row["Unit"]),
      qty: toNumber(row["Qty"]),
      unitPrice: toNumber(row["Price/Unit"]),
      amount: toNumber(row["Amount"]),
      discount: toNumber(row["Discount"]),
      vat: toNumber(row["VAT"]),
      netAmount: toNumber(row["Net Amount"]),
      currency: nullableText(row["Currency"]),
      vatType: nullableText(row["Vat Type"]),
      addBy: nullableText(row["Add By"]),
      lineNo,
      deliveryPlaceName: nullableText(row["Delivery Place Name"]),
      raw: row
    });
  }

  return {
    importType: "PO",
    sourceReport,
    rows,
    stats: { parsedRows: rows.length, duplicateRowsInFile, invalidRows }
  };
}

function parseWoSheet(sheet: ExcelJS.Worksheet, sourceReport: string): ImportPreview<WoDocumentImportRow> {
  const headers = readHeaders(sheet);
  const rows: WoDocumentImportRow[] = [];
  const sourceKeys = new Set<string>();
  let duplicateRowsInFile = 0;
  let invalidRows = 0;
  let context = {
    departmentCode: null as string | null,
    departmentName: null as string | null,
    projectCode: null as string | null,
    projectName: null as string | null,
    jobCode: null as string | null,
    jobName: null as string | null
  };

  for (let rowNumber = HEADER_ROW + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = rowToObject(sheet.getRow(rowNumber), headers);
    const first = cleanText(row["Document No."]);
    const marker = Object.values(row).slice(0, 8).map(cleanText).join(" ");

    if (!first && !marker.trim()) continue;
    if (first.startsWith("Department :")) {
      const group = parseGroup(first, "Department :");
      context = {
        departmentCode: group.code,
        departmentName: group.name,
        projectCode: null,
        projectName: null,
        jobCode: null,
        jobName: null
      };
      continue;
    }
    if (first.startsWith("Project :")) {
      const group = parseGroup(first, "Project :");
      context.projectCode = group.code;
      context.projectName = group.name;
      continue;
    }
    if (first.startsWith("Job :")) {
      const group = parseGroup(first, "Job :");
      context.jobCode = group.code;
      context.jobName = group.name;
      continue;
    }
    if (marker.includes("Total ") || !first.startsWith("WO")) continue;

    const woNo = first;
    const woDate = toIsoDate(row["Document Date"]);
    if (!woNo || !woDate) {
      invalidRows += 1;
      continue;
    }
    if (sourceKeys.has(woNo)) duplicateRowsInFile += 1;
    sourceKeys.add(woNo);

    rows.push({
      rowNumber,
      sourceKey: woNo,
      woNo,
      revise: toInt(row["Revise"]),
      woDate,
      year: Number(woDate.slice(0, 4)),
      prNo: nullableText(row["PR/MR No."]),
      quotationNo: nullableText(row["Quotation No."]),
      quotationDate: nullableDate(row["Quotation Date"]),
      vendorName: cleanText(row["Vendor"]),
      ...context,
      refCode: nullableText(row["Ref.Code"]),
      sign: nullableText(row["Sign"]),
      approveDate: nullableDate(row["Approve Date"]),
      startDate: nullableDate(row["Start Date"]),
      endDate: nullableDate(row["End Date"]),
      contractAmount: toNumber(row["Contract Amount"]),
      amount: toNumber(row["Amount"]),
      advance: toNumber(row["Advance"]),
      vat: toNumber(row["VAT"]),
      withholdingTax: toNumber(row["W/T"]),
      retention: toNumber(row["Retention"]),
      netAmount: toNumber(row["Net Amount"]),
      description: nullableText(row["Description of Contract"]),
      buyer: nullableText(row["Buyer"]),
      addUser: nullableText(row["Add User"]),
      contractType: nullableText(row["Contract Type"]),
      raw: row
    });
  }

  return {
    importType: "WO",
    sourceReport,
    rows,
    stats: { parsedRows: rows.length, duplicateRowsInFile, invalidRows }
  };
}

function parseSupplierSheet(sheet: ExcelJS.Worksheet, sourceReport: string): ImportPreview<SupplierImportRow> {
  const headers = readHeaders(sheet);
  const rows: SupplierImportRow[] = [];
  const sourceKeys = new Set<string>();
  let duplicateRowsInFile = 0;
  let invalidRows = 0;

  for (let rowNumber = HEADER_ROW + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = rowToObject(sheet.getRow(rowNumber), headers);
    if (!row["No."]) continue;

    const vendorCode = cleanText(row["รหัสเจ้าหนี้/ผู้รับเงิน"]);
    const taxName = nullableText(row["ภงด."]);
    const chequeName = nullableText(row["CHQ."]);
    const supplierName = taxName || chequeName || vendorCode;

    if (!vendorCode || !supplierName) {
      invalidRows += 1;
      continue;
    }
    if (sourceKeys.has(vendorCode)) duplicateRowsInFile += 1;
    sourceKeys.add(vendorCode);

    rows.push({
      rowNumber,
      sourceKey: vendorCode,
      vendorCode,
      supplierName,
      chequeName,
      taxName,
      businessTypeCode: nullableText(row["รหัสย่อยประเภทธุรกิจ"]),
      branch: nullableText(row["Branch"]),
      addressLine1: nullableText(row["ที่อยู่ไทย"]),
      addressLine2: nullableText(row["Cust Addr2"]),
      postalCode: nullableText(row["รหัสไปรษณีย์"]),
      phone: nullableText(row["โทรศัพท์"]),
      fax: nullableText(row["โทรสาร"]),
      email: nullableText(row["Email"]),
      contactName: nullableText(row["ชื่อผู้ติดต่อ"]),
      taxId: nullableText(row["TAX ID"]),
      personalId: nullableText(row["Personal ID"]),
      withholdingTaxForm: nullableText(row["กำหนดให้พิมพ์ ภ.ง.ด."]),
      vatRate: nullableNumber(row["VAT(%)"]),
      paymentTermsDays: nullableInt(row["เงื่อนไขการชำระเงิน(วัน)"]),
      raw: row
    });
  }

  return {
    importType: "VENDOR",
    sourceReport,
    rows,
    stats: { parsedRows: rows.length, duplicateRowsInFile, invalidRows }
  };
}

function readHeaders(sheet: ExcelJS.Worksheet): string[] {
  return getRowValues(sheet.getRow(HEADER_ROW)).map(cleanText);
}

function rowToObject(row: ExcelJS.Row, headers: string[]): RowObject {
  const values = getRowValues(row);
  return headers.reduce<RowObject>((acc, header, index) => {
    acc[header] = values[index] ?? null;
    return acc;
  }, {});
}

function getRowValues(row: ExcelJS.Row): unknown[] {
  return Array.isArray(row.values) ? row.values.slice(1) : [];
}

function cleanText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return cleanText((value as { text?: unknown }).text);
  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function nullableText(value: unknown): string | null {
  const text = cleanText(value);
  return text ? text : null;
}

function toNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Number(cleanText(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  const text = cleanText(value);
  if (!text) return null;
  return toNumber(text);
}

function toInt(value: unknown): number {
  return Math.trunc(toNumber(value));
}

function nullableInt(value: unknown): number | null {
  const valueNumber = nullableNumber(value);
  return valueNumber == null ? null : Math.trunc(valueNumber);
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = cleanText(value);
  if (!text) return "";
  return text.split(" ")[0];
}

function nullableDate(value: unknown): string | null {
  const date = toIsoDate(value);
  return date ? date : null;
}

function parseGroup(value: string, prefix: string): { code: string | null; name: string | null } {
  const text = value.replace(prefix, "").trim();
  const codeFirst = text.match(/^([A-Za-z0-9_-]+)\s+\((.*?)\)\s*(.*)$/);
  if (codeFirst) {
    return {
      code: cleanText(codeFirst[1]) || null,
      name: cleanText(`${codeFirst[2]} ${codeFirst[3]}`) || null
    };
  }
  const match = text.match(/\((.*?)\)\s*(.*)/);
  if (!match) return { code: null, name: cleanText(text) || null };
  return { code: cleanText(match[1]) || null, name: cleanText(match[2]) || null };
}
