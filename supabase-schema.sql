-- ================================================
-- EKO-KOM Evidence - Supabase schema
-- Spustte tento SQL v Supabase SQL Editor
-- (Dashboard > SQL Editor > New query)
-- ================================================

-- Dodavatele
create table if not exists suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  country text default '',
  note text default '',
  created_at timestamptz default now()
);

-- Sablony obalu (kompozitni - items je JSON pole)
create table if not exists templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  supplier_id text default '__global__',
  items jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Prijmy zasilek
create table if not exists receipts (
  id uuid default gen_random_uuid() primary key,
  receipt_date date not null default current_date,
  supplier_id text,
  supplier_name text default '',
  note text default '',
  items jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Indexy pro rychle dotazy
create index if not exists idx_receipts_date on receipts (receipt_date);
create index if not exists idx_receipts_supplier on receipts (supplier_id);
create index if not exists idx_templates_supplier on templates (supplier_id);

-- Row Level Security - povolit vsem pristup (pro interni firemni pouziti)
-- Pokud chcete omezit pristup, upravte policies
alter table suppliers enable row level security;
alter table templates enable row level security;
alter table receipts enable row level security;

-- Policies - povolit anonymni pristup (pro jednoduchost)
-- Pro produkci doporucujeme pridat autentifikaci
create policy "Allow all on suppliers" on suppliers for all using (true) with check (true);
create policy "Allow all on templates" on templates for all using (true) with check (true);
create policy "Allow all on receipts" on receipts for all using (true) with check (true);
