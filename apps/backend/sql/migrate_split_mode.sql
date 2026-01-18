begin;

do $$ begin
  create type split_mode as enum ('custom', 'none', 'owed');
exception
  when duplicate_object then null;
end $$;

alter table transactions
  add column if not exists beneficiary_id bigint,
  add column if not exists split_mode split_mode not null default 'custom';

with split_stats as (
  select
    transaction_id,
    count(*) as split_count,
    max(user_id) as only_user_id
  from transaction_splits
  group by transaction_id
)
update transactions
set
  split_mode = case
    when transactions.type = 'INCOME' then 'none'
    when transactions.type = 'EXPENSE' and coalesce(split_stats.split_count, 0) > 1 then 'custom'
    when transactions.type = 'EXPENSE' and coalesce(split_stats.split_count, 0) = 1
      and split_stats.only_user_id <> transactions.payer_id then 'owed'
    when transactions.type = 'EXPENSE' then 'none'
    when transactions.type = 'LIQUIDATION' then 'none'
    else transactions.split_mode
  end,
  beneficiary_id = case
    when transactions.type = 'INCOME' then transactions.payer_id
    when transactions.type = 'EXPENSE' and coalesce(split_stats.split_count, 0) = 1
      and split_stats.only_user_id <> transactions.payer_id
      then split_stats.only_user_id
    when transactions.type = 'LIQUIDATION' and coalesce(split_stats.split_count, 0) = 1
      then split_stats.only_user_id
    else transactions.beneficiary_id
  end
from split_stats
where split_stats.transaction_id = transactions.id;

update transactions
set
  split_mode = case
    when transactions.type = 'INCOME' then 'none'
    when transactions.type = 'EXPENSE' then 'none'
    when transactions.type = 'LIQUIDATION' then 'none'
    else transactions.split_mode
  end,
  beneficiary_id = case
    when transactions.type = 'INCOME' then transactions.payer_id
    else transactions.beneficiary_id
  end
where transactions.id not in (select transaction_id from transaction_splits);

delete from transaction_splits
using transactions
where transactions.id = transaction_splits.transaction_id
  and not (transactions.type = 'EXPENSE' and transactions.split_mode = 'custom');

drop view if exists user_net_balance;
drop view if exists user_paid;
drop view if exists user_consumed;

create or replace view user_paid as
select
  payer_id as user_id,
  sum(amount) as total_paid
from transactions
where type in ('EXPENSE', 'LIQUIDATION')
group by payer_id;

create or replace view user_consumed as
select
  user_id,
  sum(amount) as total_consumed
from (
  select
    transaction_splits.user_id,
    transaction_splits.amount
  from transaction_splits
  join transactions on transactions.id = transaction_splits.transaction_id
  where transactions.type = 'EXPENSE' and transactions.split_mode = 'custom'
  union all
  select
    transactions.beneficiary_id as user_id,
    transactions.amount
  from transactions
  where transactions.type = 'EXPENSE' and transactions.split_mode = 'owed'
  union all
  select
    transactions.payer_id as user_id,
    transactions.amount
  from transactions
  where transactions.type = 'EXPENSE' and transactions.split_mode = 'none'
  union all
  select
    transactions.beneficiary_id as user_id,
    transactions.amount
  from transactions
  where transactions.type = 'LIQUIDATION'
) consumption
where user_id is not null
group by user_id;

create or replace view user_net_balance as
select
  coalesce(user_paid.user_id, user_consumed.user_id) as user_id,
  coalesce(user_paid.total_paid, 0) - coalesce(user_consumed.total_consumed, 0) as net_balance
from user_paid
full join user_consumed on user_paid.user_id = user_consumed.user_id;

commit;
