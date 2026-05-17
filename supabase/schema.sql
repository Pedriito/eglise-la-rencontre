-- ============================================================
-- Espace bénévoles — Église La Rencontre
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Extension pour UUID
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES
-- Extension de auth.users avec infos bénévoles
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text not null,
  last_name    text not null,
  phone        text,
  avatar_url   text,
  permission   text not null default 'viewer' check (permission in ('admin', 'editor', 'viewer')),
  status       text not null default 'invited' check (status in ('active', 'invited', 'inactive')),
  created_at   timestamptz not null default now()
);

-- Crée automatiquement un profil vide à l'invitation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- TEAMS
-- Les 13 équipes de la Célébration
-- ------------------------------------------------------------
create table public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

-- Données initiales
insert into public.teams (name) values
  ('Coordination des célébrations'),
  ('Prédicateurs'),
  ('Louange'),
  ('Sécurité'),
  ('Production'),
  ('Médias et communication'),
  ('Accueil'),
  ('Café'),
  ('Ménage'),
  ('Dimes & Offrandes'),
  ('Évènementiel'),
  ('Enfance Flèches'),
  ('Équipiers de prière');

-- ------------------------------------------------------------
-- POSITIONS
-- Postes au sein d'une équipe
-- ------------------------------------------------------------
create table public.positions (
  id         uuid primary key default uuid_generate_v4(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

-- Positions de l'équipe Louange
insert into public.positions (team_id, name)
select id, unnest(array[
  'Conducteur de louange',
  'Lead en formation',
  'Choriste',
  'Chorale',
  'Danse',
  'DM',
  'Ordi - clic/track',
  'Piano',
  'Piano Pad',
  'Batterie',
  'Percussions',
  'Basse',
  'Guitare Acoustique',
  'Guitare Éléc - Lead',
  'Guitare Éléc - Rhythm'
]) from public.teams where name = 'Louange';

-- ------------------------------------------------------------
-- TEAM_MEMBERS
-- Appartenance à une équipe + rôle + fréquence
-- ------------------------------------------------------------
create table public.team_members (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  role        text not null default 'member' check (role in ('leader', 'member')),
  frequency   text check (frequency in ('as_needed', 'twice_month', 'every_6_weeks', 'monthly', 'weekly')),
  created_at  timestamptz not null default now(),
  unique (user_id, team_id)
);

-- ------------------------------------------------------------
-- MEMBER_POSITIONS
-- Quels postes occupe chaque bénévole
-- ------------------------------------------------------------
create table public.member_positions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, position_id)
);

-- ------------------------------------------------------------
-- PLANS
-- Cultes / services planifiés
-- ------------------------------------------------------------
create table public.plans (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  service_date timestamptz not null,
  team_id      uuid references public.teams(id),
  notes        text,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PLAN_ASSIGNMENTS
-- Affectation d'un bénévole à un plan pour un poste donné
-- ------------------------------------------------------------
create table public.plan_assignments (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  position_id uuid references public.positions(id),
  status      text not null default 'pending' check (status in ('confirmed', 'declined', 'pending')),
  created_at  timestamptz not null default now(),
  unique (plan_id, user_id, position_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.teams            enable row level security;
alter table public.positions        enable row level security;
alter table public.team_members     enable row level security;
alter table public.member_positions enable row level security;
alter table public.plans            enable row level security;
alter table public.plan_assignments enable row level security;

-- Tout bénévole connecté peut lire
create policy "Bénévoles connectés peuvent lire" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Bénévoles connectés peuvent lire" on public.teams
  for select using (auth.role() = 'authenticated');

create policy "Bénévoles connectés peuvent lire" on public.positions
  for select using (auth.role() = 'authenticated');

create policy "Bénévoles connectés peuvent lire" on public.team_members
  for select using (auth.role() = 'authenticated');

create policy "Bénévoles connectés peuvent lire" on public.member_positions
  for select using (auth.role() = 'authenticated');

create policy "Bénévoles connectés peuvent lire" on public.plans
  for select using (auth.role() = 'authenticated');

create policy "Bénévoles connectés peuvent lire" on public.plan_assignments
  for select using (auth.role() = 'authenticated');

-- Chaque bénévole peut modifier son propre profil
create policy "Modifier son propre profil" on public.profiles
  for update using (auth.uid() = id);

-- Chaque bénévole peut confirmer/décliner ses propres affectations
create policy "Répondre à ses affectations" on public.plan_assignments
  for update using (auth.uid() = user_id);

-- Les admins/editors gèrent tout via service role (API routes)
-- Le reste des écritures passe par le client admin côté serveur uniquement
