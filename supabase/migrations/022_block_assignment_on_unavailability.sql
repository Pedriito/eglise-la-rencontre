-- Migration 022 : une indisponibilité déclarée interdit toute affectation ce jour-là
--
-- Garde-fou de dernier recours, au niveau de la base : il s'applique quel que soit le chemin de
-- code qui écrit (formulaire mobile, bouton desktop, auto-remplissage, rôle DM, script, requête
-- forgée…). Les Server Actions refusent déjà en amont avec un message lisible
-- (lib/availability.ts) ; ce trigger garantit qu'un oubli futur ne puisse jamais contourner la règle.
--
-- Le jour d'un service est son jour calendaire en HEURE DE PARIS (un culte à 00h30 est stocké
-- 23h30 UTC la veille). Les dates d'indisponibilité sont des dates « murales » françaises.
--
-- Ne s'applique pas :
--   • aux lignes `declined` (une réponse « je décline » n'est pas une planification) ;
--   • aux modifications de statut / rappels (seuls plan_id et user_id déclenchent la vérification) ;
--   • aux indisponibilités déclarées APRÈS coup sur une affectation existante : elles restent
--     signalées par l'icône d'alerte dans l'interface, l'admin décide de retirer ou non la personne.
--
-- À exécuter UNE fois dans le SQL Editor Supabase (idempotent : create or replace / drop if exists).

-- ── 1. Insertion d'une affectation ─────────────────────────────────────────
create or replace function public.prevent_assignment_when_unavailable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  service_day date;
begin
  if new.status = 'declined' then
    return new;
  end if;

  select (pl.service_date at time zone 'Europe/Paris')::date
    into service_day
    from public.plans pl
   where pl.id = new.plan_id;

  -- Plan introuvable : la contrainte de clé étrangère produira l'erreur adéquate.
  if service_day is null then
    return new;
  end if;

  if exists (
    select 1
      from public.blockout_dates b
     where b.user_id = new.user_id
       and b.start_date <= service_day
       and b.end_date   >= service_day
  ) then
    raise exception 'INDISPONIBILITE_DECLAREE: ce bénévole a déclaré une indisponibilité le % : affectation refusée.',
      to_char(service_day, 'DD/MM/YYYY');
  end if;

  return new;
end;
$$;

drop trigger if exists plan_assignments_block_unavailable on public.plan_assignments;
create trigger plan_assignments_block_unavailable
  before insert or update of plan_id, user_id on public.plan_assignments
  for each row execute function public.prevent_assignment_when_unavailable();

-- ── 2. Déplacement d'un service vers un autre jour ─────────────────────────
-- Déplacer un service revient à planifier tous ses affectés sur le nouveau jour. Un changement
-- d'heure le MÊME jour n'est jamais bloqué.
create or replace function public.prevent_plan_move_onto_unavailability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  old_day date := (old.service_date at time zone 'Europe/Paris')::date;
  new_day date := (new.service_date at time zone 'Europe/Paris')::date;
  blocked_name text;
begin
  if old_day = new_day then
    return new;
  end if;

  select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    into blocked_name
    from public.plan_assignments a
    join public.blockout_dates b on b.user_id = a.user_id
    join public.profiles p on p.id = a.user_id
   where a.plan_id = new.id
     and a.status <> 'declined'
     and b.start_date <= new_day
     and b.end_date   >= new_day
   limit 1;

  if found then
    raise exception 'INDISPONIBILITE_DECLAREE: % a déclaré une indisponibilité le % : déplacement refusé.',
      coalesce(nullif(blocked_name, ''), 'un bénévole affecté'), to_char(new_day, 'DD/MM/YYYY');
  end if;

  return new;
end;
$$;

drop trigger if exists plans_block_move_onto_unavailability on public.plans;
create trigger plans_block_move_onto_unavailability
  before update of service_date on public.plans
  for each row execute function public.prevent_plan_move_onto_unavailability();
