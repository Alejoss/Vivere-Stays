# Database Configuration Guide

This guide explains how to configure database connections for the Vivere Stays project.

## Overview

The project supports three database configuration modes:

1. **Local Development** - Uses Docker PostgreSQL container
2. **Production Database Testing** - Tests production database locally
3. **Production Deployment** - Uses production database in production environment

## Quick Start

### Local Development (Default)
```bash
# Copy local environment file
cp env.local.txt .env

# Start all services (including postgres)
docker-compose up -d

# Run migrations
docker-compose exec vivere_backend python manage.py migrate
```

### Test Production Database Locally
```bash
# Copy production test environment file
cp env.production.test.txt .env

# Update the PROD_POSTGRES_* values with your actual production DB credentials

# Start only backend (no postgres)
docker-compose -f docker-compose.remote.yml up -d

# Test connection
docker-compose -f docker-compose.remote.yml exec vivere_backend python manage.py test_db_connection

# Run migrations on production DB
docker-compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate
```

### Production Deployment
```bash
# Copy production environment file
cp env.production.txt .env

# Update all production values

# Deploy using remote database compose file
docker-compose -f docker-compose.remote.yml up -d
```

## Environment Files

### env.local.txt (Local Development)
- **Purpose**: Daily development with Docker PostgreSQL
- **Database**: Local PostgreSQL container
- **Configuration**: `ENVIRONMENT=development`, `USE_REMOTE_DB=False`

### env.staging.txt (Staging Deployment)
- **Purpose**: Staging server deployment
- **Database**: Remote production database
- **Configuration**: `ENVIRONMENT=production`, `USE_REMOTE_DB=True`

### env.production.txt (Production Deployment)
- **Purpose**: Actual production deployment
- **Database**: Remote production database
- **Configuration**: `ENVIRONMENT=production`, `USE_REMOTE_DB=True`

## Database Environment Variables

| Variable | Local Development | Production Testing | Production Deployment |
|----------|------------------|-------------------|----------------------|
| `ENVIRONMENT` | `development` | `development` | `production` |
| `USE_REMOTE_DB` | `False` | `True` | `True` |
| `POSTGRES_DB` | `vivere_stays` | (not used) | (not used) |
| `POSTGRES_USER` | `vivere_user` | (not used) | (not used) |
| `POSTGRES_PASSWORD` | `vivere_password` | (not used) | (not used) |
| `POSTGRES_HOST` | `postgres` | (not used) | (not used) |
| `POSTGRES_PORT` | `5432` | (not used) | (not used) |
| `PROD_POSTGRES_DB` | (not used) | `your_prod_db` | `your_prod_db` |
| `PROD_POSTGRES_USER` | (not used) | `your_prod_user` | `your_prod_user` |
| `PROD_POSTGRES_PASSWORD` | (not used) | `your_prod_password` | `your_prod_password` |
| `PROD_POSTGRES_HOST` | (not used) | `your_prod_host` | `your_prod_host` |
| `PROD_POSTGRES_PORT` | (not used) | `5432` | `5432` |
| `PROD_POSTGRES_SSLMODE` | (not used) | `require` | `require` |

## Database Connection Testing

### Test Database Connection
```bash
# Test current database configuration
docker-compose exec vivere_backend python manage.py test_db_connection
```

This command will:
- Display current database configuration
- Test database connectivity
- Check available schemas
- Verify required schemas exist
- Test table access in each schema

### Expected Output
```
=== Database Configuration ===
Environment: development
Use Remote DB: False
Host: postgres
Port: 5432
Database: vivere_stays
User: vivere_user
SSL Mode: Not set
✓ Database connection successful!
PostgreSQL Version: PostgreSQL 16.0
Available schemas: webapp_backend, booking, core, public
✓ All required schemas present
✓ Schema 'webapp_backend' has tables
✓ Schema 'booking' has tables
✓ Schema 'core' has tables
✓ Schema 'public' has tables
```

## Docker Compose Profiles

The system uses Docker Compose profiles to control which services start:

### Default Profile (Local Development)
```bash
# Start all services including postgres
docker-compose up -d
```

### Local Profile (Explicit)
```bash
# Start all services including postgres
docker-compose --profile local up -d
```

### Remote Database (No Local Postgres)
```bash
# Start only backend (postgres won't start)
docker-compose up vivere_backend -d
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
**Symptoms**: `django.db.utils.OperationalError: could not connect to server`

**Solutions**:
- Check if PostgreSQL container is running: `docker-compose ps`
- Verify database credentials in `.env` file
- Check network connectivity between containers

#### 2. SSL Connection Errors
**Symptoms**: `sslmode value "require" invalid when SSL support is not compiled in`

**Solutions**:
- For local development, set `PROD_POSTGRES_SSLMODE=disable`
- For production, ensure PostgreSQL client supports SSL
- Check if production database requires SSL

#### 3. Permission Denied
**Symptoms**: `django.db.utils.ProgrammingError: permission denied for schema`

**Solutions**:
- Check database user permissions
- Verify user has access to required schemas
- Ensure user can create tables in schemas

#### 4. Missing Schemas
**Symptoms**: `relation "table_name" does not exist`

**Solutions**:
- Run migrations: `python manage.py migrate`
- Check if schemas exist: `python manage.py test_db_connection`
- Create schemas manually if needed

### Debug Commands

```bash
# Check database connection
docker-compose exec vivere_backend python manage.py dbshell

# Run database migrations
docker-compose exec vivere_backend python manage.py migrate

# Create superuser
docker-compose exec vivere_backend python manage.py createsuperuser

# Check environment variables
docker-compose exec vivere_backend env | grep POSTGRES

# Check Django settings
docker-compose exec vivere_backend python manage.py shell -c "from django.conf import settings; print(settings.DATABASES)"

# Test database connection
docker-compose exec vivere_backend python manage.py test_db_connection
```

## Security Best Practices

### Development
- Use strong passwords even in development
- Don't commit sensitive data to version control
- Use environment files for configuration
- Regularly rotate development credentials

### Production
- Use managed database services (AWS RDS, Google Cloud SQL, Azure Database)
- Enable SSL/TLS connections
- Use strong, unique passwords
- Implement connection pooling
- Monitor database performance
- Regular security updates
- Use environment-specific credentials
- Never commit production credentials

## Backup and Recovery

### Development
```bash
# Backup database
docker-compose exec postgres pg_dump -U vivere_user vivere_stays > backup.sql

# Restore database
docker-compose exec -T postgres psql -U vivere_user vivere_stays < backup.sql
```

### Production
- Use managed database backup services
- Implement automated backup schedules
- Test recovery procedures regularly
- Monitor backup success/failure
- Store backups in secure locations

## Performance Optimization

### Development
- Use local database for faster development
- Enable query logging for debugging
- Use development-optimized settings

### Production
- Use connection pooling (`CONN_MAX_AGE=60`)
- Enable SSL for security
- Monitor database performance
- Use read replicas for scaling
- Implement database indexing strategies
- Regular performance monitoring

## Migration Guide

### From Existing Setup
If you're upgrading from an existing setup:

1. **Backup your current database**:
   ```bash
   docker-compose exec postgres pg_dump -U vivere_user vivere_stays > backup.sql
   ```

2. **Update your settings**:
   - The new configuration is backward compatible
   - Your existing `.env` file will continue to work

3. **Test the new configuration**:
   ```bash
   docker-compose exec vivere_backend python manage.py test_db_connection
   ```

4. **Switch to new environment files** (optional):
   ```bash
   cp env.local .env
   # Update any custom values
   ```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the database connection test: `python manage.py test_db_connection`
3. Check Docker logs: `docker-compose logs vivere_backend`
4. Verify environment variables: `docker-compose exec vivere_backend env | grep POSTGRES`
