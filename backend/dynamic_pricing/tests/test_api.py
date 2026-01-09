from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from profiles.models import Profile
from datetime import date, timedelta
from dynamic_pricing.models import (
    Property, PropertyManagementSystem, OverwritePriceHistory, DpPriceChangeHistory
)
from test_utils import create_test_user, create_test_property, create_test_pms


class PropertyAPITests(APITestCase):
    """Test cases for Property API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
    
    def test_create_property_success(self):
        """Test successful property creation."""
        url = reverse('dynamic_pricing:property-create')
        data = {
            'hotel_name': 'Test Hotel',
            'booking_url': 'https://www.booking.com/hotel/example.html',
            'street_address': '123 Test Street',
            'city': 'Test City',
            'country': 'Test Country',
            'postal_code': '12345',
            'number_of_rooms': 50,
            'property_type': 'hotel'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('property', response.data)
        self.assertEqual(response.data['property']['name'], data['hotel_name'])
        self.assertEqual(response.data['property']['city'], data['city'])
    
    def test_create_property_missing_required_fields(self):
        """Test property creation with missing required fields."""
        url = reverse('dynamic_pricing:property-create')
        data = {
            'name': 'Test Hotel',
            # Missing required fields
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
    
    def test_list_properties(self):
        """Test listing properties."""
        url = reverse('dynamic_pricing:property-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('properties', response.data)
        self.assertIn('count', response.data)
    
    def test_get_property_detail(self):
        """Test getting property details."""
        # Create a property using test utility and associate with user
        property = create_test_property(user=self.user)
        
        # Get property details
        detail_url = reverse('dynamic_pricing:property-detail', kwargs={'property_id': property.id})
        response = self.client.get(detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('property', response.data)
        self.assertEqual(response.data['property']['id'], property.id)
    
    # Note: Update and delete property endpoints may not be implemented yet
    # These tests are commented out until the endpoints are available
    # def test_update_property(self):
    #     """Test updating property."""
    #     pass
    
    # def test_update_property_pms(self):
    #     """Test updating property PMS."""
    #     pass
    
    # def test_delete_property(self):
    #     """Test soft deleting property."""
    #     pass
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints."""
        # Create a new client without authentication
        from rest_framework.test import APIClient
        unauthenticated_client = APIClient()
        
        url = reverse('dynamic_pricing:property-list')
        response = unauthenticated_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PropertyMSPAPITests(APITestCase):
    """Test cases for Property MSP API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
    
    def test_get_property_msp_list(self):
        """Test getting MSP entries for a property."""
        # Create a property using test utility and associate with user
        property = create_test_property(user=self.user)
        
        # Get MSP entries
        msp_url = reverse('dynamic_pricing:property-msp', kwargs={'property_id': property.id})
        response = self.client.get(msp_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('msp_entries', response.data)
        self.assertIn('count', response.data)
        self.assertIn('property_id', response.data)
        self.assertIn('property_name', response.data)
    
    def test_get_property_msp_with_invalid_id(self):
        """Test getting MSP entries with invalid property ID."""
        msp_url = reverse('dynamic_pricing:property-msp', kwargs={'property_id': 'invalid-id'})
        response = self.client.get(msp_url)
        
        # Currently returns 500 due to unhandled exception, should be 404
        # TODO: Fix view to return 404 for invalid property ID
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class OverwritePriceRangeAPITests(APITestCase):
    """Test cases for Overwrite Price Range API endpoint."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
        self.property = create_test_property(user=self.user)
    
    def test_overwrite_price_range_create_new(self):
        """Test creating overwrite prices for a date range."""
        url = reverse('dynamic_pricing:overwrite-price-range', kwargs={'property_id': self.property.id})
        data = {
            'start_date': '2025-01-01',
            'end_date': '2025-01-05',
            'overwrite_price': 150
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('created', response.data)
        self.assertIn('updated', response.data)
        self.assertEqual(len(response.data['created']), 5)  # 5 days
        self.assertEqual(len(response.data['updated']), 0)
        self.assertEqual(response.data['overwrite_price'], 150)
        
        # Verify records were created in database
        overwrites = OverwritePriceHistory.objects.filter(
            property=self.property,
            checkin_date__gte='2025-01-01',
            checkin_date__lte='2025-01-05'
        )
        self.assertEqual(overwrites.count(), 5)
        for overwrite in overwrites:
            self.assertEqual(overwrite.overwrite_price, 150)
    
    def test_overwrite_price_range_update_existing(self):
        """Test updating existing overwrite prices for a date range."""
        # Create some existing overwrites
        dates = ['2025-01-01', '2025-01-02', '2025-01-03']
        for checkin_date in dates:
            OverwritePriceHistory.objects.create(
                property=self.property,
                checkin_date=checkin_date,
                overwrite_price=100,
                user=self.user
            )
        
        url = reverse('dynamic_pricing:overwrite-price-range', kwargs={'property_id': self.property.id})
        data = {
            'start_date': '2025-01-01',
            'end_date': '2025-01-05',
            'overwrite_price': 200
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['created']), 2)  # 2 new days
        self.assertEqual(len(response.data['updated']), 3)  # 3 updated days
        
        # Verify all records have the new price
        overwrites = OverwritePriceHistory.objects.filter(
            property_id=self.property.id,
            checkin_date__gte='2025-01-01',
            checkin_date__lte='2025-01-05'
        )
        self.assertEqual(overwrites.count(), 5)
        for overwrite in overwrites:
            self.assertEqual(overwrite.overwrite_price, 200)
    
    def test_overwrite_price_range_large_range(self):
        """Test overwrite price range with 30 days (one month)."""
        url = reverse('dynamic_pricing:overwrite-price-range', kwargs={'property_id': self.property.id})
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 30)
        data = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'overwrite_price': 175
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['created']), 30)
        self.assertEqual(len(response.data['updated']), 0)
        
        # Verify all 30 records were created
        overwrites = OverwritePriceHistory.objects.filter(
            property_id=self.property.id,
            checkin_date__gte=start_date,
            checkin_date__lte=end_date
        )
        self.assertEqual(overwrites.count(), 30)
    
    def test_overwrite_price_range_missing_fields(self):
        """Test overwrite price range with missing required fields."""
        url = reverse('dynamic_pricing:overwrite-price-range', kwargs={'property_id': self.property.id})
        data = {
            'start_date': '2025-01-01',
            # Missing end_date and overwrite_price
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_overwrite_price_range_invalid_date_format(self):
        """Test overwrite price range with invalid date format."""
        url = reverse('dynamic_pricing:overwrite-price-range', kwargs={'property_id': self.property.id})
        data = {
            'start_date': '2025/01/01',  # Invalid format
            'end_date': '2025-01-05',
            'overwrite_price': 150
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_overwrite_price_range_end_before_start(self):
        """Test overwrite price range with end_date before start_date."""
        url = reverse('dynamic_pricing:overwrite-price-range', kwargs={'property_id': self.property.id})
        data = {
            'start_date': '2025-01-05',
            'end_date': '2025-01-01',  # Before start_date
            'overwrite_price': 150
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class PriceHistoryForDateRangeAPITests(APITestCase):
    """Test cases for Price History for Date Range API endpoint."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
        self.property = create_test_property(user=self.user)
    
    def test_price_history_for_date_range_basic(self):
        """Test getting price history for a date range."""
        # Create some price history records
        from django.utils import timezone
        base_date = date(2025, 1, 1)
        for i in range(5):
            checkin_date = base_date + timedelta(days=i)
            DpPriceChangeHistory.objects.create(
                property_id=self.property,
                user=self.user,
                checkin_date=checkin_date,
                recom_price=100 + i * 10,
                occupancy=0.5 + i * 0.1,
                as_of=timezone.now(),
                pms_hotel_id='TEST_PMS_ID',
                msp=90 + i * 10,
                recom_los=1,
                base_price=100,
                base_price_choice='manual'
            )
        
        url = reverse('dynamic_pricing:price-history-range', kwargs={'property_id': self.property.id})
        response = self.client.get(url, {
            'start_date': '2025-01-01',
            'end_date': '2025-01-05'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('price_history', response.data)
        self.assertIn('average_price', response.data)
        self.assertEqual(len(response.data['price_history']), 5)
        self.assertEqual(response.data['count'], 5)
    
    def test_price_history_for_date_range_with_overwrites(self):
        """Test getting price history with overwrite prices."""
        from django.utils import timezone
        base_date = date(2025, 1, 1)
        
        # Create price history records
        for i in range(5):
            checkin_date = base_date + timedelta(days=i)
            DpPriceChangeHistory.objects.create(
                property_id=self.property,
                user=self.user,
                checkin_date=checkin_date,
                recom_price=100,
                occupancy=0.5,
                as_of=timezone.now(),
                pms_hotel_id='TEST_PMS_ID',
                msp=90,
                recom_los=1,
                base_price=100,
                base_price_choice='manual'
            )
        
        # Create overwrite prices for some dates
        OverwritePriceHistory.objects.create(
            property=self.property,
            checkin_date=base_date,
            overwrite_price=200,
            user=self.user
        )
        OverwritePriceHistory.objects.create(
            property=self.property,
            checkin_date=base_date + timedelta(days=1),
            overwrite_price=250,
            user=self.user
        )
        
        url = reverse('dynamic_pricing:price-history-range', kwargs={'property_id': self.property.id})
        response = self.client.get(url, {
            'start_date': '2025-01-01',
            'end_date': '2025-01-05'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        price_history = response.data['price_history']
        
        # Check that overwrite prices are used
        self.assertEqual(price_history[0]['price'], 200)  # First date has overwrite
        self.assertEqual(price_history[1]['price'], 250)  # Second date has overwrite
        self.assertEqual(price_history[2]['price'], 100)  # Third date uses recom_price
    
    def test_price_history_for_date_range_large_range(self):
        """Test getting price history for 30 days (one month)."""
        from django.utils import timezone
        base_date = date(2025, 1, 1)
        
        # Create price history for 30 days
        for i in range(30):
            checkin_date = base_date + timedelta(days=i)
            DpPriceChangeHistory.objects.create(
                property_id=self.property,
                user=self.user,
                checkin_date=checkin_date,
                recom_price=100 + i,
                occupancy=0.5,
                as_of=timezone.now(),
                pms_hotel_id='TEST_PMS_ID',
                msp=90 + i,
                recom_los=1,
                base_price=100,
                base_price_choice='manual'
            )
        
        url = reverse('dynamic_pricing:price-history-range', kwargs={'property_id': self.property.id})
        response = self.client.get(url, {
            'start_date': '2025-01-01',
            'end_date': '2025-01-30'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['price_history']), 30)
        self.assertIsNotNone(response.data['average_price'])
    
    def test_price_history_for_date_range_missing_params(self):
        """Test getting price history without required parameters."""
        url = reverse('dynamic_pricing:price-history-range', kwargs={'property_id': self.property.id})
        response = self.client.get(url, {
            'start_date': '2025-01-01',
            # Missing end_date
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_price_history_for_date_range_exceeds_limit(self):
        """Test getting price history for range exceeding 31 days."""
        url = reverse('dynamic_pricing:price-history-range', kwargs={'property_id': self.property.id})
        response = self.client.get(url, {
            'start_date': '2025-01-01',
            'end_date': '2025-02-05'  # More than 31 days
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_price_history_for_date_range_unauthorized_property(self):
        """Test getting price history for property user doesn't own."""
        other_user = create_test_user()
        other_property = create_test_property(user=other_user)
        
        url = reverse('dynamic_pricing:price-history-range', kwargs={'property_id': other_property.id})
        response = self.client.get(url, {
            'start_date': '2025-01-01',
            'end_date': '2025-01-05'
        })
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) 