#!/bin/bash
# LitterDesk Deployment Script
# Usage: ./scripts/deploy.sh [railway|vps]

set -e

DEPLOY_TARGET=${1:-railway}
APP_NAME="litterdesk"

echo "🐾 LitterDesk Deployment"
echo "Target: $DEPLOY_TARGET"
echo "================================"

check_deps() {
  echo "Checking dependencies..."
  command -v docker &>/dev/null || { echo "Docker required"; exit 1; }
  command -v git &>/dev/null || { echo "Git required"; exit 1; }
}

deploy_railway() {
  echo "Deploying to Railway..."
  command -v railway &>/dev/null || npm install -g @railway/cli

  # Deploy backend
  echo "  → Deploying backend..."
  cd backend
  railway up --service backend
  cd ..

  # Deploy frontend
  echo "  → Deploying frontend..."
  cd frontend
  railway up --service frontend
  cd ..

  echo "✅ Railway deployment complete"
  echo "Dashboard: https://railway.app"
}

deploy_vps() {
  VPS_HOST=${VPS_HOST:?"Set VPS_HOST env var"}
  VPS_USER=${VPS_USER:-ubuntu}

  echo "Deploying to VPS: $VPS_HOST"

  # Build images
  echo "  → Building Docker images..."
  docker build -t $APP_NAME-backend ./backend
  docker build -t $APP_NAME-frontend ./frontend

  # Push to VPS and restart
  ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    cd /opt/litterdesk
    git pull origin main
    docker compose pull
    docker compose up -d --build
    docker compose exec backend alembic upgrade head
    echo "✅ VPS deployment complete"
ENDSSH
}

setup_local() {
  echo "Setting up local development..."

  if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  Created .env from template — fill in your API keys"
  fi

  # Install backend deps
  echo "  → Installing backend dependencies..."
  cd backend
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cd ..

  # Install frontend deps
  echo "  → Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..

  # Start with docker compose
  echo "  → Starting services..."
  docker compose up -d postgres redis

  sleep 3

  echo ""
  echo "✅ Local setup complete!"
  echo ""
  echo "Start backend:   cd backend && uvicorn app.main:app --reload"
  echo "Start frontend:  cd frontend && npm run dev"
  echo "API docs:        http://localhost:8000/docs"
  echo "App:             http://localhost:3000"
}

run_migrations() {
  echo "Running database migrations..."
  cd backend
  alembic upgrade head
  echo "✅ Migrations complete"
  cd ..
}

check_deps

case $DEPLOY_TARGET in
  railway) deploy_railway ;;
  vps) deploy_vps ;;
  local) setup_local ;;
  migrate) run_migrations ;;
  *)
    echo "Unknown target: $DEPLOY_TARGET"
    echo "Usage: ./scripts/deploy.sh [railway|vps|local|migrate]"
    exit 1
    ;;
esac
