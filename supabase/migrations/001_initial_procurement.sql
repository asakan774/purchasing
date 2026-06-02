create extension if not exists pg_trgm;

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  import_type text not null check (import_type in ('PO', 'WO', 'VENDOR')),
  source_report text,
  file_name text not null,
  file_hash text not null,
  period_year int,
  period_month int,
  row_count int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  skipped_count int not null default 0,
  conflict_count int not null default 0,
  status text not null default 'committed' check (status in ('previewed', 'committed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  unique (import_type, file_hash)
);

create table if not exists raw_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  row_number int not null,
  source_key text not null,
  status text not null check (status in ('inserted', 'updated', 'skipped', 'conflict', 'error')),
  raw_json jsonb not null,
  error_message text,
  created_at timestamptz not null default now(),
  unique (import_batch_id, source_key)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  vendor_code text,
  supplier_name text not null,
  cheque_name text,
  tax_name text,
  business_type_code text,
  branch text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  phone text,
  fax text,
  email text,
  contact_name text,
  tax_id text,
  personal_id text,
  withholding_tax_form text,
  vat_rate numeric(8, 2),
  payment_terms_days int,
  normalized_name text generated always as (lower(regexp_replace(coalesce(supplier_name, ''), '\s+', ' ', 'g'))) stored,
  search_text text generated always as (
    lower(
      coalesce(vendor_code, '') || ' ' ||
      coalesce(supplier_name, '') || ' ' ||
      coalesce(cheque_name, '') || ' ' ||
      coalesce(tax_name, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(tax_id, '')
    )
  ) stored,
  first_import_batch_id uuid references import_batches(id),
  last_import_batch_id uuid references import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists suppliers_vendor_code_uidx
  on suppliers (vendor_code);

create index if not exists suppliers_tax_id_idx
  on suppliers (tax_id)
  where tax_id is not null and tax_id <> '';

create index if not exists suppliers_search_trgm_idx
  on suppliers using gin (search_text gin_trgm_ops);

create table if not exists supplier_product_types (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  product_type text not null,
  source text not null default 'manual' check (source in ('manual', 'derived_from_po', 'derived_from_wo')),
  created_at timestamptz not null default now(),
  unique (supplier_id, product_type)
);

create table if not exists po_documents (
  id uuid primary key default gen_random_uuid(),
  po_no text not null unique,
  po_date date not null,
  year int not null,
  pr_no text,
  supplier_id uuid references suppliers(id),
  supplier_name text not null,
  department_code text,
  department_name text,
  job_code text,
  job_name text,
  line_count int not null default 0,
  amount numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  currency text,
  search_text text generated always as (
    lower(
      coalesce(po_no, '') || ' ' ||
      coalesce(pr_no, '') || ' ' ||
      coalesce(supplier_name, '') || ' ' ||
      coalesce(department_code, '') || ' ' ||
      coalesce(department_name, '')
    )
  ) stored,
  first_import_batch_id uuid references import_batches(id),
  last_import_batch_id uuid references import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists po_documents_date_idx on po_documents (po_date desc);
create index if not exists po_documents_supplier_idx on po_documents (supplier_name);
create index if not exists po_documents_search_trgm_idx on po_documents using gin (search_text gin_trgm_ops);

create table if not exists po_items (
  id uuid primary key default gen_random_uuid(),
  po_document_id uuid references po_documents(id) on delete cascade,
  po_no text not null,
  line_no int not null,
  po_date date not null,
  year int not null,
  pr_no text,
  supplier_id uuid references suppliers(id),
  supplier_name text not null,
  department_code text,
  department_name text,
  job_code text,
  job_name text,
  ref_code text,
  vo_unit text,
  vo_unit_name text,
  delivery_date date,
  credit_term text,
  cost_code text,
  material_code text,
  material_name text not null,
  material_other text,
  unit text,
  qty numeric(14, 4) not null default 0,
  unit_price numeric(14, 4) not null default 0,
  amount numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  decrement_qty numeric(14, 4) not null default 0,
  decrement_amount numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  exchange numeric(14, 6) not null default 1,
  net_amount_po numeric(14, 2) not null default 0,
  currency text,
  saving_type text,
  saving_amount numeric(14, 2) not null default 0,
  vat_type text,
  add_by text,
  delivery_place_no text,
  delivery_place_name text,
  search_text text generated always as (
    lower(
      coalesce(po_no, '') || ' ' ||
      coalesce(pr_no, '') || ' ' ||
      coalesce(supplier_name, '') || ' ' ||
      coalesce(material_code, '') || ' ' ||
      coalesce(material_name, '') || ' ' ||
      coalesce(material_other, '') || ' ' ||
      coalesce(cost_code, '')
    )
  ) stored,
  first_import_batch_id uuid references import_batches(id),
  last_import_batch_id uuid references import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (po_no, line_no)
);

create index if not exists po_items_price_history_idx
  on po_items (material_code, po_date desc, unit_price)
  where material_code is not null and material_code <> '';

create index if not exists po_items_search_trgm_idx on po_items using gin (search_text gin_trgm_ops);
create index if not exists po_items_supplier_idx on po_items (supplier_name);

create table if not exists wo_documents (
  id uuid primary key default gen_random_uuid(),
  wo_no text not null unique,
  revise int not null default 0,
  wo_date date not null,
  year int not null,
  pr_no text,
  quotation_no text,
  quotation_date date,
  supplier_id uuid references suppliers(id),
  vendor_name text not null,
  department_code text,
  department_name text,
  project_code text,
  project_name text,
  job_code text,
  job_name text,
  ref_code text,
  sign text,
  approve_date date,
  start_date date,
  end_date date,
  contract_amount numeric(14, 2) not null default 0,
  amount numeric(14, 2) not null default 0,
  advance numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  withholding_tax numeric(14, 2) not null default 0,
  retention numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  description text,
  buyer text,
  add_user text,
  contract_type text,
  search_text text generated always as (
    lower(
      coalesce(wo_no, '') || ' ' ||
      coalesce(pr_no, '') || ' ' ||
      coalesce(quotation_no, '') || ' ' ||
      coalesce(vendor_name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(project_code, '') || ' ' ||
      coalesce(project_name, '') || ' ' ||
      coalesce(contract_type, '')
    )
  ) stored,
  first_import_batch_id uuid references import_batches(id),
  last_import_batch_id uuid references import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wo_documents_date_idx on wo_documents (wo_date desc);
create index if not exists wo_documents_vendor_idx on wo_documents (vendor_name);
create index if not exists wo_documents_search_trgm_idx on wo_documents using gin (search_text gin_trgm_ops);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suppliers_updated_at on suppliers;
create trigger suppliers_updated_at
before update on suppliers
for each row execute function set_updated_at();

drop trigger if exists po_documents_updated_at on po_documents;
create trigger po_documents_updated_at
before update on po_documents
for each row execute function set_updated_at();

drop trigger if exists po_items_updated_at on po_items;
create trigger po_items_updated_at
before update on po_items
for each row execute function set_updated_at();

drop trigger if exists wo_documents_updated_at on wo_documents;
create trigger wo_documents_updated_at
before update on wo_documents
for each row execute function set_updated_at();
