create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key,
  display_name text,
  default_split numeric(5, 2) default 0.5,
  created_at timestamptz default now()
);

do $$ begin
  create type transaction_type as enum ('EXPENSE', 'INCOME', 'LIQUIDATION');
exception
  when duplicate_object then null;
end $$;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null,
  amount numeric(12, 2) not null,
  category text,
  date date not null,
  note text,
  type transaction_type not null,
  created_at timestamptz default now()
);

create table if not exists transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade,
  user_id uuid not null,
  amount numeric(12, 2) not null
);

create or replace view user_consumed as
select
  user_id,
  sum(amount) as total_consumed
from transaction_splits
group by user_id;

create or replace view user_paid as
select
  payer_id as user_id,
  sum(amount) as total_paid
from transactions
group by payer_id;

create or replace view user_net_balance as
select
  coalesce(user_paid.user_id, user_consumed.user_id) as user_id,
  coalesce(user_paid.total_paid, 0) - coalesce(user_consumed.total_consumed, 0) as net_balance
from user_paid
full join user_consumed on user_paid.user_id = user_consumed.user_id;
