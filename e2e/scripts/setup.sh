#!/usr/bin/env bash
# Démarre la base de test LOCALE (Docker + CLI Supabase), la peuple, et applique la migration 022.
# Aucun accès à la production : tout tourne sur 127.0.0.1:55421/55422.
#   ./scripts/setup.sh            → base avec la migration 022 (garde-fou activé)
#   ./scripts/setup.sh --sans-022 → base SANS le trigger (pour vérifier que les tests le détectent)
#   ./scripts/setup.sh --comme-la-prod → schéma de la PROD : sans `positions.allow_multiple` (migration 012)
#                                      ni index partiels (013), avec l'ancien index unique (plan, user, équipe).
#                                      À réserver à `npx playwright test choristes-autofill` (le reste suppose 013).
set -euo pipefail
cd "$(dirname "$0")/.."

npm install --no-audit --no-fund
npx playwright install chromium webkit

supabase start --workdir .
DB=$(docker ps --format '{{.Names}}' | grep '^supabase_db_eglise-indispo-test$')
# Remet d'abord le schéma de référence (au cas où une exécution précédente était en --comme-la-prod).
docker exec "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 -c "
  alter table public.positions add column if not exists allow_multiple boolean not null default false;
  drop index if exists public.plan_assignments_plan_id_user_id_team_id_key;
  create unique index if not exists plan_assignments_unique_position on public.plan_assignments (plan_id, user_id, position_id) where position_id is not null;
  create unique index if not exists plan_assignments_unique_team_no_position on public.plan_assignments (plan_id, user_id, team_id) where position_id is null;"

node seed.mjs > /dev/null

if [ "${1:-}" = "--comme-la-prod" ]; then
  docker exec "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 -c "
    alter table public.positions drop column allow_multiple;
    drop index public.plan_assignments_unique_position;
    drop index public.plan_assignments_unique_team_no_position;
    create unique index plan_assignments_plan_id_user_id_team_id_key on public.plan_assignments (plan_id, user_id, team_id);"
  # La prod a déjà la migration 022 (appliquée le 22/10/2026).
  docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 < ../supabase/migrations/022_block_assignment_on_unavailability.sql 2>&1 | grep -v NOTICE || true
  echo "Base prête avec le schéma de la PROD (sans 012/013, avec 022)."
elif [ "${1:-}" = "--sans-022" ]; then
  docker exec "$DB" psql -U postgres -q -c "drop trigger if exists plan_assignments_block_unavailable on public.plan_assignments; drop trigger if exists plans_block_move_onto_unavailability on public.plans;"
  echo "Base prête SANS la migration 022."
else
  docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 < ../supabase/migrations/022_block_assignment_on_unavailability.sql 2>&1 | grep -v NOTICE || true
  echo "Base prête AVEC la migration 022."
fi
