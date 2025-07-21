# Vivere Stays - Vacation Rental Platform

A modern, full-stack vacation rental platform built with Django (backend) and React (frontend), featuring Docker containerization for easy deployment and development.

## 🏗️ Project Structure

```
Vivere Stays/
├── backend/                 # Django REST API
│   ├── vivere_stays/       # Django project settings
│   ├── users/              # User management app
│   ├── properties/         # Property listing app
│   ├── bookings/           # Booking management app
│   ├── payments/           # Payment processing app
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Backend container
│   └── env.example        # Environment variables template
├── frontend/               # React application (Vite)
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── pages/         # Page components
│   │   └── ...
│   ├── package.json       # Node.js dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── Dockerfile         # Frontend container
│   └── env.example        # Environment variables template
├── docker-compose.yml      # Multi-service orchestration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Vivere-Stays
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration
   
   # Frontend
   cp frontend/env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin

## 🛠️ Development

### Backend (Django)

The backend is built with Django 4.2 and Django REST Framework, featuring:

- **Authentication**: JWT-based authentication with refresh tokens
- **User Management**: Custom user model with guest/host roles
- **Property Management**: CRUD operations for vacation rentals
- **Booking System**: Reservation management with status tracking
- **Payment Processing**: Payment model for transaction handling
- **API Documentation**: RESTful API with comprehensive endpoints

#### Key Features:
- PostgreSQL database
- Redis for caching and Celery tasks
- CORS support for frontend integration
- File upload handling for property images
- Email notifications (configurable)
- Comprehensive filtering and search capabilities

### Frontend (React + Vite)

The frontend is built with React 18 and Vite for fast development:

- **Build Tool**: Vite for lightning-fast development and builds
- **Routing**: React Router for navigation
- **State Management**: React Context for authentication
- **Styling**: Tailwind CSS for responsive design
- **Forms**: React Hook Form with validation
- **HTTP Client**: Axios for API communication
- **Notifications**: React Hot Toast for user feedback

#### Key Features:
- Responsive design with mobile-first approach
- Modern UI with Tailwind CSS
- Authentication flow with protected routes
- Form validation with Yup schemas
- Image gallery support
- Map integration ready
- Payment processing integration ready

## 🐳 Docker Services

The application runs with the following services:

- **Frontend**: React app served by Nginx (port 3000)
- **Backend**: Django API with Gunicorn (port 8000)
- **Database**: PostgreSQL 15 (port 5432)
- **Cache**: Redis 7 (port 6379)
- **Celery Worker**: Background task processing
- **Celery Beat**: Scheduled task management

## 📋 API Endpoints

### Authentication
- `POST /api/v1/auth/register/` - User registration
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/refresh/` - Token refresh
- `GET /api/v1/auth/profile/` - User profile

### Properties
- `GET /api/v1/properties/` - List properties
- `GET /api/v1/properties/{id}/` - Property details
- `POST /api/v1/properties/create/` - Create property
- `PUT /api/v1/properties/{id}/update/` - Update property
- `DELETE /api/v1/properties/{id}/delete/` - Delete property

### Bookings
- `GET /api/v1/bookings/` - List user bookings
- `GET /api/v1/bookings/{id}/` - Booking details
- `POST /api/v1/bookings/create/` - Create booking
- `PUT /api/v1/bookings/{id}/update/` - Update booking
- `PUT /api/v1/bookings/{id}/cancel/` - Cancel booking

### Payments
- `GET /api/v1/payments/` - List user payments
- `GET /api/v1/payments/{id}/` - Payment details
- `POST /api/v1/payments/create/` - Create payment

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
DATABASE_URL=postgresql://postgres:password@db:5432/vivere_stays_db
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_MAPBOX_TOKEN=your-mapbox-token-here
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key-here
```

## 🚀 Deployment

### Production Deployment

1. **Update environment variables** for production settings
2. **Build and deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up --build
   ```

### Environment-Specific Configurations

- **Development**: Uses volume mounts for hot reloading
- **Production**: Uses multi-stage builds for optimized images
- **Staging**: Can be configured with separate environment files

## 🧪 Testing

### Backend Testing
```bash
docker-compose exec backend python manage.py test
```

### Frontend Testing
```bash
docker-compose exec frontend npm test
```

## 📚 Documentation

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://reactjs.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Vivere Stays** - Making vacation rentals simple and enjoyable! 🏠✨ 