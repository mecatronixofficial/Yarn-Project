# YarnFlow ERP — Yarn Production / Knitting / Dyeing / Delivery

A full-stack textile manufacturing ERP starter/demo built around one critical rule:

> Every material movement is traceable as **Input → Output → Waste/Loss → Balance** and is linked to the customer/production order.

## Stack

- Frontend: Next.js + TypeScript
- UI: Tailwind CSS + shadcn-style local UI components
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT + Passport.js with secure HTTP-only cookies and refresh-token rotation
- Tables: TanStack Table
- Charts: Recharts
- Forms: React Hook Form + Zod
- Excel: ExcelJS
- PDF: PDFKit
- File storage: Cloudflare R2, with local VPS fallback
- API docs: Swagger/OpenAPI
- API testing: Bruno collection in `docs/bruno`
- Deployment: Ubuntu + Nginx + PM2 + Certbot
- Monitoring: Uptime Kuma guidance
- Backups: `pg_dump` + cron

## Roles

### SUPERADMIN
Full dashboards, users/access, master data, production, inventory, finance, reports, settings and audit data.

### MANAGER
Orders, production planning/operations, stock, approvals, QC, dispatch, customers, machines, finance and reports.

### WORKER
Only assigned knitting/dyeing jobs, production/waste entry and personal notifications. Worker submissions do **not** post official stock until approved.

## Core business flow

```text
Customer
  ↓
Sales Order
  ↓
Production Order / Plan
  ↓
Yarn Production
  ↓
Yarn Stock Ledger
  ↓
Yarn Issue to Knitting
  ↓
Knitting Output + Waste + Balance
  ↓
Grey Fabric Roll / QC
  ↓
Grey Fabric Issue to Dyeing
  ↓
Dyeing Output + Loss + Balance
  ↓
Finishing
  ↓
Final QC
  ↓
Finished Fabric Stock
  ↓
Packing
  ↓
Dispatch
  ↓
Delivery / POD
  ↓
Invoice / Collection
```

## Demo traceability record

Seed data includes `SO-2026-000001` for **Sri Textiles**:

| Stage | Input | Output | Waste/Loss | Open Balance |
|---|---:|---:|---:|---:|
| Yarn | 11,200 KG | 10,800 KG | 400 KG | 0 KG |
| Knitting | 10,800 KG | 10,350 KG | 250 KG | 200 KG |
| Dyeing | 10,350 KG | 10,000 KG | 300 KG | 50 KG |
| Finishing | 10,000 KG | 9,970 KG | 30 KG | 0 KG |
| Final QC | 9,970 KG | 9,950 KG approved | 20 KG rejected | 0 KG |
| Delivery | 9,950 KG ready | 8,000 KG delivered | — | 1,950 KG ready balance |

The original customer order is 10,000 KG, therefore the separate **order fulfillment shortfall** after an 8,000 KG delivery is 2,000 KG. The system intentionally keeps production balance and order fulfillment balance as separate concepts.

## Project structure

```text
yarn-production-erp/
├── frontend/             Next.js application
├── backend/              NestJS + Prisma application
├── docs/bruno/           API test collection
├── deployment/           Nginx, PM2, Certbot, Uptime Kuma notes
├── scripts/              PostgreSQL backup / restore
├── docker-compose.yml    Local PostgreSQL
└── README.md
```

# Local Setup

## 1. Start PostgreSQL

From project root:

```bash
docker compose up -d postgres
```

Or use your own PostgreSQL server and change `DATABASE_URL`.

## 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Backend:

```text
http://localhost:4000
```

Swagger:

```text
http://localhost:4000/api/docs
```

Health:

```text
http://localhost:4000/api/v1/health
```

## 3. Frontend

Open another terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

# Demo Accounts

The demo password is controlled with `DEMO_PASSWORD` during seed. If it is not set, seed uses the following development-only password:

```text
Demo@12345
```

Accounts:

```text
SUPERADMIN
admin@example.com

MANAGER
manager@example.com

WORKER
worker@example.com

DYEING WORKER
dye@example.com
```

Never use these demo credentials in production.

# Authentication / Cookie Security

The backend issues:

- access token: 15 minutes
- refresh token: 7 days
- HTTP-only cookies
- `Secure=true` in production
- SameSite=Lax
- refresh-token rotation
- refresh sessions stored as SHA-256 token hashes
- logout and session revocation support

Tokens are not intentionally exposed to frontend JavaScript/localStorage.

For production, use same-site domains such as:

```text
https://erp.example.com
https://api.erp.example.com
```

and set:

```env
NODE_ENV=production
FRONTEND_URL=https://erp.example.com
COOKIE_DOMAIN=.example.com
```

# Important Stock Rules

The backend validates stock before issue. For example, a knitting job cannot issue 500 KG of yarn if only 420 KG is available for the selected item/lot/warehouse.

Official stock is calculated from immutable `StockTransaction` rows instead of manually replacing a `currentStock` field.

Typical transaction references include:

```text
PRODUCTION_IN
KNITTING_ISSUE
GREY_FABRIC_IN
DYEING_ISSUE
QC_APPROVED
DISPATCH_OUT
WASTE
ADJUSTMENT
```

# Manager / Worker Approval Logic

Worker:

```text
Submit output/waste
       ↓
Pending production entry
```

Manager/Super Admin:

```text
Review quantity
       ↓
Approve
       ↓
Stock transaction / grey roll / official waste created
```

Approved records should be treated as accounting/production history and not casually edited.

# Key API Routes

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET  /api/v1/dashboard

GET  /api/v1/orders
POST /api/v1/orders
GET  /api/v1/orders/:id
GET  /api/v1/orders/:id/traceability
POST /api/v1/orders/:id/production-orders

GET  /api/v1/production/context
GET  /api/v1/production/my-jobs
GET  /api/v1/production/approvals
POST /api/v1/production/yarn/entries
POST /api/v1/production/yarn/entries/:id/approve
POST /api/v1/production/knitting/jobs
POST /api/v1/production/knitting/jobs/:id/entries
POST /api/v1/production/knitting/entries/:id/approve
POST /api/v1/production/dyeing/batches
POST /api/v1/production/dyeing/batches/:id/entries
POST /api/v1/production/dyeing/entries/:id/approve
POST /api/v1/production/finishing
POST /api/v1/production/qc/final

GET /api/v1/inventory/balances
GET /api/v1/inventory/ledger

POST /api/v1/dispatch/packing
POST /api/v1/dispatch
POST /api/v1/dispatch/:id/delivery

GET /api/v1/notifications
PATCH /api/v1/notifications/read-all

GET /api/v1/reports/production
GET /api/v1/reports/production.xlsx
GET /api/v1/reports/production.pdf

POST /api/v1/files/upload
```

# Cloudflare R2

If the R2 environment variables are configured, uploads go to R2. Otherwise the storage service writes to `LOCAL_UPLOAD_DIR`.

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

Do not expose R2 secret credentials to the frontend.

# Production Build

Backend:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Frontend:

```bash
cd frontend
npm ci
npm run build
```

# Ubuntu / PM2 / Nginx

Copy the project to:

```text
/var/www/yarn-production-erp
```

Build both apps, then:

```bash
sudo npm i -g pm2
cd /var/www/yarn-production-erp
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup
```

Copy and edit:

```text
deployment/nginx.conf
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Use `deployment/certbot.txt` to enable HTTPS.

# PostgreSQL Backup

Set `DATABASE_URL`, then:

```bash
./scripts/backup.sh
```

Restore:

```bash
./scripts/restore.sh /var/backups/yarn-erp/yarn-erp-YYYYMMDD-HHMMSS.dump.gz
```

A sample cron schedule is in `deployment/cron.example`.

For production, keep at least one encrypted/off-server backup copy and periodically test restoration.

# Uptime Kuma

See:

```text
deployment/uptime-kuma.md
```

# Before Going Live

1. Replace all demo passwords/secrets.
2. Generate long independent JWT access and refresh secrets.
3. Configure production HTTPS and cookie domain.
4. Restrict CORS to the real frontend domain.
5. Run `npx prisma validate` and migrations.
6. Run frontend/backend builds and tests.
7. Test stock rollback scenarios.
8. Confirm no negative stock is possible unintentionally.
9. Test Manager/Worker permission boundaries.
10. Test PostgreSQL restore from a real backup.
11. Protect/restrict Swagger in production if required.
12. Add your real GST/invoice rules before using finance output for statutory accounting.

## Note

This repository is a substantial working ERP starter/demo focused on the connected manufacturing lifecycle. Before production use in a real mill, validate your exact production terminology, GST/invoicing requirements, warehouse rules, wastage tolerance policies, and approval process with the business team.
