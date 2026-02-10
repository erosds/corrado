#!/bin/bash
# ==============================================
# GESTIONALE FARINA - Script di avvio
# ==============================================
# Avvia backend (FastAPI) e frontend (Vite) in parallelo
# Uso: ./run.sh
# ==============================================

echo "🌾 Avvio Gestionale Farina..."
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funzione cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}Arresto servizi...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Servizi arrestati${NC}"
    exit 0
}

# Trap per gestire CTRL+C
trap cleanup SIGINT SIGTERM

# Verifica directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Errore: Esegui questo script dalla root del progetto${NC}"
    echo "Le cartelle 'backend' e 'frontend' devono esistere"
    exit 1
fi

# Avvio Backend
echo -e "${GREEN}▶ Avvio Backend (FastAPI)...${NC}"
cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Attendi che il backend sia pronto
sleep 2

# Avvio Frontend
echo -e "${GREEN}▶ Avvio Frontend (Vite)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Gestionale Farina avviato!${NC}"
echo "=============================================="
echo ""
echo "  Backend API:  http://localhost:8000"
echo "  Frontend:     http://localhost:5173"
echo "  API Docs:     http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Premi CTRL+C per arrestare${NC}"
echo ""

# Attendi che i processi terminino
wait