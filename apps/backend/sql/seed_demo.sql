-- Demo seed data for screenshots and local development (safe to rerun).
-- This wipes existing rows in the app tables and inserts a consistent dataset.

begin;

truncate changes, transaction_splits, transactions, profiles, categories restart identity cascade;

insert into categories (label, icon, is_default) values
  ('Groceries', 'cart', true),
  ('Rent', 'home', true),
  ('Utilities', 'bolt', true),
  ('Restaurants', 'cart', true),
  ('Transport', 'car', true),
  ('Health', 'health', true),
  ('Entertainment', 'media', true),
  ('Travel', 'car', true),
  ('Shopping', 'bag', true),
  ('Subscriptions', 'box', true),
  ('Salary', 'briefcase', true),
  ('Freelance', 'briefcase', true),
  ('Gifts', 'gift', true),
  ('Pets', 'paw', true),
  ('Education', 'book', true),
  ('Insurance', 'shield', true),
  ('Home', 'home', true),
  ('Kids', 'smile', true),
  ('Taxes', 'receipt', true),
  ('Other', 'tag', true),
  ('Date Night', 'gift', false),
  ('Weekend Trip', 'car', false);

insert into profiles (id, display_name, default_split) values
  (1, 'Alex', 0.6),
  (2, 'Sam', 0.4);

with months as (
  select
    month_index,
    (date '2025-08-01' + (month_index || ' months')::interval)::date as month_start
  from generate_series(0, 11) as month_index
)
insert into transactions (
  payer_id,
  beneficiary_id,
  split_mode,
  amount,
  category,
  date,
  note,
  type
)
select 1, null::bigint, 'custom'::split_mode, 1180.00, 'Rent', month_start + 1, 'Monthly rent', 'EXPENSE'::transaction_type from months
union all
select 2, null::bigint, 'custom', 88.00 + (month_index % 5) * 6.40, 'Utilities', month_start + 4, 'Power and internet', 'EXPENSE' from months
union all
select case when month_index % 2 = 0 then 1 else 2 end, null::bigint, 'custom', 82.50 + (month_index % 4) * 8.25, 'Groceries', month_start + 7, 'Weekly groceries', 'EXPENSE' from months
union all
select case when month_index % 2 = 0 then 2 else 1 end, null::bigint, 'custom', 64.20 + (month_index % 3) * 9.60, 'Groceries', month_start + 20, 'Groceries and household supplies', 'EXPENSE' from months
union all
select case when month_index % 3 = 0 then 1 else 2 end, null::bigint, 'custom', 46.00 + (month_index % 6) * 7.50, 'Restaurants', month_start + 13, 'Dinner out', 'EXPENSE' from months
union all
select 1, null::bigint, 'custom', 28.98, 'Subscriptions', month_start + 15, 'Streaming subscriptions', 'EXPENSE' from months
union all
select 1, 1, 'none', 2700.00, null::text, month_start + 24, 'Alex salary', 'INCOME' from months
union all
select 2, 2, 'none', 2250.00 + (month_index % 4) * 75.00, null::text, month_start + 26, 'Sam income', 'INCOME' from months;

insert into transactions (
  payer_id,
  beneficiary_id,
  split_mode,
  amount,
  category,
  date,
  note,
  type
) values
  (2, null, 'custom', 420.00, 'Home', '2025-08-09', 'Living room shelves', 'EXPENSE'),
  (2, null, 'none', 112.00, 'Pets', '2025-08-18', 'Vet checkup', 'EXPENSE'),
  (1, 2, 'owed', 54.00, 'Transport', '2025-09-11', 'Sam train pass', 'EXPENSE'),
  (2, null, 'custom', 138.00, 'Entertainment', '2025-09-23', 'Concert tickets', 'EXPENSE'),
  (1, null, 'custom', 640.00, 'Weekend Trip', '2025-10-10', 'Autumn cabin weekend', 'EXPENSE'),
  (2, null, 'none', 86.00, 'Shopping', '2025-10-22', 'Winter shoes', 'EXPENSE'),
  (1, null, 'custom', 184.00, 'Gifts', '2025-11-16', 'Birthday gifts', 'EXPENSE'),
  (2, null, 'none', 95.00, 'Health', '2025-11-27', 'Dental visit', 'EXPENSE'),
  (2, null, 'custom', 980.00, 'Travel', '2025-12-08', 'Holiday flights', 'EXPENSE'),
  (1, 2, 'owed', 72.00, 'Gifts', '2025-12-19', 'Gift for Sam family', 'EXPENSE'),
  (2, 1, 'none', 260.00, null, '2025-12-28', 'Settle up winter expenses', 'LIQUIDATION'),
  (1, null, 'none', 364.00, 'Insurance', '2026-01-12', 'Annual home insurance', 'EXPENSE'),
  (2, null, 'none', 145.00, 'Education', '2026-01-21', 'Online course', 'EXPENSE'),
  (1, null, 'custom', 88.00, 'Date Night', '2026-02-14', 'Valentine dinner', 'EXPENSE'),
  (2, 1, 'owed', 78.00, 'Pets', '2026-02-25', 'Pet medication', 'EXPENSE'),
  (2, null, 'custom', 335.00, 'Home', '2026-03-07', 'Plumber repair', 'EXPENSE'),
  (1, 2, 'none', 180.00, null, '2026-03-29', 'Spring settle up', 'LIQUIDATION'),
  (1, null, 'none', 190.00, 'Taxes', '2026-04-06', 'Tax preparation', 'EXPENSE'),
  (2, null, 'custom', 124.00, 'Entertainment', '2026-04-18', 'Theatre tickets', 'EXPENSE'),
  (1, null, 'custom', 465.00, 'Weekend Trip', '2026-05-15', 'Coastal weekend', 'EXPENSE'),
  (2, null, 'none', 92.00, 'Health', '2026-06-09', 'Physio appointment', 'EXPENSE'),
  (1, 2, 'owed', 66.00, 'Gifts', '2026-06-21', 'Graduation gift', 'EXPENSE'),
  (2, null, 'custom', 750.00, 'Travel', '2026-07-05', 'Summer holiday deposit', 'EXPENSE'),
  (1, 2, 'none', 325.00, null, '2026-07-12', 'Summer settle up', 'LIQUIDATION');

insert into transaction_splits (transaction_id, user_id, amount)
select id, 1, round(amount * 0.60, 2)
from transactions
where type = 'EXPENSE' and split_mode = 'custom';

insert into transaction_splits (transaction_id, user_id, amount)
select id, 2, amount - round(amount * 0.60, 2)
from transactions
where type = 'EXPENSE' and split_mode = 'custom';

select setval(pg_get_serial_sequence('profiles', 'id'), (select max(id) from profiles));
select setval(pg_get_serial_sequence('transactions', 'id'), (select max(id) from transactions));
select setval(pg_get_serial_sequence('transaction_splits', 'id'), (select max(id) from transaction_splits));
select setval(pg_get_serial_sequence('categories', 'id'), (select max(id) from categories));
select setval(pg_get_serial_sequence('changes', 'id'), (select coalesce(max(id), 1) from changes));

commit;
