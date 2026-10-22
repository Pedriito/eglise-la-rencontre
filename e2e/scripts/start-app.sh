#!/usr/bin/env bash
# Construit et lance l'application (build de PRODUCTION, fuseau UTC comme sur Vercel) contre la base
# de test locale, sur http://localhost:3100. Travaille sur une COPIE du dépôt (e2e/.app) pour ne pas
# toucher à `.next/` ni au serveur de dev éventuellement en cours.
#   ./scripts/start-app.sh            → code du dossier de travail courant
#   ./scripts/start-app.sh <git-ref>  → code d'un commit (ex. main) pour comparer avant/après
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(cd .. && pwd)"
APP="$PWD/.app"

rm -rf "$APP" && mkdir -p "$APP"
if [ -n "${1:-}" ]; then
  git -C "$ROOT" archive "$1" | tar -x -C "$APP"
else
  rsync -a --exclude node_modules --exclude .next --exclude .git --exclude e2e --exclude '.ds-sync' --exclude '.design-sync' --exclude 'ds-bundle' "$ROOT/" "$APP/"
fi
cd "$APP"
npm ci --no-audit --no-fund

# Clés de DÉMONSTRATION publiques fournies par `supabase start` (stack locale uniquement).
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
export NEXT_PUBLIC_SITE_URL=http://localhost:3100
# Clés VAPID jetables (le module de notifications push les exige au chargement).
eval "$(node -e "const k=require('web-push').generateVAPIDKeys();console.log('export NEXT_PUBLIC_VAPID_PUBLIC_KEY='+k.publicKey+'\nexport VAPID_PRIVATE_KEY='+k.privateKey)")"
export TZ=UTC

npx next build
exec npx next start -p 3100
