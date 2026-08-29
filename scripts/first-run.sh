#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
docker compose up -d postgres
cd backend
[[ -f .env ]] || cp .env.example .env
npm install
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
cd ../frontend
[[ -f .env.local ]] || cp .env.example .env.local
npm install
printf '\nSetup complete. Run backend: cd backend && npm run start:dev\nRun frontend: cd frontend && npm run dev\n'
