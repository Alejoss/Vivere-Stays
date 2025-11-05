# Vivere Stays - Production Deployment Guide

**Last Updated**: November 5, 2025  
**Environment**: Google Cloud Platform - Compute Engine  
**Status**: ✅ Production Ready with HTTPS

---

## 🏗️ Production Architecture

```
Internet (HTTPS Port 443)
    ↓
GCP Firewall Rules
    - vivere-allow-https: tcp:80,443
    - vivere-allow-http: tcp:8000,3000
    ↓
VM Instance: vivere-stays
  - Zone: us-central1-c
  - External IP: 35.226.220.107
  - Internal IP: 10.128.0.4
  - Tags: http-server
    ↓
Nginx Reverse Proxy (Host-level)
  - SSL/TLS Termination
  - HTTP → HTTPS Redirect
  - Domain-based routing
    ↓
Docker Compose Network: vivere_network
    ↓
┌─────────────────────────────────────┐
│  Backend Container                  │
│  - Image: vivere-stays-vivere_backend│
│  - Service: Gunicorn + Django       │
│  - Port: 8000 (internal)            │
│  - CMD: gunicorn --workers 4        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Frontend Container                 │
│  - Image: vivere-stays-vivere_frontend│
│  - Service: Node.js + Express + React│
│  - Port: 3000 (internal)            │
│  - SSR: Enabled                     │
└─────────────────────────────────────┘
    ↓
Aiven Cloud PostgreSQL (Remote)
  - Host: ava-solutions-dp-viverestays-97e1.aivencloud.com
  - Port: 18429 (SSL required)
  - Database: defaultdb
  - User: webapp_backend
  - Schemas: public, dynamic, booking, core
```

---

## 🌐 Domains and URLs

### Production URLs
| Service | Domain | Protocol | Status |
|---------|--------|----------|--------|
| **Frontend App** | https://app.viverestays.com | HTTPS | ✅ Live |
| **Backend API** | https://admin.viverestays.com | HTTPS | ✅ Live |
| **API Docs** | https://admin.viverestays.com/api/docs/ | HTTPS | ✅ Live |
| **Django Admin** | https://admin.viverestays.com/admin/ | HTTPS | ✅ Live |

**Note**: `admin.viverestays.com` serves the Django application which includes:
- REST API endpoints at `/api/*`
- Django admin interface at `/admin/`
- API documentation at `/api/docs/`

The frontend connects to the backend via `https://admin.viverestays.com/api` (HTTPS with `/api` prefix). Nginx handles SSL termination and routes `/api/*` requests to the backend container on port 8000.

**Critical Configuration**: The `VITE_API_BASE_URL` must include the `/api` prefix:
- ✅ Correct: `https://admin.viverestays.com/api`
- ❌ Wrong: `https://admin.viverestays.com` (missing `/api`)
- ❌ Wrong: `http://35.226.220.107:8000` (IP address, missing `/api`)

When changing `VITE_API_BASE_URL`, always rebuild the frontend with `--no-cache` to ensure the new value is baked into the build.

### Staging URLs (Legacy)
| Service | Domain | Protocol | Status |
|---------|--------|----------|--------|
| Staging Frontend | https://vivere-fe.algobeat.com | HTTPS | ⚠️ Legacy |
| Staging Backend | https://vivere-stays.algobeat.com | HTTPS | ⚠️ Legacy |

---

## 🗄️ Infrastructure Details

### Compute Engine VM
```yaml
Name: vivere-stays
Zone: us-central1-c
External IP: 35.226.220.107 (Static)
Internal IP: 10.128.0.4
Machine Type: (configurable)
OS: Ubuntu/Debian
Network Tags: http-server
```

### Firewall Configuration
```yaml
vivere-allow-https:
  priority: 1000
  allowed: tcp:80,443
  source_ranges: 0.0.0.0/0
  target_tags: http-server
  
vivere-allow-http:
  priority: 1000
  allowed: tcp:8000,3000
  source_ranges: 0.0.0.0/0
  target_tags: http-server
```

### Nginx Configuration
```yaml
Status: Running
Config: /etc/nginx/sites-enabled/
SSL: Let's Encrypt (Auto-renewal enabled)
Certificates:
  - /etc/letsencrypt/live/app.viverestays.com/fullchain.pem
  - /etc/letsencrypt/live/admin.viverestays.com/fullchain.pem
```

### Docker Services
```yaml
backend:
  image: vivere-stays-vivere_backend
  command: gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 120 vivere_stays.wsgi:application
  restart: unless-stopped
  networks: vivere_network
  
frontend:
  image: vivere-stays-vivere_frontend
  command: node dist/server/node-build.mjs
  environment:
    - NODE_ENV=production
    - VITE_API_BASE_URL=https://admin.viverestays.com/api
  restart: unless-stopped
  networks: vivere_network
```

---

## 🚀 Deployment Process

### Prerequisites
- SSH access to VM: `ssh alejoveintimilla@35.226.220.107`
- Docker and Docker Compose installed ✅
- Nginx installed and configured ✅
- SSL certificates installed ✅
- DNS configured correctly ✅

### 1. Connect to Server
```bash
ssh alejoveintimilla@35.226.220.107
cd ~/Vivere-Stays
```

### 2. Update Code
```bash
# Pull latest changes
git pull origin main

# Or manually copy files if not using git
```

### 3. Update Environment Variables
```bash
# Edit environment file
nano .env
```

**Critical Variables**:
```env
# Django Settings
DEBUG=False
SECRET_KEY=<secure-secret-key>
ALLOWED_HOSTS=admin.viverestays.com,app.viverestays.com,35.226.220.107,localhost

# Database (Aiven)
PROD_POSTGRES_DB=defaultdb
PROD_POSTGRES_USER=webapp_backend
PROD_POSTGRES_PASSWORD=<password>
PROD_POSTGRES_HOST=ava-solutions-dp-viverestays-97e1.aivencloud.com
PROD_POSTGRES_PORT=18429
PROD_POSTGRES_SSLMODE=require

# CORS Settings
CORS_ALLOWED_ORIGINS=https://app.viverestays.com
CSRF_TRUSTED_ORIGINS=https://admin.viverestays.com,https://app.viverestays.com

# Frontend
FRONTEND_URL=https://app.viverestays.com

# Security
AUTH_COOKIE_SECURE=True
```

### 4. Deploy Services
```bash
# Stop current services
docker compose -f docker-compose.remote.yml down

# IMPORTANT: Rebuild frontend with --no-cache to ensure new VITE_API_BASE_URL is used
# Frontend builds bake environment variables at build time, so cache must be cleared
docker compose -f docker-compose.remote.yml build --no-cache vivere_frontend

# Rebuild backend (can use cache if no changes)
docker compose -f docker-compose.remote.yml build vivere_backend

# Start services
docker compose -f docker-compose.remote.yml up -d

# Check status
docker ps

# Verify frontend built with correct API URL
docker exec vivere_frontend grep -r "admin.viverestays.com/api" /app/dist/ | head -1 || echo "WARNING: New URL not found in build!"
docker exec vivere_frontend grep -r "35.226.220.107" /app/dist/ && echo "WARNING: Old URL still present!" || echo "OK: Old URL not found"

# View logs
docker logs -f vivere_backend
docker logs -f vivere_frontend
```

**Important Notes:**
- Always use `--no-cache` when rebuilding frontend after changing `VITE_API_BASE_URL`
- Vite bakes environment variables at build time, so cached layers may contain old values
- After deployment, users may need to clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### 5. Run Database Migrations
```bash
# Run migrations
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate

# Create superuser (if needed)
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py createsuperuser
```

### 6. Verify Deployment
```bash
# From VM
curl http://localhost:8000/api/profiles/check-auth/
curl http://localhost:3000/

# From local machine
curl https://app.viverestays.com
curl https://admin.viverestays.com/api/profiles/check-auth/

# Check Nginx status
sudo systemctl status nginx

# Check SSL certificates
sudo certbot certificates
```

---

## 🔧 Maintenance Operations

### View Logs
```bash
# Real-time logs
docker logs -f vivere_backend
docker logs -f vivere_frontend
sudo journalctl -u nginx -f

# Last 100 lines
docker logs --tail 100 vivere_backend
```

### Restart Services
```bash
# Restart specific service
docker compose -f docker-compose.remote.yml restart vivere_backend
docker compose -f docker-compose.remote.yml restart vivere_frontend

# Restart all services
docker compose -f docker-compose.remote.yml restart

# Reload Nginx config
sudo nginx -t && sudo systemctl reload nginx
```

### Rebuild Frontend (After API URL Changes)
```bash
# IMPORTANT: Use --no-cache when rebuilding frontend after changing VITE_API_BASE_URL
# This ensures the new environment variable is baked into the build

# Stop frontend
docker compose -f docker-compose.remote.yml stop vivere_frontend

# Remove old image to force fresh build
docker rmi vivere-stays-vivere_frontend

# Rebuild without cache
docker compose -f docker-compose.remote.yml build --no-cache vivere_frontend

# Start frontend
docker compose -f docker-compose.remote.yml up -d vivere_frontend

# Verify the build
docker exec vivere_frontend grep -r "admin.viverestays.com/api" /app/dist/ | head -1
```

### Check Service Health
```bash
# Container status
docker ps
docker stats

# Service connectivity
curl http://localhost:8000/api/profiles/check-auth/
curl http://localhost:3000/

# Database connection
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py check --database default

# Nginx configuration test
sudo nginx -t

# SSL certificate status
sudo certbot certificates
```

---

## 🔒 Security Configuration

### SSL/TLS Certificates
- **Provider**: Let's Encrypt
- **Auto-renewal**: Enabled via Certbot
- **Renewal Frequency**: Every 90 days (automatic)
- **Test renewal**: `sudo certbot renew --dry-run`

### Django Security Settings
```python
DEBUG = False
SECRET_KEY = <secure-key>
ALLOWED_HOSTS = ['admin.viverestays.com', 'app.viverestays.com']
CORS_ALLOWED_ORIGINS = ['https://app.viverestays.com']
CSRF_TRUSTED_ORIGINS = ['https://admin.viverestays.com', 'https://app.viverestays.com']
AUTH_COOKIE_SECURE = True
```

### Network Security
- ✅ Firewall rules restrict traffic to necessary ports
- ✅ SSH access via key-based authentication
- ✅ Database connections use SSL/TLS
- ✅ HTTPS enforced via Nginx redirect

---

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check logs for errors
docker logs vivere_backend
docker logs vivere_frontend

# Check if ports are in use
sudo netstat -tuln | grep -E '(8000|3000|80|443)'

# Check Docker status
docker system df
docker ps -a
```

### Database Connection Issues
```bash
# Test connection
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py dbshell

# Check environment variables
docker compose -f docker-compose.remote.yml exec vivere_backend env | grep POSTGRES

# Verify database credentials
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py check --database default
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually if needed
sudo certbot renew

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test renewal
sudo certbot renew --dry-run
```

### Frontend Can't Reach Backend
```bash
# Check CORS settings
docker compose -f docker-compose.remote.yml exec vivere_backend env | grep CORS

# Verify frontend built with correct API URL
docker exec vivere_frontend grep -r "admin.viverestays.com/api" /app/dist/ | head -1 || echo "ERROR: New URL not found!"
docker exec vivere_frontend grep -r "35.226.220.107" /app/dist/ && echo "ERROR: Old URL still present!" || echo "OK: Old URL not found"

# If frontend is using wrong URL, force rebuild without cache
docker compose -f docker-compose.remote.yml down
docker rmi vivere-stays-vivere_frontend
docker compose -f docker-compose.remote.yml build --no-cache vivere_frontend
docker compose -f docker-compose.remote.yml up -d vivere_frontend

# Test from frontend container
docker compose -f docker-compose.remote.yml exec vivere_frontend wget -O- http://vivere_backend:8000/api/profiles/check-auth/

# Check network connectivity
docker network inspect vivere-stays_vivere_network

# Check browser console for actual request URL
# Open DevTools → Network tab → Check request URL
# Should be: https://admin.viverestays.com/api/profiles/...
# NOT: https://35.226.220.107:8000/profiles/...
```

**Common Issues:**
- **Frontend still using old URL**: Frontend container needs rebuild with `--no-cache`
- **Browser showing old URL**: Clear browser cache (Ctrl+Shift+R) or use Incognito mode
- **Status 0 network errors**: Usually means wrong URL or CORS blocking

### High Resource Usage
```bash
# Check resource usage
docker stats

# View system resources
free -h
df -h
top

# Adjust Gunicorn workers if needed
# Edit docker-compose.remote.yml line 15: --workers 4
docker compose -f docker-compose.remote.yml restart vivere_backend
```

---

## 📊 Monitoring

### Key Metrics to Monitor
- Container status and restart counts
- Memory and CPU usage
- Database connection pool
- SSL certificate expiration dates
- Nginx access and error logs
- Application logs for errors

### Log Locations
```bash
# Docker logs
docker logs vivere_backend
docker logs vivere_frontend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u docker -f

# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Automated Monitoring (Recommended)
- Set up Cloud Monitoring for VM metrics
- Configure alerts for container failures
- Monitor SSL certificate expiration
- Track database connection pool usage
- Alert on high error rates in logs

---

## 🔄 Backup and Recovery

### Database Backups
```bash
# Manual backup
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py dumpdata > backup_$(date +%Y%m%d).json

# Restore backup
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py loaddata backup_20251030.json

# Consider automated backups via Aiven Cloud
```

### Configuration Backups
```bash
# Backup environment file
cp .env .env.backup.$(date +%Y%m%d)

# Backup Nginx configs
sudo cp /etc/nginx/sites-enabled/* ~/nginx-backups/

# Backup SSL certificates (usually not needed, can regenerate)
sudo cp -r /etc/letsencrypt ~/letsencrypt-backup
```

### Rollback Procedure
```bash
# Stop services
docker compose -f docker-compose.remote.yml down

# Revert to previous environment
cp .env.backup.YYYYMMDD .env

# Restore previous Docker images (if available)
docker load -i backup-image.tar

# Start with previous config
docker compose -f docker-compose.remote.yml up -d

# Verify
docker logs vivere_backend
curl https://app.viverestays.com
```

---

## 🚦 Key Configuration Files

### Docker Compose
- **File**: `docker-compose.remote.yml`
- **Location**: `~/Vivere-Stays/`
- **Purpose**: Container orchestration
- **Update**: Backend/frontend service definitions

### Environment Variables
- **File**: `.env`
- **Location**: `~/Vivere-Stays/`
- **Purpose**: Application configuration
- **Security**: Never commit to git, contains secrets

### Nginx Configuration
- **Files**: `/etc/nginx/sites-available/`
- **Purpose**: Reverse proxy and SSL termination
- **Update**: Domain routing and SSL settings

### SSL Certificates
- **Location**: `/etc/letsencrypt/live/`
- **Purpose**: HTTPS certificates
- **Management**: Certbot (auto-renewal)

---

## 🔍 Health Checks

### Routine Health Checks
```bash
# Daily
docker ps
curl https://app.viverestays.com | head
curl https://admin.viverestays.com/api/profiles/check-auth/

# Weekly
sudo certbot certificates
docker system df
free -h

# Monthly
docker system prune -a
sudo certbot renew --dry-run
```

### Automated Health Endpoint
Consider adding health check endpoints:
- Backend: `GET /api/health/` - Database, dependencies
- Frontend: `GET /health` - Service status

---

## 📋 Post-Deployment Checklist

After each deployment:

- [ ] Both containers running (`docker ps`)
- [ ] No errors in logs
- [ ] HTTPS working on both domains
- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] **Frontend API URL correct** (`docker exec vivere_frontend grep -r "admin.viverestays.com/api" /app/dist/`)
- [ ] **No old IP URL in build** (`docker exec vivere_frontend grep -r "35.226.220.107" /app/dist/` should return nothing)
- [ ] Database migrations applied
- [ ] Environment variables correct
- [ ] SSL certificates valid
- [ ] Nginx configuration valid
- [ ] Firewall rules correct
- [ ] **Browser cache cleared** (test in Incognito mode or hard refresh)

---

## 🆘 Emergency Contacts and Resources

### Quick Reference
```bash
# VM SSH
ssh alejoveintimilla@35.226.220.107

# Service Management
docker compose -f docker-compose.remote.yml <command>
sudo systemctl <command> nginx
sudo certbot <command>

# Log Access
docker logs vivere_backend --tail 50
docker logs vivere_frontend --tail 50
sudo tail -f /var/log/nginx/error.log

# Status Checks
docker ps
sudo systemctl status nginx
sudo certbot certificates
```

### Important URLs
- Production Frontend: https://app.viverestays.com
- Production Backend: https://admin.viverestays.com
- API Documentation: https://admin.viverestays.com/api/docs/
- Django Admin: https://admin.viverestays.com/admin/

### Documentation
- This file: `DEPLOYMENT.md`
- Backend README: `backend/README.md`
- Environment template: `env.gcp.txt`

---

## 🔮 Future Improvements

### Short-term (1-3 months)
- [ ] Implement monitoring dashboard
- [ ] Set up automated backups
- [ ] Add health check endpoints
- [ ] Configure log aggregation
- [ ] Implement CI/CD pipeline

### Medium-term (3-6 months)
- [ ] Consider Cloud Run for auto-scaling
- [ ] Add Cloud SQL for managed database
- [ ] Implement CDN for static assets
- [ ] Set up staging environment
- [ ] Add performance monitoring

### Long-term (6-12 months)
- [ ] Multi-region deployment
- [ ] Disaster recovery plan
- [ ] Load balancing across instances
- [ ] Automated testing in deployment pipeline
- [ ] Infrastructure as Code (Terraform)

---

**Document Owner**: DevOps Team  
**Review Frequency**: Quarterly  
**Last Review**: October 30, 2025

