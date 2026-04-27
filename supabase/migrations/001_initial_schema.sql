-- ── Tables ────────────────────────────────────────────────────

create table if not exists skills (
  name text primary key
);

create table if not exists roles (
  name text primary key
);

create table if not exists employees (
  id          text primary key,
  name        text not null,
  role        text not null default '',
  type        text not null default 'full-time',
  pay_rate    numeric not null default 0,
  availability jsonb not null default '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false}'::jsonb,
  skills      text[] not null default '{}',
  email       text not null default '',
  phone       text not null default ''
);

create table if not exists projects (
  id                  text primary key,
  name                text not null,
  client              text not null default '',
  start_date          text not null default '',
  end_date            text not null default '',
  unit                text not null default 'days',
  monthly_allocation  integer not null default 0,
  visits_per_month    integer not null default 0,
  crew_size           integer not null default 1,
  charge_out_rate     numeric not null default 0,
  overtime_flag       boolean not null default false,
  overtime_rate       numeric not null default 1.5,
  priority            text not null default 'medium',
  budget              numeric not null default 0,
  spent               numeric not null default 0,
  skills              text[] not null default '{}'
);

create table if not exists tasks (
  id    text primary key,
  text  text not null,
  done  boolean not null default false,
  added text not null default ''
);

create table if not exists roster_assignments (
  date_key        text not null,
  employee_id     text not null,
  project_id      text not null,
  overtime_hours  numeric,
  primary key (date_key, employee_id, project_id)
);

-- ── Seed data ─────────────────────────────────────────────────

insert into skills (name) values
  ('Chainsaw Operation'), ('Brushcutting'), ('Mulching'), ('Planting'),
  ('Bush Regeneration'), ('Ecological Surveying'), ('Weed Control'),
  ('Erosion Control'), ('Tree Climbing'), ('Revegetation'),
  ('Flora & Fauna Identification'), ('Site Supervision')
on conflict do nothing;

insert into roles (name) values
  ('Bush Regenerator'), ('Field Supervisor'), ('Field Crew'),
  ('Ecologist'), ('Director'), ('CEO')
on conflict do nothing;

insert into employees (id, name, role, type, pay_rate, availability, skills, email, phone) values
  ('e1', 'Cameron Ellis', 'Director', 'full-time', 68,
    '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false}',
    array['Bush Regeneration','Site Supervision','Flora & Fauna Identification','Ecological Surveying'],
    'cameron@constance.org', '0491 667 540'),
  ('e2', 'Priya Nair', 'Field Supervisor', 'full-time', 52,
    '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true}',
    array['Site Supervision','Weed Control','Brushcutting','Chainsaw Operation'],
    'priya@constance.org', '0400 112 334'),
  ('e3', 'James O''Brien', 'Bush Regenerator', 'full-time', 42,
    '{"mon":true,"tue":true,"wed":true,"thu":false,"fri":true,"sat":true}',
    array['Bush Regeneration','Planting','Mulching','Weed Control'],
    'james@constance.org', '0422 887 101'),
  ('e4', 'Marika Tawhai', 'Ecologist', 'full-time', 58,
    '{"mon":true,"tue":false,"wed":true,"thu":true,"fri":true,"sat":false}',
    array['Ecological Surveying','Flora & Fauna Identification','Revegetation'],
    'marika@constance.org', '0414 220 902'),
  ('e5', 'Daniel Krauss', 'Field Supervisor', 'full-time', 54,
    '{"mon":false,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true}',
    array['Site Supervision','Chainsaw Operation','Erosion Control','Bush Regeneration'],
    'daniel@constance.org', '0433 005 221'),
  ('e6', 'Lena Park', 'Field Crew', 'part-time', 38,
    '{"mon":true,"tue":true,"wed":false,"thu":true,"fri":true,"sat":false}',
    array['Planting','Revegetation','Mulching'],
    'lena@constance.org', '0466 412 887'),
  ('e7', 'Tom Fitzgerald', 'Field Crew', 'full-time', 40,
    '{"mon":true,"tue":true,"wed":true,"thu":false,"fri":false,"sat":true}',
    array['Brushcutting','Chainsaw Operation','Mulching'],
    'tom@constance.org', '0477 338 019'),
  ('e8', 'Amelia Chen', 'Field Crew', 'full-time', 40,
    '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false}',
    array['Weed Control','Planting','Bush Regeneration'],
    'amelia@constance.org', '0488 904 761'),
  ('e9', 'Riley Nakamura', 'Bush Regenerator', 'full-time', 44,
    '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":false,"sat":true}',
    array['Bush Regeneration','Tree Climbing','Chainsaw Operation'],
    'riley@constance.org', '0401 667 302')
on conflict do nothing;

insert into projects (id, name, client, start_date, end_date, unit, monthly_allocation, visits_per_month, crew_size, charge_out_rate, overtime_flag, overtime_rate, priority, budget, spent, skills) values
  ('p1', 'Harrington Grove — Stage 4', 'Harrington Grove', '2026-04-01', '2026-06-30', 'days', 22, 10, 4, 1200, false, 1.5, 'high', 26400, 18480,
    array['Bush Regeneration','Weed Control','Planting']),
  ('p2', 'Liverpool Council — VMP', 'Liverpool Council', '2026-03-15', '2026-07-15', 'hours', 160, 12, 3, 145, true, 1.5, 'high', 23200, 10150,
    array['Site Supervision','Ecological Surveying']),
  ('p3', 'Camden — Weed slashing program', 'Camden Council', '2026-01-01', '2026-12-31', 'days', 16, 8, 3, 980, false, 1.5, 'medium', 15680, 7056,
    array['Brushcutting','Weed Control','Mulching']),
  ('p4', 'Wollondilly — Biodiversity survey', 'Wollondilly Shire', '2026-04-01', '2026-05-24', 'days', 10, 5, 2, 1400, false, 1.5, 'medium', 14000, 3920,
    array['Ecological Surveying','Flora & Fauna Identification']),
  ('p5', 'AWP Wildlife corridor', 'AWP', '2026-02-01', '2026-05-02', 'hours', 140, 10, 4, 160, true, 1.75, 'high', 22400, 20384,
    array['Revegetation','Planting','Erosion Control'])
on conflict do nothing;

insert into tasks (id, text, done, added) values
  ('t1', 'Create Supervisor and Staff dashboards (variants of this one)', false, '2026-04-20')
on conflict do nothing;
