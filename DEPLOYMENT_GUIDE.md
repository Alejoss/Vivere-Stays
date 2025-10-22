# Deployment Guide

This guide explains how to safely deploy to different environments without losing configuration.

## 🔒 **Security Features:**

- ✅ **No passwords in repository** - all sensitive data uses placeholders
- ✅ **Safe to copy-paste** - templates won't overwrite existing credentials
- ✅ **Environment-specific** - each environment has its own template

## 📋 **Environment Templates:**

### **Local Development:**
```bash
cp env.local.txt .env
# Edit .env to add your ngrok token
docker-compose up -d
```

### **Staging Server:**
```bash
cp env.staging.txt .env
# Edit .env to add your actual production database credentials and ngrok token
docker-compose -f docker-compose.remote.yml up -d
```

### **Production:**
```bash
cp env.production.txt .env
# Edit .env to add your actual production database credentials and ngrok token
docker-compose -f docker-compose.remote.yml up -d
```

## 🎯 **Safe Workflow for Staging:**

### **1. After pulling new code:**
```bash
# Copy the staging template
cp env.staging.txt .env

# Edit .env with your actual credentials
nano .env
```

### **2. Update these values in .env:**
```bash
# Replace these placeholders with actual values:
PROD_POSTGRES_PASSWORD=your_actual_production_password_here
NGROK_AUTHTOKEN=your_ngrok_token_here
```

### **3. Deploy:**
```bash
docker-compose -f docker-compose.remote.yml up -d
```

## ✅ **Why This is Safe:**

1. **Templates use placeholders** - no real credentials in repo
2. **Staging and local are similar** - easy to maintain
3. **No risk of losing data** - templates don't overwrite existing credentials
4. **Clear separation** - each environment has its own template
5. **Git-safe** - all templates are safe to commit

## 🔧 **Environment Differences:**

| Environment | Database | Docker Compose | Template |
|-------------|----------|----------------|----------|
| **Local** | Local PostgreSQL | `docker-compose.yml` | `env.local.txt` |
| **Staging** | Remote Production | `docker-compose.remote.yml` | `env.staging.txt` |
| **Production** | Remote Production | `docker-compose.remote.yml` | `env.production.txt` |

## 📝 **Notes:**

- **Staging and Production** use the same database but different configurations
- **Local development** uses local PostgreSQL container
- **All sensitive data** must be added manually after copying templates
- **Templates are safe** to commit to repository
