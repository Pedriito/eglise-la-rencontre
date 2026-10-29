#!/bin/bash
# Démarre le serveur ATEM local
# Usage: ./start-atem.sh [IP_ATEM] [CAPTURE_DEVICE]
# Défaut: ./start-atem.sh 10.0.0.107 0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ATEM_IP="${1:-10.0.0.107}"
CAPTURE="${2:-0}"

echo "🎬 Démarrage du serveur ATEM..."
echo "   ATEM IP : $ATEM_IP"
echo "   Capture device : $CAPTURE"
echo ""

node atem-server.mjs "$ATEM_IP" "$CAPTURE"
