export type ImportType = "PO" | "WO" | "VENDOR";

export type ImportStatus = "new" | "existing" | "conflict" | "error";

export type ImportPreview<T> = {
  importType: ImportType;
  sourceReport: string;
  rows: T[];
  stats: {
    parsedRows: number;
    duplicateRowsInFile: number;
    invalidRows: number;
  };
};

export type PoItemImportRow = {
  rowNumber: number;
  sourceKey: string;
  poNo: string;
  poDate: string;
  year: number;
  prNo: string | null;
  supplierName: string;
  departmentCode: string | null;
  departmentName: string | null;
  jobCode: string | null;
  jobName: string | null;
  refCode: string | null;
  deliveryDate: string | null;
  creditTerm: string | null;
  costCode: string | null;
  materialCode: string | null;
  materialName: string;
  materialOther: string | null;
  unit: string | null;
  qty: number;
  unitPrice: number;
  amount: number;
  discount: number;
  vat: number;
  netAmount: number;
  currency: string | null;
  vatType: string | null;
  addBy: string | null;
  lineNo: number;
  deliveryPlaceName: string | null;
  raw: Record<string, unknown>;
};

export type WoDocumentImportRow = {
  rowNumber: number;
  sourceKey: string;
  woNo: string;
  revise: number;
  woDate: string;
  year: number;
  prNo: string | null;
  quotationNo: string | null;
  quotationDate: string | null;
  vendorName: string;
  departmentCode: string | null;
  departmentName: string | null;
  projectCode: string | null;
  projectName: string | null;
  jobCode: string | null;
  jobName: string | null;
  refCode: string | null;
  sign: string | null;
  approveDate: string | null;
  startDate: string | null;
  endDate: string | null;
  contractAmount: number;
  amount: number;
  advance: number;
  vat: number;
  withholdingTax: number;
  retention: number;
  netAmount: number;
  description: string | null;
  buyer: string | null;
  addUser: string | null;
  contractType: string | null;
  raw: Record<string, unknown>;
};

export type SupplierImportRow = {
  rowNumber: number;
  sourceKey: string;
  vendorCode: string;
  supplierName: string;
  chequeName: string | null;
  taxName: string | null;
  businessTypeCode: string | null;
  branch: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  contactName: string | null;
  taxId: string | null;
  personalId: string | null;
  withholdingTaxForm: string | null;
  vatRate: number | null;
  paymentTermsDays: number | null;
  raw: Record<string, unknown>;
};
