# Vivere Stays - GCP Deployment Checklist

Quick reference for deploying the updated configuration to the GCP VM.

## Pre-Deployment ☑️

- [ ] Files updated locally:
  - [ ] `backend/requirements.txt` (Gunicorn added)
  - [ ] `docker-compose.remote.yml` (Updated for production)
  - [ ] `frontend/Dockerfile.prod` (Created)
  - [ ] `env.gcp.txt` (Environment template)
  
- [ ] Changes committed to git (optional but recommended)

## Step 1: Update Firewall 🔥

Run from your **local machine** with gcloud CLI:

```bash
gcloud compute firewall-rules update vivere-allow-http --allow tcp:8000,tcp:3000
```

**Verify**:
```bash
gcloud compute firewall-rules describe vivere-allow-http --format="get(allowed)"
```

Expected: `[{'IPProtocol': 'tcp', 'ports': ['8000', '3000']}]`

---

## Step 2: SSH to VM 🖥️

```bash
ssh alejoveintimilla@35.226.220.107
```

---

## Step 3: Update Code on VM 📦

### Option A: Using Git (Recommended)
```bash
cd ~/Vivere-Stays
git pull origin main
```

### Option B: Manual Copy
Copy the modified files from your local machine to the VM.

---

## Step 4: Update Environment Variables ⚙️

```bash
cd ~/Vivere-Stays

# Copy template
cp env.gcp.txt .env

# Generate new SECRET_KEY
docker exec vivere_backend python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Edit .env and paste the SECRET_KEY
nano .env
```

**Update these values**:
- `SECRET_KEY` - Paste generated key
- `DEBUG=False` - Confirm it's False
- Verify database credentials are correct

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Deploy Services 🚀

```bash
cd ~/Vivere-Stays

# Stop current containers
docker-compose -f docker-compose.remote.yml down

# Rebuild and start
docker-compose -f docker-compose.remote.yml up --build -d
```

**Expected output**:
```
Building vivere_backend
Building vivere_frontend
Creating vivere_backend ... done
Creating vivere_frontend ... done
```

---

## Step 6: Verify Deployment ✅

### Check Container Status
```bash
docker ps
```

**Expected**: Both `vivere_backend` and `vivere_frontend` with status `Up`

### Check Logs
```bash
# Backend logs
docker logs vivere_backend --tail 30

# Frontend logs  
docker logs vivere_frontend --tail 30
```

**Look for**:
- Backend: `Listening at: http://0.0.0.0:8000` (Gunicorn)
- Frontend: Server started on port 3000
- No ERROR messages

### Test Locally on VM
```bash
# Test backend
curl http://localhost:8000/api/profiles/check-auth/
# Expected: {"is_authenticated":false}

# Test frontend
curl http://localhost:3000/
# Expected: HTML content
```

---

## Step 7: Test External Access 🌐

Run from your **local machine**:

```bash
# Test backend
curl http://35.226.220.107:8000/api/profiles/check-auth/

# Test frontend
curl http://35.226.220.107:3000/
```

### Open in Browser
- Backend API Docs: http://35.226.220.107:8000/api/docs/
- Frontend App: http://35.226.220.107:3000/

---

## Troubleshooting 🔧

### If containers don't start:
```bash
# Check detailed logs
docker logs vivere_backend
docker logs vivere_frontend

# Check if ports are in use
sudo netstat -tuln | grep -E '(8000|3000)'
```

### If backend returns errors:
```bash
# Check database connection
docker exec vivere_backend python manage.py check --database default

# Check environment variables
docker exec vivere_backend env | grep -E '(DEBUG|SECRET|POSTGRES)'
```

### If frontend can't reach backend:
```bash
# Check CORS settings
docker exec vivere_backend env | grep CORS

# Test from frontend container
docker exec vivere_frontend wget -O- http://vivere_backend:8000/api/profiles/check-auth/
```

### If external access times out:
```bash
# Verify firewall (from local machine)
gcloud compute firewall-rules list --filter="name=vivere-allow-http"

# Check if ports are listening (on VM)
sudo ss -tuln | grep -E '(8000|3000)'
```

---

## Rollback 🔄

If something goes wrong:

```bash
# Stop services
docker-compose -f docker-compose.remote.yml down

# Restore previous .env (if backed up)
cp .env.backup .env

# Start with old configuration
docker run -d --name vivere_backend \
  -p 8000:8000 \
  -v $(pwd)/backend:/app \
  --env-file .env \
  vivere-stays-vivere_backend \
  python manage.py runserver 0.0.0.0:8000
```

---

## Success Criteria ✨

- ✅ Backend accessible at http://35.226.220.107:8000
- ✅ Frontend accessible at http://35.226.220.107:3000
- ✅ API documentation loads at http://35.226.220.107:8000/api/docs/
- ✅ Frontend can communicate with backend
- ✅ No errors in container logs
- ✅ Both containers show status "Up"

---

## Post-Deployment Tasks 📋

- [ ] Create database backup
- [ ] Document any issues encountered
- [ ] Monitor logs for 24 hours
- [ ] Plan HTTPS implementation
- [ ] Set up monitoring/alerting
- [ ] Document custom domain setup (if needed)

---

**Quick Reference**:
- VM IP: `35.226.220.107`
- Backend Port: `8000`
- Frontend Port: `3000`
- SSH: `ssh alejoveintimilla@35.226.220.107`

