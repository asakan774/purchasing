import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type SearchParams = {
  q?: string;
  year?: string;
  department?: string;
  supplier?: string;
  category?: string;
  mode?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function searchPoDocuments(params: SearchParams) {
  const supabase = createServiceClient();
  let query = supabase
    .from("po_documents")
    .select(
      "id,po_no,po_date,year,pr_no,supplier_name,department_code,department_name,job_code,job_name,line_count,amount,vat,net_amount,currency"
    )
    .order("po_date", { ascending: false })
    .order("po_no", { ascending: false })
    .limit(200);

  if (params.q) query = query.ilike("search_text", `%${params.q.toLowerCase()}%`);
  if (params.year) query = query.eq("year", Number(params.year));
  if (params.department) query = query.eq("department_code", params.department);
  if (params.supplier) query = query.ilike("supplier_name", `%${params.supplier}%`);
  if (params.dateFrom) query = query.gte("po_date", params.dateFrom);
  if (params.dateTo) query = query.lte("po_date", params.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function searchPoItems(params: SearchParams) {
  const supabase = createServiceClient();
  let query = supabase
    .from("po_items")
    .select(
      "id,po_no,line_no,po_date,year,pr_no,supplier_name,department_code,department_name,cost_code,material_code,material_name,material_other,unit,qty,unit_price,amount,vat,net_amount"
    )
    .order("po_date", { ascending: false })
    .order("po_no", { ascending: false })
    .limit(200);

  if (params.q) query = query.ilike("search_text", `%${params.q.toLowerCase()}%`);
  if (params.year) query = query.eq("year", Number(params.year));
  if (params.department) query = query.eq("department_code", params.department);
  if (params.supplier) query = query.ilike("supplier_name", `%${params.supplier}%`);
  if (params.category) query = query.ilike("cost_code", `%${params.category}%`);
  if (params.dateFrom) query = query.gte("po_date", params.dateFrom);
  if (params.dateTo) query = query.lte("po_date", params.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPoDetail(poNo: string) {
  const supabase = createServiceClient();
  const [documentResult, itemResult] = await Promise.all([
    supabase
      .from("po_documents")
      .select(
        "id,po_no,po_date,year,pr_no,supplier_name,department_code,department_name,job_code,job_name,line_count,amount,vat,net_amount,currency"
      )
      .eq("po_no", poNo)
      .maybeSingle(),
    supabase
      .from("po_items")
      .select(
        "id,po_no,line_no,po_date,pr_no,supplier_name,department_code,department_name,cost_code,material_code,material_name,material_other,unit,qty,unit_price,amount,discount,vat,net_amount,currency,vat_type,add_by,delivery_date,delivery_place_name"
      )
      .eq("po_no", poNo)
      .order("line_no", { ascending: true })
  ]);

  if (documentResult.error) throw documentResult.error;
  if (itemResult.error) throw itemResult.error;

  return {
    document: documentResult.data,
    items: itemResult.data ?? []
  };
}

export const getPoFilterOptions = unstable_cache(async () => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("po_items")
    .select("year,department_code,department_name")
    .order("year", { ascending: false })
    .limit(10000);

  if (error) throw error;

  const years = new Set<string>();
  const departments = new Map<string, string>();

  for (const row of data ?? []) {
    if (row.year) years.add(String(row.year));
    if (row.department_code) {
      departments.set(
        row.department_code,
        row.department_name ? `${row.department_code} - ${row.department_name}` : row.department_code
      );
    }
  }

  return {
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    departments: [...departments.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value))
  };
}, ["po-filter-options"], { revalidate: 60 });

export async function searchWoDocuments(params: SearchParams & { contractType?: string }) {
  const supabase = createServiceClient();
  let query = supabase
    .from("wo_documents")
    .select(
      "id,wo_no,wo_date,year,pr_no,quotation_no,vendor_name,department_code,department_name,project_code,project_name,job_code,job_name,contract_type,description,amount,vat,withholding_tax,retention,net_amount"
    )
    .order("wo_date", { ascending: false })
    .order("wo_no", { ascending: false })
    .limit(200);

  if (params.q) query = query.ilike("search_text", `%${params.q.toLowerCase()}%`);
  if (params.year) query = query.eq("year", Number(params.year));
  if (params.department) query = query.eq("department_code", params.department);
  if (params.supplier) query = query.ilike("vendor_name", `%${params.supplier}%`);
  if (params.contractType) query = query.eq("contract_type", params.contractType);
  if (params.dateFrom) query = query.gte("wo_date", params.dateFrom);
  if (params.dateTo) query = query.lte("wo_date", params.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export const getWoFilterOptions = unstable_cache(async () => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wo_documents")
    .select("year,department_code,department_name")
    .order("year", { ascending: false })
    .limit(10000);

  if (error) throw error;

  const years = new Set<string>();
  const departments = new Map<string, string>();

  for (const row of data ?? []) {
    if (row.year) years.add(String(row.year));
    if (row.department_code) {
      departments.set(
        row.department_code,
        row.department_name ? `${row.department_code} - ${row.department_name}` : row.department_code
      );
    }
  }

  return {
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    departments: [...departments.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value))
  };
}, ["wo-filter-options"], { revalidate: 60 });

export async function getWoDetail(woNo: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wo_documents")
    .select(
      "id,wo_no,revise,wo_date,year,pr_no,quotation_no,quotation_date,vendor_name,department_code,department_name,project_code,project_name,job_code,job_name,ref_code,sign,approve_date,start_date,end_date,contract_amount,amount,advance,vat,withholding_tax,retention,net_amount,description,buyer,add_user,contract_type"
    )
    .eq("wo_no", woNo)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function searchSuppliers(params: SearchParams) {
  const supabase = createServiceClient();
  let query = supabase
    .from("suppliers")
    .select(
      "id,vendor_code,supplier_name,cheque_name,tax_name,phone,email,contact_name,tax_id,address_line1,address_line2,payment_terms_days,vat_rate"
    )
    .order("vendor_code", { ascending: true })
    .limit(200);

  if (params.q) query = query.ilike("search_text", `%${params.q.toLowerCase()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function searchPriceReference(params: SearchParams) {
  const supabase = createServiceClient();
  let query = supabase
    .from("po_items")
    .select("id,po_no,line_no,po_date,supplier_name,material_code,material_name,material_other,unit,qty,unit_price,amount,cost_code")
    .order("po_date", { ascending: false })
    .limit(200);

  if (params.q) query = query.ilike("search_text", `%${params.q.toLowerCase()}%`);
  if (params.year) query = query.eq("year", Number(params.year));
  if (params.category) query = query.ilike("cost_code", `%${params.category}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function canConnectSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
