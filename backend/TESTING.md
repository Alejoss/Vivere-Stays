# API Testing Guide

This guide covers all the testing strategies and tools for the Vivere Stays API.

## Testing Technologies & Tools

### 1. **Automated Testing**
- **pytest**: Modern Python testing framework
- **pytest-django**: Django integration for pytest
- **factory-boy**: Test data generation
- **faker**: Realistic fake data generation
- **coverage**: Code coverage reporting

### 2. **Manual Testing**
- **Postman**: API testing and documentation
- **Insomnia**: Alternative to Postman
- **curl**: Command-line API testing

### 3. **API Documentation**
- **drf-spectacular**: OpenAPI/Swagger documentation
- **Swagger UI**: Interactive API documentation

## Running Tests

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run All Tests
```bash
# Run all tests with coverage
pytest

# Run specific app tests
pytest dynamic_pricing/
pytest profiles/
pytest booking/

# Run specific test types
pytest -m api
pytest -m unit
pytest -m integration
```

### Run Tests with Coverage
```bash
# Generate HTML coverage report
pytest --cov=. --cov-report=html

# View coverage in terminal
pytest --cov=. --cov-report=term-missing
```

### Run Tests in Parallel
```bash
pytest -n auto
```

## Manual Testing with Postman

### 1. Setup Postman Collection
Create a collection called "Vivere Stays API" with the following structure:

```
Vivere Stays API/
├── Authentication/
│   ├── Login
│   └── Refresh Token
├── Dynamic Pricing/
│   ├── Create Property
│   ├── List Properties
│   ├── Get Property Details
│   ├── Update Property
│   ├── Update Property PMS
│   └── Delete Property
├── Profiles/
│   └── [Profile endpoints]
└── Booking/
    └── [Booking endpoints]
```

### 2. Environment Variables
Create environment variables:
- `base_url`: `http://localhost:8000`
- `token`: JWT access token
- `refresh_token`: JWT refresh token

### 3. Authentication Setup
Create a pre-request script for authentication:

```javascript
// Pre-request Script for authenticated endpoints
if (pm.environment.get("token")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("token")
    });
}
```

### 4. Test Scripts
Add test scripts to verify responses:

```javascript
// Test script for property creation
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has property data", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('property');
    pm.expect(response.property).to.have.property('name');
});
```

## API Documentation

### Access Swagger UI
Visit: `http://localhost:8000/api/docs/`

### Access ReDoc
Visit: `http://localhost:8000/api/redoc/`

### Generate OpenAPI Schema
Visit: `http://localhost:8000/api/schema/`

## Testing Best Practices

### 1. **Test Structure**
- Unit tests for individual functions
- Integration tests for API endpoints
- End-to-end tests for complete workflows

### 2. **Test Data**
- Use factories for consistent test data
- Use faker for realistic data
- Clean up test data after each test

### 3. **Authentication Testing**
- Test with valid tokens
- Test with invalid tokens
- Test with expired tokens
- Test without authentication

### 4. **Error Handling**
- Test validation errors
- Test permission errors
- Test not found errors
- Test server errors

### 5. **Performance Testing**
- Test response times
- Test with large datasets
- Test concurrent requests

## Example Test Cases

### Property Creation Test
```python
def test_create_property_success(self, authenticated_client):
    """Test successful property creation."""
    url = reverse('dynamic_pricing:property-create')
    data = {
        'name': 'Test Hotel',
        'booking_hotel_url': 'https://www.booking.com/hotel/test.html',
        'street_address': '123 Test Street',
        'city': 'Test City',
        'country': 'Test Country',
        'postal_code': '12345'
    }
    
    response = authenticated_client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert 'property' in response.data
    assert response.data['property']['name'] == data['name']
```

### Authentication Test
```python
def test_unauthorized_access(self, api_client):
    """Test unauthorized access to protected endpoints."""
    url = reverse('dynamic_pricing:property-list')
    response = api_client.get(url)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

## Debugging Tips

### 1. **Django Debug Toolbar**
- Available in DEBUG mode
- Shows SQL queries, cache hits, etc.
- Access at: `http://localhost:8000/`

### 2. **Logging**
- Check Django logs for errors
- Use `print()` statements in tests
- Use `pytest -s` for output

### 3. **Database Inspection**
```bash
# Access Django shell
python manage.py shell

# Check database
python manage.py dbshell
```

## Continuous Integration

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

## Performance Testing

### Using Apache Bench (ab)
```bash
# Test GET endpoint
ab -n 1000 -c 10 http://localhost:8000/api/dynamic-pricing/properties/

# Test POST endpoint
ab -n 100 -c 5 -p data.json -T application/json http://localhost:8000/api/dynamic-pricing/properties/create/
```

### Using wrk
```bash
# Install wrk
brew install wrk  # macOS
sudo apt-get install wrk  # Ubuntu

# Test API
wrk -t12 -c400 -d30s http://localhost:8000/api/dynamic-pricing/properties/
``` 