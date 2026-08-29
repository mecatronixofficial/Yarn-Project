# Uptime Kuma checks

Create monitors for:
- `https://erp.example.com` — HTTP(s), expected 200.
- `https://api.erp.example.com/api/v1/health` — HTTP(s), expected JSON status `ok`.
- SSL certificate expiry for both domains.

Do not expose PostgreSQL directly to the public internet. Database health is checked through the authenticated/server-side API health dependency.
