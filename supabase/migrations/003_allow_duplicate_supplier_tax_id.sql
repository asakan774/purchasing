drop index if exists suppliers_tax_id_uidx;

create index if not exists suppliers_tax_id_idx
  on suppliers (tax_id)
  where tax_id is not null and tax_id <> '';
