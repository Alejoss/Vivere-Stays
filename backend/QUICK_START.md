# Quick Start Guide - API Testing & Development

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Database
```bash
python manage.py migrate
python manage.py create_admin
```

### 3. Start Development Server
```bash
python manage.py runserver
```

## 🧪 Testing Your API

### Option 1: Automated Tests (Recommended)
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific app tests
pytest dynamic_pricing/
```

### Option 2: Manual Testing with Postman
1. Import `postman_collection.json` into Postman
2. Set environment variables:
   - `base_url`: `http://localhost:8000`
   - `token`: (will be set after login)
3. Run the "Login" request to get a token
4. Test other endpoints

### Option 3: Command Line Testing
```bash
# Make script executable (Linux/Mac)
chmod +x scripts/test_api.sh

# Run all tests
./scripts/test_api.sh all

# Run specific tests
./scripts/test_api.sh auth
./scripts/test_api.sh create
```

### Option 4: API Documentation
- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## 🔧 Development Tools

### Django Debug Toolbar
- Automatically enabled in DEBUG mode
- Shows SQL queries, cache hits, etc.
- Access at: http://localhost:8000/

### Testing with curl
```bash
# Get JWT token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Test protected endpoint
curl -X GET http://localhost:8000/api/dynamic-pricing/properties/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📊 Test Coverage

### Generate Coverage Report
```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html  # View in browser
```

### Coverage Targets
- Aim for 80%+ coverage
- Focus on critical business logic
- Test error conditions

## 🐛 Debugging

### Common Issues
1. **Authentication Errors**: Check JWT token validity
2. **Database Errors**: Run migrations
3. **Import Errors**: Check virtual environment

### Debug Commands
```bash
# Django shell
python manage.py shell

# Check database
python manage.py dbshell

# List URLs
python manage.py show_urls
```

## 📝 Best Practices

### 1. Test Structure
- Unit tests for models and utilities
- Integration tests for API endpoints
- End-to-end tests for complete workflows

### 2. Test Data
- Use factories for consistent data
- Use faker for realistic data
- Clean up after tests

### 3. API Testing
- Test all HTTP methods (GET, POST, PUT, DELETE)
- Test authentication and permissions
- Test validation errors
- Test edge cases

### 4. Performance
- Monitor response times
- Test with realistic data volumes
- Use database indexing

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    - name: Install dependencies
      run: pip install -r requirements.txt
    - name: Run tests
      run: pytest --cov=. --cov-report=xml
```

## 📚 Additional Resources

### Documentation
- [Django REST Framework](https://www.django-rest-framework.org/)
- [pytest Documentation](https://docs.pytest.org/)
- [Postman Learning Center](https://learning.postman.com/)

### Tools
- **Postman**: API testing and documentation
- **Insomnia**: Alternative to Postman
- **curl**: Command-line API testing
- **httpie**: User-friendly curl alternative

### Monitoring
- **Django Debug Toolbar**: Development debugging
- **Django Silk**: Performance profiling
- **Sentry**: Error tracking (production)

## 🎯 Next Steps

1. **Add More Tests**: Expand test coverage for all apps
2. **Performance Testing**: Add load testing with tools like wrk
3. **API Documentation**: Keep Swagger docs updated
4. **Monitoring**: Set up production monitoring
5. **CI/CD**: Implement automated testing pipeline 