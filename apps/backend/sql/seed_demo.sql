-- Demo seed data for screenshots (safe to rerun).
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

insert into transactions (
  id,
  payer_id,
  beneficiary_id,
  split_mode,
  amount,
  category,
  date,
  note,
  type
) values
  (1, 1, null, 'custom', 120.50, 'Groceries', '2025-10-05', 'Weekly groceries', 'EXPENSE'),
  (2, 2, 1, 'owed', 45.00, 'Transport', '2025-10-12', 'Train tickets', 'EXPENSE'),
  (3, 1, 1, 'none', 2000.00, 'Salary', '2025-10-18', 'October salary', 'INCOME'),
  (4, 2, 1, 'none', 150.00, 'Liquidation', '2025-10-25', 'Settle up', 'LIQUIDATION'),
  (5, 1, null, 'none', 90.00, 'Utilities', '2025-11-03', 'Internet bill', 'EXPENSE'),
  (6, 2, null, 'custom', 160.00, 'Restaurants', '2025-11-14', 'Anniversary dinner', 'EXPENSE'),
  (7, 1, 2, 'owed', 75.00, 'Shopping', '2025-12-02', 'Gift', 'EXPENSE'),
  (8, 2, 2, 'none', 900.00, 'Freelance', '2025-12-10', 'Project payout', 'INCOME'),
  (9, 2, null, 'custom', 240.00, 'Weekend Trip', '2025-12-20', 'Cabin weekend', 'EXPENSE');

insert into transaction_splits (id, transaction_id, user_id, amount) values
  (1, 1, 1, 72.30),
  (2, 1, 2, 48.20),
  (3, 6, 1, 96.00),
  (4, 6, 2, 64.00),
  (5, 9, 1, 144.00),
  (6, 9, 2, 96.00);

select setval(pg_get_serial_sequence('profiles', 'id'), (select max(id) from profiles));
select setval(pg_get_serial_sequence('transactions', 'id'), (select max(id) from transactions));
select setval(pg_get_serial_sequence('transaction_splits', 'id'), (select max(id) from transaction_splits));
select setval(pg_get_serial_sequence('categories', 'id'), (select max(id) from categories));
select setval(pg_get_serial_sequence('changes', 'id'), (select coalesce(max(id), 1) from changes));

commit;
