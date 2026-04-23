# Production Deployment Guide

Two deployment paths are covered:

- **Option A — Docker Compose on a VPS** (self-hosted, everything in one place)
- **Option B — Railway (backend) + Vercel (frontend)** (managed cloud, free tiers available)

---

## Prerequisites (both options)

- A PostgreSQL 16 database (managed service or self-hosted)
- A Google Gemini API key for AI features
- Optionally: BRAPI token and CoinGecko API key for live market prices
- A domain name (recommended)

---

## Option A — Docker Compose on a VPS

Tested on Ubuntu 22.04+. Runs PostgreSQL, the backend, and the frontend as Docker containers on a single machine.

### 1. Provision a server

Any VPS provider works (DigitalOcean, Hetzner, Linode, AWS EC2, etc.).  
Minimum specs: 1 vCPU, 1 GB RAM, 20 GB disk.

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in, then verify:
docker --version
docker compose version
```

### 3. Clone the repository

```bash
git clone <your-repo-url> finance_app
cd finance_app
```

### 4. Configure environment variables

Create a `.env` file at the project root (next to `docker-compose.yml`). Docker Compose automatically picks it up.

```bash
cat > .env <<'EOF'
# AI
GEMINI_API_KEY=your-gemini-api-key

# Market data (optional)
BRAPI_TOKEN=your-brapi-token
COINGECKO_API_KEY=your-coingecko-api-key

# Ollama (optional local AI — only if you run it on the host)
OLLAMA_BASE_URL=http://host.docker.internal:11434
EOF
```

### 5. Set a strong JWT secret

Edit `docker-compose.yml` and replace the placeholder value:

```yaml
JWT_SECRET: replace-this-with-a-long-random-string-at-least-32-chars
```

Generate one with:

```bash
openssl rand -hex 32
```

### 6. Set the frontend API URL

In `docker-compose.yml`, update the build argument for the frontend service with your server's public IP or domain:

```yaml
frontend:
  build:
    args:
      VITE_API_URL: https://api.yourdomain.com   # or http://<server-ip>:3000
```

### 7. Update the backend CORS origin

In `backend/src/server.ts`, replace `https://your-frontend.com` with your actual frontend URL:

```ts
origin: env.NODE_ENV === 'development' ? '*' : ['https://yourdomain.com'],
```

### 8. Build and start

```bash
docker compose up -d --build
```

This will:
1. Start a PostgreSQL container with a persistent volume
2. Build and start the backend (runs `prisma migrate deploy` on startup)
3. Build and start the frontend (Nginx serving the Vite build)

Verify everything is running:

```bash
docker compose ps
curl http://localhost:3000/health
```

### 9. (Recommended) Set up a reverse proxy with TLS

Install Nginx and Certbot on the host to terminate HTTPS and proxy to the containers.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/finance`:

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and get certificates:

```bash
sudo ln -s /etc/nginx/sites-available/finance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 10. Open firewall ports

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Updating

```bash
git pull
docker compose up -d --build
```

Migrations are applied automatically on backend startup.

---

## Option B — Railway (backend) + Vercel (frontend)

This option uses managed cloud platforms. Both have free tiers.

### Backend on Railway

#### 1. Create a Railway account

Go to [railway.app](https://railway.app) and sign in with GitHub.

#### 2. Provision a PostgreSQL database

In your Railway project dashboard:

1. Click **New** → **Database** → **PostgreSQL**
2. Once created, open the database and copy the **DATABASE_URL** from the **Connect** tab

#### 3. Deploy the backend

1. Click **New** → **GitHub Repo** and select your repository
2. Set the **Root Directory** to `backend`
3. Railway will detect `railway.json` automatically and use it for build/start commands

#### 4. Set environment variables

In the backend service settings → **Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (paste from step 2) |
| `JWT_SECRET` | (run `openssl rand -hex 32` locally) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `GEMINI_API_KEY` | your Gemini API key |
| `BRAPI_TOKEN` | your BRAPI token (optional) |
| `COINGECKO_API_KEY` | your CoinGecko key (optional) |

#### 5. Note the backend public URL

Railway assigns a public URL like `https://your-app.up.railway.app`. Copy it — you need it for the frontend.

#### 6. Update CORS

In `backend/src/server.ts`, add your Vercel frontend URL to the production origin list:

```ts
origin: env.NODE_ENV === 'development' ? '*' : ['https://your-app.vercel.app'],
```

Commit and push — Railway redeploys automatically.

---

### Frontend on Vercel

#### 1. Create a Vercel account

Go to [vercel.com](https://vercel.com) and sign in with GitHub.

#### 2. Import the project

1. Click **Add New** → **Project**
2. Select your repository
3. Set **Root Directory** to `frontend`
4. Vercel detects it as a Vite project automatically

#### 3. Set environment variables

In the project settings → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-app.up.railway.app` (Railway backend URL) |

#### 4. Deploy

Click **Deploy**. Vercel builds the frontend and serves it from a global CDN.

`vercel.json` already configures SPA routing so page refreshes work correctly.

---

## Post-deployment checklist

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] Registration and login work end-to-end
- [ ] HTTPS is active (green padlock / valid certificate)
- [ ] `JWT_SECRET` is a random string, not the example placeholder
- [ ] CORS origin in `server.ts` matches the actual frontend URL
- [ ] Database backups are configured (Railway and managed providers handle this; for self-hosted, use `pg_dump` on a cron job)

## Database backups (self-hosted only)

Add a cron job on the host to back up PostgreSQL daily:

```bash
# /etc/cron.daily/finance-db-backup
docker exec finance_app-postgres-1 pg_dump -U finance finance_app \
  | gzip > /var/backups/finance_app_$(date +%Y%m%d).sql.gz

# keep last 14 days
find /var/backups -name "finance_app_*.sql.gz" -mtime +14 -delete
```

## Useful commands

```bash
# View live logs
docker compose logs -f backend

# Open Prisma Studio (database browser) — development only
cd backend && npm run db:studio

# Run a one-off migration
docker compose exec backend npx prisma migrate deploy

# Restart a single service
docker compose restart backend
```
