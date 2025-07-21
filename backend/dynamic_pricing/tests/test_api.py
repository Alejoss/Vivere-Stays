import pytest
from django.urls import reverse
from rest_framework import status
from faker import Faker

fake = Faker()

@pytest.mark.api
class TestPropertyAPI:
    """Test cases for Property API endpoints."""
    
    def test_create_property_success(self, authenticated_client):
        """Test successful property creation."""
        url = reverse('dynamic_pricing:property-create')
        data = {
            'name': fake.company(),
            'booking_hotel_url': 'https://www.booking.com/hotel/example.html',
            'street_address': fake.street_address(),
            'city': fake.city(),
            'country': fake.country(),
            'postal_code': fake.postcode()
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'property' in response.data
        assert response.data['property']['name'] == data['name']
        assert response.data['property']['city'] == data['city']
    
    def test_create_property_missing_required_fields(self, authenticated_client):
        """Test property creation with missing required fields."""
        url = reverse('dynamic_pricing:property-create')
        data = {
            'name': fake.company(),
            # Missing required fields
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'errors' in response.data
    
    def test_list_properties(self, authenticated_client):
        """Test listing properties."""
        url = reverse('dynamic_pricing:property-list')
        
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'properties' in response.data
        assert 'count' in response.data
    
    def test_get_property_detail(self, authenticated_client):
        """Test getting property details."""
        # First create a property
        create_url = reverse('dynamic_pricing:property-create')
        property_data = {
            'name': fake.company(),
            'booking_hotel_url': 'https://www.booking.com/hotel/example.html',
            'street_address': fake.street_address(),
            'city': fake.city(),
            'country': fake.country(),
            'postal_code': fake.postcode()
        }
        create_response = authenticated_client.post(create_url, property_data, format='json')
        property_id = create_response.data['property']['id']
        
        # Get property details
        detail_url = reverse('dynamic_pricing:property-detail', kwargs={'property_id': property_id})
        response = authenticated_client.get(detail_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'property' in response.data
        assert response.data['property']['id'] == property_id
    
    def test_update_property(self, authenticated_client):
        """Test updating property."""
        # First create a property
        create_url = reverse('dynamic_pricing:property-create')
        property_data = {
            'name': fake.company(),
            'booking_hotel_url': 'https://www.booking.com/hotel/example.html',
            'street_address': fake.street_address(),
            'city': fake.city(),
            'country': fake.country(),
            'postal_code': fake.postcode()
        }
        create_response = authenticated_client.post(create_url, property_data, format='json')
        property_id = create_response.data['property']['id']
        
        # Update property
        update_url = reverse('dynamic_pricing:property-update', kwargs={'property_id': property_id})
        update_data = {
            'state_province': 'NY',
            'latitude': 40.7128,
            'longitude': -74.0060
        }
        response = authenticated_client.put(update_url, update_data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['property']['state_province'] == 'NY'
        assert response.data['property']['latitude'] == 40.7128
    
    def test_update_property_pms(self, authenticated_client):
        """Test updating property PMS."""
        # First create a property
        create_url = reverse('dynamic_pricing:property-create')
        property_data = {
            'name': fake.company(),
            'booking_hotel_url': 'https://www.booking.com/hotel/example.html',
            'street_address': fake.street_address(),
            'city': fake.city(),
            'country': fake.country(),
            'postal_code': fake.postcode()
        }
        create_response = authenticated_client.post(create_url, property_data, format='json')
        property_id = create_response.data['property']['id']
        
        # Update PMS
        pms_url = reverse('dynamic_pricing:property-pms', kwargs={'property_id': property_id})
        pms_data = {'pms_name': 'apaleo'}
        response = authenticated_client.put(pms_url, pms_data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['property']['pms_name'] == 'apaleo'
        assert 'pms_change' in response.data
    
    def test_delete_property(self, authenticated_client):
        """Test soft deleting property."""
        # First create a property
        create_url = reverse('dynamic_pricing:property-create')
        property_data = {
            'name': fake.company(),
            'booking_hotel_url': 'https://www.booking.com/hotel/example.html',
            'street_address': fake.street_address(),
            'city': fake.city(),
            'country': fake.country(),
            'postal_code': fake.postcode()
        }
        create_response = authenticated_client.post(create_url, property_data, format='json')
        property_id = create_response.data['property']['id']
        
        # Delete property
        delete_url = reverse('dynamic_pricing:property-delete', kwargs={'property_id': property_id})
        response = authenticated_client.delete(delete_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
    
    def test_unauthorized_access(self, api_client):
        """Test unauthorized access to protected endpoints."""
        url = reverse('dynamic_pricing:property-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED 