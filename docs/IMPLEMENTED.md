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
- Dispatch
- Delivery / POD field
- Order traceability and balance summary

## Inventory / Procurement
- Immutable stock transactions
- Stock availability checks before issue
- Purchase orders
- Material inward to stock ledger
- Warehouse balances
- Wastage records

## Operations / Admin
- Machine master
- Employee master
- Maintenance records
- Notifications
- User creation
- Company/system settings
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
- TypeScript parser pass for frontend and backend: no syntax-level TS1xxx errors
- JSON configuration validity check
- Shell script syntax check
- PM2 config load check
- Zero-byte file check

## Validation not completed in this environment
Dependency installation / Prisma CLI download exceeded the execution window. Run the commands below after extraction:

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
