-- Indisponibilités bénévoles
create table public.blockout_dates (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.blockout_dates enable row level security;

-- Chaque bénévole voit et gère ses propres indisponibilités
create policy "Voir ses indisponibilités" on public.blockout_dates
  for select using (auth.uid() = user_id);

create policy "Créer ses indisponibilités" on public.blockout_dates
  for insert with check (auth.uid() = user_id);

create policy "Supprimer ses indisponibilités" on public.blockout_dates
  for delete using (auth.uid() = user_id);

-- Les admins voient tout (pour l'affichage dans les plans)
create policy "Admins voient tout" on public.blockout_dates
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and permission in ('admin', 'editor')
    )
  );
