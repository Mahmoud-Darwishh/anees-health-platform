# Complete Medplum Setup Guide (CLI or GitHub)

This is the exact execution plan for your stack:

- Frontend: Next.js on Vercel
- EHR backend: Medplum on Hostinger VPS (Ubuntu 24.04)
- Database: PostgreSQL
- Edge security: Cloudflare
- Auth: Google OAuth

## 0. What You Must Decide First

1. Medplum domain (example: `medplum.yourdomain.com`)
2. Server access method (SSH key is required)
3. PostgreSQL host (same VPS or managed)
4. Whether to run with Docker Compose (recommended) or direct Node

## 1. VPS Preparation (run on Ubuntu 24.04)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip ca-certificates gnupg lsb-release ufw fail2ban

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Optional: lock SSH password auth (recommended)
# sudo nano /etc/ssh/sshd_config
#   PasswordAuthentication no
#   PubkeyAuthentication yes
# sudo systemctl restart ssh
```

## 2. Choose One Bootstrap Path

### Option A: CLI bootstrap

```bash
cd /opt
sudo npm init medplum
```

### Option B: GitHub clone bootstrap

```bash
cd /opt
sudo git clone https://github.com/medplum/medplum.git
cd medplum
```

Use one option only.

## 3. Install Docker Engine + Compose Plugin

```bash
sudo apt-get remove -y docker.io docker-doc docker-compose podman-docker containerd runc || true
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 4. PostgreSQL for Medplum

If Postgres is on the VPS:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

Inside psql:

```sql
CREATE ROLE medplum_user WITH LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE medplum_db OWNER medplum_user;
\q
```

## 5. Medplum Environment File

Create a server env file (do not commit secrets):

```bash
sudo mkdir -p /opt/medplum-deploy
sudo nano /opt/medplum-deploy/.env
```

Minimum values:

```env
MEDPLUM_BASE_URL=https://medplum.yourdomain.com
POSTGRES_URL=postgresql://medplum_user:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/medplum_db

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Add Medplum-required JWT/signing/session secrets from official docs.
```

## 6. Cloudflare Setup (must do in dashboard)

1. Add proxied DNS A record: `medplum.yourdomain.com` -> VPS public IP.
2. SSL/TLS mode: Full (strict).
3. Enable WAF managed rules.
4. Add rate limiting rules:
- strict for auth/token endpoints
- moderate for FHIR search endpoints
5. Add Bot Fight mode / bot controls.

## 7. Reverse Proxy + TLS

Use Nginx on VPS:

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Create config:

```bash
sudo nano /etc/nginx/sites-available/medplum
```

Template:

```nginx
server {
  listen 80;
  server_name medplum.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:8103;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/medplum /etc/nginx/sites-enabled/medplum
sudo nginx -t
sudo systemctl reload nginx
```

Cloudflare will terminate TLS at edge; keep origin locked down.

## 8. Run Medplum

Run with your chosen bootstrap output and env file.

If using Docker Compose:

```bash
cd /opt/medplum
# adjust compose files to use /opt/medplum-deploy/.env
docker compose up -d
```

Then verify:

```bash
curl -I https://medplum.yourdomain.com
curl https://medplum.yourdomain.com/.well-known/openid-configuration
```

## 9. Backup (encrypted, automated)

Create script:

```bash
sudo nano /opt/medplum-deploy/backup-medplum.sh
chmod +x /opt/medplum-deploy/backup-medplum.sh
```

Script template:

```bash
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%F-%H%M)
OUT=/opt/medplum-deploy/backups
mkdir -p "$OUT"
pg_dump "postgresql://medplum_user:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/medplum_db" | gzip > "$OUT/medplum-$TS.sql.gz"
# Optional: encrypt with gpg and upload to object storage
find "$OUT" -type f -mtime +30 -delete
```

Add cron:

```bash
crontab -e
# daily at 2:30 AM
30 2 * * * /opt/medplum-deploy/backup-medplum.sh >> /var/log/medplum-backup.log 2>&1
```

## 10. Monitoring

Minimum stack:

- Uptime checks (HTTP 200 on Medplum URL)
- CPU/RAM/disk alerts
- Postgres connection and storage alerts
- Cloudflare security event alerts

## 11. Connect Next.js App to Medplum

This repo already has starting utilities:

- `src/lib/medplum/config.ts`
- `src/lib/medplum/fhir-extensions.ts`
- `src/lib/medplum/care-plans.ts`

Use these next to build server-side API routes that read/write FHIR resources.

## 12. Immediate Manual Tasks You Must Do

1. Create Google OAuth app credentials and add callback URLs.
2. Create real Medplum secrets and place them in VPS env file.
3. Configure Cloudflare DNS + WAF + rate limiting.
4. Run first restore test from backup to validate disaster recovery.
