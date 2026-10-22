#!/usr/bin/env bash
# Démarre la base de test LOCALE (Docker + CLI Supabase), la peuple, et applique la migration 022.
# Aucun accès à la production : tout tourne sur 127.0.0.1:55421/55422.
#   ./scripts/setup.sh            → base avec la migration 022 (garde-fou activé)
#   ./scripts/setup.sh --sans-022 → base SANS le trigger (pour vérifier que les tests le détectent)
set -euo pipefail
cd "$(dirname "$0")/.."

npm install --no-audit --no-fund
npx playwright install chromium webkit

supabase start --workdir .
node seed.mjs > /dev/null

DB=$(docker ps --format '{{.Names}}' | grep '^supabase_db_eglise-indispo-test$')
if [ "${1:-}" = "--sans-022" ]; then
  docker exec "$DB" psql -U postgres -q -c "drop trigger if exists plan_assignments_block_unavailable on public.plan_assignments; drop trigger if exists plans_block_move_onto_unavailability on public.plans;"
  echo "Base prête SANS la migration 022."
else
  docker exec -i "$DB" psql -U postgres -q -v ON_ERROR_STOP=1 < ../supabase/migrations/022_block_assignment_on_unavailability.sql 2>&1 | grep -v NOTICE || true
  echo "Base prête AVEC la migration 022."
fi
