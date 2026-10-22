-- ============================================================================
-- Réplique LOCALE de test — reconstruite depuis le dépôt (supabase/schema.sql,
-- supabase/blockout_dates.sql, migrations 005→021) + colonnes déduites du code.
-- Aucune donnée de production.
-- ============================================================================

create extension if not exists "uuid-ossp" with schema extensions;

-- ── churches ────────────────────────────────────────────────────────────────
create table public.churches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique,
  created_at timestamptz not null default now()
);

-- ── profiles (schema.sql + 005 + 006 + 019 + colonnes utilisées par le code) ─
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  first_name        text not null default '',
  last_name         text not null default '',
  phone             text,
  avatar_url        text,
  email             text,
  birthdate         date,
  city              text,
  profile_complete  boolean not null default false,
  permission        text not null default 'viewer',
  status            text not null default 'invited' check (status in ('active', 'invited', 'inactive')),
  church_id         uuid references public.churches(id),
  desired_frequency text check (desired_frequency in ('as_needed','twice_month','every_6_weeks','monthly','weekly')),
  created_at        timestamptz not null default now(),
  constraint profiles_permission_check check (permission in ('admin', 'editor', 'viewer', 'super_admin'))
);

-- Trigger tel que versionné dans le dépôt : ne renseigne PAS church_id.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- ── teams (schema.sql + 006 + 009) ─────────────────────────────────────────
create table public.teams (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  church_id         uuid not null references public.churches(id),
  allows_guests     boolean not null default false,
  is_coordination   boolean not null default false,
  hide_positions    boolean not null default false,
  is_prayer_meeting boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ── positions (schema.sql + 012 + 021) ─────────────────────────────────────
create table public.positions (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  name           text not null,
  allow_multiple boolean not null default false,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (team_id, name)
);

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  role       text not null default 'member' check (role in ('leader', 'member')),
  frequency  text check (frequency in ('as_needed', 'twice_month', 'every_6_weeks', 'monthly', 'weekly')),
  created_at timestamptz not null default now(),
  unique (user_id, team_id)
);

create table public.member_positions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, position_id)
);

-- ── plans (schema.sql + 006 + 014 + 015 + colonnes du code) ────────────────
create table public.plans (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  service_date          timestamptz not null,
  team_id               uuid references public.teams(id),
  team_ids              uuid[] default null,
  excluded_position_ids uuid[] default null,
  notes                 text,
  plan_type             text default 'sunday_service',
  share_token           text,
  church_id             uuid not null references public.churches(id),
  created_at            timestamptz not null default now()
);

-- ── plan_assignments (schema.sql + 010 + 013 + colonnes du code) ───────────
create table public.plan_assignments (
  id                 uuid primary key default gen_random_uuid(),
  plan_id            uuid not null references public.plans(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  position_id        uuid references public.positions(id),
  team_id            uuid references public.teams(id),
  status             text not null default 'pending' check (status in ('confirmed', 'declined', 'pending')),
  external_name      text,
  external_email     text,
  invitation_sent_at timestamptz,
  reminder_sent_days integer[] not null default '{}',
  created_at         timestamptz not null default now(),
  unique (plan_id, user_id, position_id)
);
create unique index plan_assignments_unique_position
  on public.plan_assignments (plan_id, user_id, position_id) where position_id is not null;
create unique index plan_assignments_unique_team_no_position
  on public.plan_assignments (plan_id, user_id, team_id) where position_id is null;

-- ── blockout_dates (supabase/blockout_dates.sql + 006) ─────────────────────
create table public.blockout_dates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ── Contenus de plan (déduits du code) ──────────────────────────────────────
create table public.songs (
  id                  serial primary key,
  title               text not null,
  ccli                text,
  themes              text[],
  notes               text,
  last_scheduled_date date
);
create table public.arrangements (
  id              uuid primary key default gen_random_uuid(),
  song_id         integer not null references public.songs(id) on delete cascade,
  name            text not null default 'Standard',
  chord_chart     text,
  chord_chart_key text,
  keys_available  text[],
  bpm             integer,
  length_seconds  integer,
  notes           text,
  tags            text[],
  youtube_url     text,
  audio_url       text,
  slide_style     jsonb,
  created_at      timestamptz not null default now()
);
create table public.plan_songs (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.plans(id) on delete cascade,
  song_id        integer references public.songs(id),
  arrangement_id uuid references public.arrangements(id),
  key_selected   text,
  order_index    integer not null default 0
);
create table public.plan_announcements (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  title       text,
  body        text not null,
  order_index integer not null default 0,
  image_url   text,
  video_url   text,
  created_at  timestamptz not null default now()
);
create table public.plan_sermons (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.plans(id) on delete cascade,
  title        text not null,
  url          text not null,
  storage_path text,
  created_at   timestamptz not null default now()
);
create table public.plan_videos (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  title       text,
  url         text not null,
  order_index integer not null default 0
);
create table public.recurring_announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  body        text not null,
  order_index integer not null default 0,
  image_url   text,
  video_url   text,
  active      boolean not null default true
);
create table public.projection_settings (
  id             uuid primary key default gen_random_uuid(),
  calendar_token text
);
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ============================================================================
-- RLS — état final après 006
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.teams              enable row level security;
alter table public.positions          enable row level security;
alter table public.team_members       enable row level security;
alter table public.member_positions   enable row level security;
alter table public.plans              enable row level security;
alter table public.plan_assignments   enable row level security;
alter table public.blockout_dates     enable row level security;
alter table public.songs              enable row level security;
alter table public.arrangements       enable row level security;
alter table public.plan_songs         enable row level security;
alter table public.plan_announcements enable row level security;
alter table public.plan_sermons       enable row level security;
alter table public.plan_videos        enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.churches           enable row level security;

create policy "Bénévoles connectés peuvent lire" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Modifier son propre profil" on public.profiles
  for update using (auth.uid() = id);

create policy "Bénévoles voient les équipes de leur église" on public.teams
  for select using (church_id = (select church_id from public.profiles where id = auth.uid()));

create policy "Bénévoles voient les postes de leur église" on public.positions
  for select using (exists (
    select 1 from public.teams t join public.profiles p on p.id = auth.uid()
    where t.id = positions.team_id and t.church_id = p.church_id));

create policy "Bénévoles voient les membres de leur église" on public.team_members
  for select using (exists (
    select 1 from public.teams t join public.profiles p on p.id = auth.uid()
    where t.id = team_members.team_id and t.church_id = p.church_id));

create policy "Bénévoles voient les postes membres de leur église" on public.member_positions
  for select using (exists (
    select 1 from public.positions pos join public.teams t on t.id = pos.team_id
    join public.profiles p on p.id = auth.uid()
    where pos.id = member_positions.position_id and t.church_id = p.church_id));

create policy "Bénévoles voient les plans de leur église" on public.plans
  for select using (church_id = (select church_id from public.profiles where id = auth.uid()));

create policy "Bénévoles voient les affectations de leur église" on public.plan_assignments
  for select using (exists (
    select 1 from public.plans pl join public.profiles p on p.id = auth.uid()
    where pl.id = plan_assignments.plan_id and pl.church_id = p.church_id));
create policy "Répondre à ses affectations" on public.plan_assignments
  for update using (auth.uid() = user_id);

-- blockout_dates : politiques d'origine + remplacement de 006
create policy "Voir ses indisponibilités" on public.blockout_dates
  for select using (auth.uid() = user_id);
create policy "Créer ses indisponibilités" on public.blockout_dates
  for insert with check (auth.uid() = user_id);
create policy "Supprimer ses indisponibilités" on public.blockout_dates
  for delete using (auth.uid() = user_id);
create policy "Admins voient les indispos de leur église" on public.blockout_dates
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles admin_p
      join public.profiles member_p on member_p.id = blockout_dates.user_id
      where admin_p.id = auth.uid()
        and admin_p.permission in ('admin', 'editor', 'super_admin')
        and admin_p.church_id = member_p.church_id
    )
  );

create policy "lecture" on public.songs              for select using (auth.role() = 'authenticated');
create policy "lecture" on public.arrangements       for select using (auth.role() = 'authenticated');
create policy "lecture" on public.plan_songs         for select using (auth.role() = 'authenticated');
create policy "lecture" on public.plan_announcements for select using (auth.role() = 'authenticated');
create policy "lecture" on public.plan_sermons       for select using (auth.role() = 'authenticated');
create policy "lecture" on public.plan_videos        for select using (auth.role() = 'authenticated');
create policy "lecture" on public.churches           for select using (auth.role() = 'authenticated');

create policy "lecture propriétaire" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "insertion propriétaire" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "suppression propriétaire" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Droits explicites (indépendants des privilèges par défaut de la version locale)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
