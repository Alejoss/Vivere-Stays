# Django Testing Guide

## Overview

This project uses Django's native testing framework with `TestCase` and `APITestCase` for comprehensive test coverage.

## Running Tests

### Basic Commands

```bash
# Run all tests (using default settings)
docker-compose exec vivre_backend python manage.py test

# Run all tests with optimized test settings
docker-compose exec vivre_backend python manage.py test --settings=vivere_stays.test_settings

# Run specific app tests
docker-compose exec vivre_backend python manage.py test profiles --settings=vivere_stays.test_settings
docker-compose exec vivre_backend python manage.py test dynamic_pricing --settings=vivere_stays.test_settings
docker-compose exec vivre_backend python manage.py test analytics --settings=vivere_stays.test_settings
docker-compose exec vivre_backend python manage.py test booking --settings=vivere_stays.test_settings

# Run specific test file
docker-compose exec vivre_backend python manage.py test profiles.tests --settings=vivere_stays.test_settings
docker-compose exec vivre_backend python manage.py test dynamic_pricing.tests.test_api --settings=vivere_stays.test_settings

# Run specific test class
docker-compose exec vivre_backend python manage.py test profiles.tests.AuthenticationViewsTests --settings=vivere_stays.test_settings

# Run specific test method
docker-compose exec vivre_backend python manage.py test profiles.tests.AuthenticationViewsTests.test_user_registration --settings=vivere_stays.test_settings
```

### Coverage Analysis

```bash
# Install coverage if not already installed
docker-compose exec vivre_backend pip install coverage

# Run tests with coverage (using test settings)
docker-compose exec vivre_backend coverage run --source='.' manage.py test --settings=vivere_stays.test_settings

# Generate coverage report
docker-compose exec vivre_backend coverage report

# Generate HTML coverage report
docker-compose exec vivre_backend coverage html

# View HTML report (open in browser)
# The report will be generated in backend/htmlcov/index.html
```

### Verbose Output

```bash
# Run tests with verbose output
docker-compose exec vivre_backend python manage.py test --verbosity=2

# Run tests with debug output
docker-compose exec vivre_backend python manage.py test --debug-mode
```

## Test Configuration

### Test Settings File

The project includes a dedicated `test_settings.py` file that optimizes Django settings for testing:

- **In-memory SQLite database**: Faster test execution
- **Disabled migrations**: Speeds up test database creation
- **Faster password hashing**: Uses MD5 for test speed
- **Disabled logging**: Reduces test output noise
- **Local memory cache**: Faster cache operations
- **Disabled email sending**: Prevents actual emails during tests

### Test Organization

```
backend/
├── test_utils.py                    # Test helper utilities
├── vivere_stays/
│   ├── settings.py                  # Main settings
│   └── test_settings.py             # Optimized test settings
├── profiles/
│   └── tests.py                     # Profile and authentication tests
├── dynamic_pricing/
│   └── tests/
│       └── test_api.py              # Dynamic pricing API tests
├── analytics/
│   └── tests.py                     # Analytics tests
└── booking/
    └── tests.py                     # Booking model tests
```

### Test Categories

1. **Model Tests** (`TestCase`)
   - Test model creation, validation, and relationships
   - Test model methods and properties
   - Test model constraints and business logic

2. **API Tests** (`APITestCase`)
   - Test API endpoints and responses
   - Test authentication and authorization
   - Test request/response serialization
   - Test error handling and edge cases

3. **Integration Tests** (`APITestCase`)
   - Test complete user workflows
   - Test cross-app functionality
   - Test external service integrations

## Test Utilities

### Helper Functions (`test_utils.py`)

```python
from test_utils import (
    create_test_user,           # Create user with profile
    create_admin_user,          # Create admin user
    get_auth_token,            # Get JWT token for user
    create_test_property,      # Create test property
    create_test_pms,           # Create test PMS
    create_test_property_with_pms  # Create property with PMS
)
```

### Example Usage

```python
from django.test import TestCase
from rest_framework.test import APITestCase
from test_utils import create_test_user, create_test_property

class MyAPITests(APITestCase):
    def setUp(self):
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
        self.property = create_test_property()
    
    def test_my_endpoint(self):
        response = self.client.get('/api/my-endpoint/')
        self.assertEqual(response.status_code, 200)
```

## Test Patterns

### Authentication Testing

```python
def test_authenticated_access(self):
    """Test authenticated user can access endpoint."""
    self.client.force_authenticate(user=self.user)
    response = self.client.get('/api/protected/')
    self.assertEqual(response.status_code, 200)

def test_unauthenticated_access(self):
    """Test unauthenticated user cannot access endpoint."""
    response = self.client.get('/api/protected/')
    self.assertEqual(response.status_code, 401)
```

### API Response Testing

```python
def test_api_response_structure(self):
    """Test API response has expected structure."""
    response = self.client.get('/api/endpoint/')
    self.assertEqual(response.status_code, 200)
    self.assertIn('data', response.data)
    self.assertIn('count', response.data)
    self.assertIsInstance(response.data['data'], list)
```

### Model Testing

```python
def test_model_creation(self):
    """Test model can be created with valid data."""
    obj = MyModel.objects.create(
        name='Test Name',
        value=123
    )
    self.assertEqual(str(obj), 'Test Name')
    self.assertEqual(obj.value, 123)

def test_model_validation(self):
    """Test model validation rules."""
    with self.assertRaises(ValidationError):
        MyModel.objects.create(name='')  # Invalid data
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `setUp()` method for common test data
- Clean up after tests (Django handles this automatically)

### 2. Descriptive Test Names
```python
def test_user_registration_with_valid_data_returns_201(self):
    """Test that user registration with valid data returns 201 status."""
    pass

def test_user_registration_with_duplicate_email_returns_400(self):
    """Test that user registration with duplicate email returns 400 status."""
    pass
```

### 3. Test Data Management
- Use factories or helper functions for test data
- Avoid hardcoded values when possible
- Use realistic test data

### 4. Assertion Best Practices
```python
# Good: Specific assertions
self.assertEqual(response.status_code, 201)
self.assertIn('user', response.data)
self.assertEqual(response.data['user']['email'], 'test@example.com')

# Avoid: Generic assertions
self.assertTrue(response.status_code < 400)
self.assertIsNotNone(response.data)
```

### 5. Error Testing
```python
def test_invalid_data_returns_400(self):
    """Test that invalid data returns 400 status."""
    data = {'invalid': 'data'}
    response = self.client.post('/api/endpoint/', data)
    self.assertEqual(response.status_code, 400)
    self.assertIn('errors', response.data)
```

## Debugging Tests

### Running Single Tests
```bash
# Run specific test with verbose output
docker-compose exec vivre_backend python manage.py test profiles.tests.AuthenticationViewsTests.test_user_registration --verbosity=2

# Run with debug output
docker-compose exec vivre_backend python manage.py test --debug-mode profiles.tests.AuthenticationViewsTests.test_user_registration
```

### Test Database
- Tests use a separate test database
- Database is created and destroyed for each test run
- Use `--keepdb` to preserve test database between runs

```bash
# Keep test database between runs
docker-compose exec vivre_backend python manage.py test --keepdb
```

### Debugging Failed Tests
```python
def test_debug_example(self):
    """Example of debugging test failures."""
    response = self.client.get('/api/endpoint/')
    
    # Print response for debugging
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")
    
    # Use pdb for interactive debugging
    import pdb; pdb.set_trace()
    
    self.assertEqual(response.status_code, 200)
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
      - name: Run tests
        run: |
          docker-compose exec vivre_backend python manage.py test
          docker-compose exec vivre_backend coverage run --source='.' manage.py test
          docker-compose exec vivre_backend coverage report
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure all test files are in the correct location
   - Check that imports use relative paths correctly

2. **Database Issues**
   - Ensure migrations are up to date
   - Check that test database is properly configured

3. **Authentication Issues**
   - Use `force_authenticate()` for API tests
   - Ensure JWT tokens are properly configured

4. **URL Resolution**
   - Check that URL names are correct in `reverse()` calls
   - Ensure URL patterns are properly configured

### Performance Tips

1. **Use `setUp()` efficiently**
   - Create common test data once
   - Use `setUpClass()` for expensive operations

2. **Minimize database queries**
   - Use `select_related()` and `prefetch_related()` when needed
   - Avoid N+1 query problems

3. **Use appropriate test base classes**
   - Use `TestCase` for model tests
   - Use `APITestCase` for API tests
   - Use `TransactionTestCase` only when needed
