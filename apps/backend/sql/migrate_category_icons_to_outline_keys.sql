-- Migrates category icons from emoji values to semantic outline icon keys.
-- Safe to rerun: only updates known labels and leaves custom labels untouched.

begin;

update categories
set icon = case lower(trim(label))
  when 'groceries' then 'cart'
  when 'rent' then 'home'
  when 'utilities' then 'bolt'
  when 'restaurants' then 'cart'
  when 'transport' then 'car'
  when 'health' then 'health'
  when 'entertainment' then 'media'
  when 'travel' then 'car'
  when 'shopping' then 'bag'
  when 'subscriptions' then 'box'
  when 'salary' then 'briefcase'
  when 'freelance' then 'briefcase'
  when 'gifts' then 'gift'
  when 'pets' then 'paw'
  when 'education' then 'book'
  when 'insurance' then 'shield'
  when 'home' then 'home'
  when 'kids' then 'smile'
  when 'taxes' then 'receipt'
  when 'other' then 'tag'
  when 'date night' then 'gift'
  when 'weekend trip' then 'car'
  else icon
end
where lower(trim(label)) in (
  'groceries',
  'rent',
  'utilities',
  'restaurants',
  'transport',
  'health',
  'entertainment',
  'travel',
  'shopping',
  'subscriptions',
  'salary',
  'freelance',
  'gifts',
  'pets',
  'education',
  'insurance',
  'home',
  'kids',
  'taxes',
  'other',
  'date night',
  'weekend trip'
);

commit;
