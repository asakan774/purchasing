create table if not exists po_attachments (
  id uuid primary key default gen_random_uuid(),
  po_no text not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_index int,
  created_at timestamptz not null default now()
);

create index if not exists po_attachments_po_no_idx on po_attachments(po_no);
