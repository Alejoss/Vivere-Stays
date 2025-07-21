import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from faker import Faker

fake = Faker()

@pytest.fixture
def api_client():
    """Return an API client for testing."""
    return APIClient()

@pytest.fixture
def user():
    """Create and return a test user."""
    return User.objects.create_user(
        username=fake.user_name(),
        email=fake.email(),
        password='testpass123'
    )

@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.fixture
def admin_user():
    """Create and return a test admin user."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )

@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an authenticated API client with admin user."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client 