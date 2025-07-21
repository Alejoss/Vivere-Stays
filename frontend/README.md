# Vivere Stays Frontend

React-based frontend application for the Vivere Stays vacation rental platform.

## 🏗️ Architecture

### Key Technologies

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API communication
- **React Query**: Data fetching and caching
- **React Hook Form**: Form management with validation
- **React Hot Toast**: User notifications
- **Lucide React**: Icon library

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.js      # Navigation component
│   ├── Footer.js      # Footer component
│   └── PrivateRoute.js # Protected route wrapper
├── contexts/           # React contexts
│   └── AuthContext.js  # Authentication context
├── pages/              # Page components
│   ├── Home.js        # Landing page
│   ├── Login.js       # Login page
│   ├── Register.js    # Registration page
│   ├── PropertyList.js # Property listing
│   ├── PropertyDetail.js # Property details
│   ├── Dashboard.js   # User dashboard
│   ├── Profile.js     # User profile
│   └── BookingHistory.js # Booking management
├── App.js             # Main app component
└── index.js           # Application entry point
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000

### Docker Development

```bash
docker-compose up frontend
```

## 🎨 UI Components

### Design System

The application uses Tailwind CSS with a custom design system:

- **Colors**: Blue primary palette with gray neutrals
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Components**: Reusable component classes

### Key Components

#### Navigation
- Responsive navbar with mobile menu
- User authentication state management
- Dropdown menus for user actions

#### Forms
- Consistent form styling with Tailwind
- Form validation with React Hook Form
- Error handling and user feedback

#### Cards
- Property cards with image galleries
- Booking cards with status indicators
- Profile cards with user information

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# External Services
VITE_MAPBOX_TOKEN=your-mapbox-token-here
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key-here
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          // ... more shades
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

## 📱 Pages

### Public Pages

- **Home**: Landing page with search functionality
- **Login**: User authentication
- **Register**: User registration
- **Property List**: Browse available properties
- **Property Detail**: View property details

### Protected Pages

- **Dashboard**: User overview and management
- **Profile**: User profile management
- **Booking History**: View and manage bookings

## 🔐 Authentication

### Auth Context

The application uses React Context for authentication state management:

```javascript
const { user, login, register, logout } = useAuth();
```

### Protected Routes

Routes are protected using the `PrivateRoute` component:

```javascript
<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
/>
```

### Token Management

- JWT tokens stored in localStorage
- Automatic token refresh
- Axios interceptors for authentication headers

## 🌐 API Integration

### Axios Configuration

```javascript
// Base configuration
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

// Request interceptor for authentication
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### React Query Integration

```javascript
// Data fetching with React Query
const { data, isLoading, error } = useQuery('properties', fetchProperties);
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage --watchAll=false
```

### Testing Libraries

- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **MSW**: API mocking

## 🚀 Build and Deployment

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run build
```

### Docker Build
```bash
docker build -t vivere-stays-frontend .
```

## 📦 Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## 🎯 Features

### Implemented Features

- ✅ User authentication (login/register)
- ✅ Responsive navigation
- ✅ Landing page with search
- ✅ Protected routes
- ✅ Form validation
- ✅ Toast notifications
- ✅ Modern UI with Tailwind CSS

### Planned Features

- 🔄 Property listing and details
- 🔄 Booking management
- 🔄 User dashboard
- 🔄 Profile management
- 🔄 Image galleries
- 🔄 Map integration
- 🔄 Payment processing
- 🔄 Real-time notifications

## 📚 Documentation

- [React Documentation](https://reactjs.org/docs/)
- [React Router](https://reactrouter.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)

## 🤝 Contributing

1. Follow React best practices
2. Use functional components with hooks
3. Write tests for new components
4. Maintain consistent styling with Tailwind
5. Update documentation

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS settings include frontend URL
2. **API Connection**: Check `VITE_API_URL` environment variable
3. **Build Errors**: Clear node_modules and reinstall dependencies
4. **Styling Issues**: Ensure Tailwind CSS is properly configured
5. **Vite Dev Server**: Use `npm run dev` instead of `npm start`

---

**Frontend Team** - Creating beautiful user experiences! ✨ 