drop index if exists suppliers_vendor_code_uidx;

create unique index if not exists suppliers_vendor_code_uidx
  on suppliers (vendor_code);
