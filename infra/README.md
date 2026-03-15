# Infra (VPS) — Nginx Reverse Proxy

This folder contains an Nginx reverse-proxy template that supports:

- Ecosystem domain: `example.com`
- Store subdomains: `*.example.com`

## How routing works

- Requests to `/api/*` go to the **Spring API**.
- All other paths go to the **React web**.

Your backend also receives the `Host` header and resolves the store slug from it.

## TLS (Let's Encrypt)
For MVP you can start with HTTP only, then add TLS. Two common options:

- **Certbot + Nginx** (manual / few domains)
- **Caddy / Traefik** (easier automation for many domains)

This repo ships placeholders for certbot volumes, but doesn't force an opinion.

## Next steps on VPS
1. Point DNS `A` record for `example.com` to the VPS.
2. (Optional) Add wildcard `*.example.com` to also point to the VPS.
3. Run:
   ```bash
   docker compose --profile prod up -d --build
   ```
