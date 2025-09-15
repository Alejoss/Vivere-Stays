# Vivere Stays - Project Setup Guide

This guide will walk you through setting up the Vivere Stays project after cloning it from a remote repository.

## 🚀 Quick Setup

### Prerequisites

- **Docker and Docker Compose** installed on your system
- **Git** for cloning the repository
- **Node.js 18+** (for frontend development)
- **npm (Node Package Manager)** (usually comes with Node.js, required for frontend development)

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Vivere-Stays
```

#### 2. Set Up Environment Variables

You need to create `.env` files in three locations:

**Root Environment (for Docker Compose):**
```bash
# Create .env in the root directory
touch .env
```

Edit the root `.env` file with your configuration:
```env
# Database Configuration
POSTGRES_DB=vivere_stays_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

```

**Backend Environment:**
```bash
# Create .env in the backend directory
touch backend/.env
```

Edit `backend/.env` with your configuration:
```env
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database Configuration
DB_NAME=vivere_stays_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=postgres
DB_PORT=5432

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email Configuration (if needed)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

**Frontend Environment:**
```bash
# Create .env in the frontend directory
touch frontend/.env
```

Edit `frontend/.env` with your configuration:
```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# External Services (optional)
VITE_MAPBOX_TOKEN=your-mapbox-token-here
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key-here
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

#### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

#### 4. Build and Start the Backend Services

```bash
docker-compose up --build
```

This command will:
- Build the backend Docker container
- Start the backend service and PostgreSQL database
- Set up the network between services

#### 5. Run Database Migrations

In a new terminal window, run the migrations:

```bash
docker-compose exec vivere_backend python manage.py migrate
```

#### 6. Create Initial Data

**Create Property Management Systems:**
```bash
docker-compose exec vivere_backend python manage.py create_pms_systems
```

This will create the 4 Property Management Systems: MrPlan, Apaleo, RoomRaccoon, and Avirato.

**Create Admin User:**
```bash
docker-compose exec vivere_backend python manage.py create_admin
```

This creates a superuser account for accessing the Django admin interface.

#### 7. (Optional) Populate Sample Data

For development and testing purposes, you can populate the database with sample data:

**Populate Price History:**
```bash
docker-compose exec vivere_backend python manage.py populate_price_history
```

This creates dummy price history data for the past 100 days and future 100 days for all properties.

**Populate Daily Performance Analytics:**
```bash
docker-compose exec vivere_backend python manage.py populate_daily_performance
```

This seeds the analytics system with sample performance data.

**Populate Competitor Prices:**
```bash
docker-compose exec vivere_backend python manage.py populate_competitor_prices
```

This creates dummy competitor price data for dynamic pricing analysis.

**Populate Unified Rooms and Rates:**
```bash
docker-compose exec vivere_backend python manage.py populate_unified_rooms_rates
```

This creates sample room and rate data that matches the frontend Available Rates interface, including different room types (Standard Double, Deluxe Room, Suite, etc.) with various rate categories (Flexible, Non-refundable, Advance Purchase).

#### 8. Start the Frontend Development Server

In another terminal window, start the frontend:

```bash
cd frontend
npm run dev
```

#### 9. Access the Application

Once all services are running, you can access:

- **Frontend**: http://localhost:3000 (or the port shown by Vite)
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

## 🔧 Development Workflow

### Starting the Application

```bash
# Start backend services
docker-compose up

# Start frontend (in a separate terminal)
cd frontend
npm run dev
```

### Stopping the Application

```bash
# Stop backend services
docker-compose down

# Stop frontend (Ctrl+C in the frontend terminal)
```

### Viewing Logs

```bash
# View backend logs
docker-compose logs vivere_backend

# View database logs
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f vivere_backend
```

### Database Management

```bash
# Access Django shell
docker-compose exec vivere_backend python manage.py shell

# Run migrations
docker-compose exec vivere_backend python manage.py migrate

# Create superuser
docker-compose exec vivere_backend python manage.py create_admin

# Collect static files
docker-compose exec vivere_backend python manage.py collectstatic
```

### Management Commands Reference

The following Django management commands are available:

**User Management:**
- `create_admin` - Create a superuser account
- `create_pms_systems` - Create Property Management Systems (MrPlan, Apaleo, RoomRaccoon, Avirato)

**Data Population (Development/Testing):**
- `populate_price_history` - Create dummy price history data for properties
- `populate_daily_performance` - Seed analytics with sample performance data
- `populate_competitor_prices` - Create dummy competitor price data
- `populate_unified_rooms_rates` - Create sample room and rate data for Available Rates interface

**Usage Examples:**
```bash
# Create admin with custom options
docker-compose exec vivere_backend python manage.py create_admin

# Populate data with dry-run to see what would be created
docker-compose exec vivere_backend python manage.py populate_price_history --dry-run

# Populate data and delete existing records first
docker-compose exec vivere_backend python manage.py populate_competitor_prices --delete-existing

# Populate analytics for specific property
docker-compose exec vivere_backend python manage.py populate_daily_performance --property-id 123 --start 2025-01-01 --days 30

# Populate unified rooms and rates with dry-run to see what would be created
docker-compose exec vivere_backend python manage.py populate_unified_rooms_rates --dry-run

# Populate unified rooms and rates and delete existing records first
docker-compose exec vivere_backend python manage.py populate_unified_rooms_rates --delete-existing
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8000

# Kill the process or change ports in docker-compose.yml
```

#### 2. Docker Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### 3. Database Connection Issues
```bash
# Restart database service
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

#### 4. Frontend Not Loading
```bash
# Check if dependencies are installed
cd frontend && npm install && cd ..

# Check if the dev server is running
npm run dev
```

#### 5. Backend API Errors
```bash
# Check Django logs
docker-compose logs vivere_backend

# Restart backend
docker-compose restart vivere_backend
```

#### 6. Email Verification Development Bypass
During development, you can bypass email verification by using the test code:
- **Verification Code**: `19391`

This bypass is hardcoded in the `email_service.py` file and will work for any email address during development. This is useful for testing the onboarding flow without having to set up actual email delivery.

### Reset Everything

If you need to start completely fresh:

```bash
# Stop and remove everything
docker-compose down -v
docker system prune -a

# Remove node_modules (if exists)
rm -rf frontend/node_modules

# Start fresh
cd frontend && npm install && cd ..
docker-compose up --build
```

## 🧪 Testing

### Backend Tests
```bash
docker-compose exec vivere_backend python manage.py test
```

### Frontend Tests (if implemented)
```bash
cd frontend
npm test
```

## 📁 Project Structure

```
Vivere Stays/
├── backend/                 # Django REST API
│   ├── vivere_stays/       # Django project settings
│   ├── profiles/           # User profiles and authentication
│   ├── booking/            # Booking system
│   ├── dynamic_pricing/    # Dynamic pricing system
│   ├── analytics/          # Analytics and reporting
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Backend container
│   └── .env               # Backend environment variables
├── frontend/               # React + Vite application
│   ├── client/            # React source code
│   ├── shared/            # Shared utilities and API
│   ├── package.json       # Node.js dependencies
│   ├── vite.config.ts     # Vite configuration
│   └── .env               # Frontend environment variables
├── docker-compose.yml      # Backend services orchestration
├── README.md              # Project overview
└── SETUP.md               # This file
```

## 🔐 Environment Variables Reference

### Root (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `vivere_stays_db` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `password` |
| `POSTGRES_HOST` | Database host | `postgres` |
| `POSTGRES_PORT` | Database port | `5432` |
| `REDIS_URL` | Redis connection | `redis://redis:6379/0` |

### Backend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Django debug mode | `True` |
| `SECRET_KEY` | Django secret key | `your-secret-key-here` |
| `ALLOWED_HOSTS` | Allowed hosts | `localhost,127.0.0.1,0.0.0.0` |
| `DB_NAME` | Database name | `vivere_stays_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_HOST` | Database host | `postgres` |
| `DB_PORT` | Database port | `5432` |
| `REDIS_URL` | Redis connection | `redis://redis:6379/0` |
| `CORS_ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

### Frontend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api/v1` |
| `VITE_MAPBOX_TOKEN` | Mapbox API token | `your-mapbox-token-here` |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe public key | `your-stripe-public-key-here` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | `your-google-maps-api-key-here` |

## 🚀 Production Deployment

For production deployment, you'll need to:

1. **Update environment variables** for production settings
2. **Set `DEBUG=False`** in backend environment
3. **Use production database** credentials
4. **Configure domain names** in CORS settings
5. **Set up SSL certificates** for HTTPS
6. **Build frontend for production** using `npm run build`

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs: `docker-compose logs`
3. Ensure all prerequisites are installed
4. Verify environment variables are set correctly

---

**Happy coding!** 🎉 