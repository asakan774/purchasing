create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  full_name text,
  password_hash text not null,
  password_salt text not null,
  password_iterations int not null default 210000,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_active_idx
  on app_users (is_active, username);
