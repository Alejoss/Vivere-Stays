# Vivere Stays - Project Setup Guide

This guide will walk you through setting up the Vivere Stays project after cloning it from a remote repository.

## 🚀 Quick Setup

### Prerequisites

- **Docker and Docker Compose** installed on your system
- **Git** for cloning the repository
- **Node.js 18+** (for local development, optional)

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Vivere-Stays
```

#### 2. Set Up Environment Variables

**Backend Environment:**
```bash
cp backend/env.example backend/.env
```

Edit `backend/.env` with your configuration:
```env
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
DB_NAME=vivere_stays_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=db
DB_PORT=5432
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Frontend Environment:**
```bash
cp frontend/env.example frontend/.env
```

Edit `frontend/.env` with your configuration:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_MAPBOX_TOKEN=your-mapbox-token-here
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key-here
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

#### 3. Generate Frontend Dependencies (Required for Docker Build)

```bash
cd frontend
npm install
cd ..
```

**Why this step is needed:** The Docker build uses `npm ci` which requires a `package-lock.json` file. Running `npm install` generates this file.

#### 4. Build and Start the Application

```bash
docker-compose up --build
```

This command will:
- Build all Docker containers
- Start all services (frontend, backend, database, redis, celery)
- Set up the network between services

#### 5. Access the Application

Once all services are running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

## 🔧 Development Workflow

### Starting the Application

```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Start with rebuild (if you made changes)
docker-compose up --build
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (database data)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f
```

### Database Management

```bash
# Access Django shell
docker-compose exec backend python manage.py shell

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic
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
docker-compose restart db

# Check database logs
docker-compose logs db
```

#### 4. Frontend Not Loading
```bash
# Check if package-lock.json exists
ls frontend/package-lock.json

# If missing, regenerate it
cd frontend && npm install && cd ..
```

#### 5. Backend API Errors
```bash
# Check Django logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

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
docker-compose exec backend python manage.py test
```

### Frontend Tests (if implemented)
```bash
docker-compose exec frontend npm test
```

## 📁 Project Structure

```
Vivere Stays/
├── backend/                 # Django REST API
│   ├── vivere_stays/       # Django project settings
│   ├── users/              # User management
│   ├── properties/         # Property listings
│   ├── bookings/           # Booking system
│   ├── payments/           # Payment processing
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Backend container
│   └── .env               # Backend environment variables
├── frontend/               # React + Vite application
│   ├── src/               # React source code
│   ├── package.json       # Node.js dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── Dockerfile         # Frontend container
│   └── .env               # Frontend environment variables
├── docker-compose.yml      # Multi-service orchestration
├── README.md              # Project overview
└── SETUP.md               # This file
```

## 🔐 Environment Variables Reference

### Backend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Django debug mode | `True` |
| `SECRET_KEY` | Django secret key | `your-secret-key-here` |
| `ALLOWED_HOSTS` | Allowed hosts | `localhost,127.0.0.1,0.0.0.0` |
| `DB_NAME` | Database name | `vivere_stays_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_HOST` | Database host | `db` |
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

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs: `docker-compose logs`
3. Ensure all prerequisites are installed
4. Verify environment variables are set correctly

---

**Happy coding!** 🎉 