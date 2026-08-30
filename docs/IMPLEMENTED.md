# Implemented Feature Map

## Security / Access
- SUPERADMIN / MANAGER / WORKER roles
- JWT access token + refresh token
- HTTP-only cookies
- Refresh-token rotation and hashed refresh sessions
- Backend role guards
- Global throttling
- Helmet and CORS configuration
- Audit log storage

## Textile workflow
- Customers and suppliers
- Sales orders and production orders
- Controlled order lifecycle: Draft → Confirmed → Planning → In Production → Ready → Dispatched → Delivered → Closed
- Yarn production entries and approvals
- Yarn stock ledger
- Knitting job yarn issue
- Worker knitting output/waste entry
- Manager knitting approval
- Grey fabric rolls
- Dye recipes / chemicals schema
- Dyeing batch with grey-roll issue
- Worker dyeing output/loss entry
- Manager dyeing approval
- Finishing
- Final QC
- Finished-fabric rolls
- Packing
- Duplicate/cross-order packing prevention
- Invoice-linked dispatch and in-transit tracking
- Delivery / POD field
- Partial delivery and order-status synchronization
- Order traceability and balance summary

## Inventory / Procurement
- Immutable stock transactions
- Stock availability checks before issue
- Multi-line purchase orders with supplier, delivery date, value, and controlled statuses
- Partial/full goods receipts (GRN) with warehouse, category, lot, and line-level balances
- Over-receipt prevention, receipt audit trail, and material inward to the stock ledger
- Warehouse balances
- Wastage records

## Operations / Admin
- Machine master
- Employee master
- Maintenance records
- Notifications
- User creation
- Company/system settings
- Invoice issue, overdue/partial/paid states, payment validation and automatic order closure
- Finance summary, expenses, customer payments
- Audit page/API

## Reporting / Files
- Production report JSON
- Excel export
- PDF export
- Cloudflare R2 upload or local VPS fallback
- Swagger/OpenAPI
- Bruno test collection

## Deployment
- Docker PostgreSQL for local setup
- PM2 ecosystem
- Nginx reverse-proxy sample
- Certbot instructions
- Uptime Kuma monitor notes
- pg_dump backup / pg_restore scripts
- Cron sample

## Validation performed in this environment

- Prisma schema validation and client generation
- Four PostgreSQL migrations applied successfully
- Backend NestJS production build
- Frontend Next.js production build (24 routes)
- Jest: 11 lifecycle and balance tests passed

Run the same verification after deployment configuration changes:

```bash
cd backend
npm install
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm test
npm run build

cd ../frontend
npm install
npm run build
```
