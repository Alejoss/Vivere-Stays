# Vivere Stays Backend

docker-compose exec vivere_backend python manage.py makemigrations
docker-compose exec vivere_backend python manage.py migrate
docker-compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate

# Startapp
docker-compose exec vivere_backend python manage.py startapp booking

# Populate Database
docker-compose exec vivere_backend python manage.py populate_price_history --delete-existing
docker-compose exec vivere_backend python manage.py populate_competitor_prices --delete-existing
docker-compose exec vivere_backend python manage.py populate_daily_performance

# Server commands
https://vivere-fe.algobeat.com/
https://vivere-stays.algobeat.com/
ssh root@46.62.171.162
docker-compose down
./deploy-all.sh
docker-compose logs -f vivere_backend
populate do

test@vivere.com
Test12345
19391

Django REST API backend for the Vivere Stays vacation rental platform.

## 🏗️ Architecture

### Django Apps

- **users**: Custom user model and authentication
- **properties**: Property listing and management
- **bookings**: Reservation system
- **payments**: Payment processing

### Key Technologies

- **Django 4.2**: Web framework
- **Django REST Framework**: API development
- **PostgreSQL**: Primary database
- **Redis**: Caching and Celery broker
- **Celery**: Background task processing
- **JWT**: Authentication tokens
- **CORS**: Cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL
- Redis

### Local Development

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run development server**
   ```bash
   python manage.py runserver
   ```

### Docker Development

```bash
docker-compose up backend
```

## 📋 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register/` | User registration |
| POST | `/api/v1/auth/login/` | User login |
| POST | `/api/v1/auth/refresh/` | Token refresh |
| GET | `/api/v1/auth/profile/` | User profile |

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/properties/` | List properties |
| GET | `/api/v1/properties/{id}/` | Property details |
| POST | `/api/v1/properties/create/` | Create property |
| PUT | `/api/v1/properties/{id}/update/` | Update property |
| DELETE | `/api/v1/properties/{id}/delete/` | Delete property |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/bookings/` | List user bookings |
| GET | `/api/v1/bookings/{id}/` | Booking details |
| POST | `/api/v1/bookings/create/` | Create booking |
| PUT | `/api/v1/bookings/{id}/update/` | Update booking |
| PUT | `/api/v1/bookings/{id}/cancel/` | Cancel booking |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/payments/` | List user payments |
| GET | `/api/v1/payments/{id}/` | Payment details |
| POST | `/api/v1/payments/create/` | Create payment |

## 🔧 Configuration

### Environment Variables

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
DB_NAME=vivere_stays_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# JWT
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ACCESS_TOKEN_LIFETIME=5
JWT_REFRESH_TOKEN_LIFETIME=1
```

## 🗄️ Database Models

### User Model
- Custom user model extending AbstractUser
- Email as primary identifier
- User types: guest, host, admin
- Profile information and verification status

### Property Model
- Property details (title, description, location)
- Amenities and features
- Pricing and availability
- Image management
- Host association

### Booking Model
- Guest and property association
- Check-in/check-out dates
- Booking status management
- Special requests and pricing

### Payment Model
- Payment method and status
- Transaction tracking
- Booking association

## 🧪 Testing

### Run Tests
```bash
python manage.py test
```

### Run Specific App Tests
```bash
python manage.py test users
python manage.py test properties
python manage.py test bookings
python manage.py test payments
```

### Coverage Report
```bash
coverage run --source='.' manage.py test
coverage report
coverage html
```

## 🔍 Management Commands

### Database
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### Static Files
```bash
python manage.py collectstatic
```

### Shell
```bash
python manage.py shell
```

## 🚀 Deployment

### Production Settings

1. **Update settings.py** for production
2. **Set environment variables**
3. **Run migrations**
4. **Collect static files**
5. **Configure web server (Gunicorn)**

### Docker Deployment

```bash
docker build -t vivere-stays-backend .
docker run -p 8000:8000 vivere-stays-backend
```

## 📚 Documentation

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🤝 Contributing

1. Follow Django coding standards
2. Write tests for new features
3. Update documentation
4. Submit pull requests

---



**Backend Team** - Building robust APIs for amazing experiences! 🚀 