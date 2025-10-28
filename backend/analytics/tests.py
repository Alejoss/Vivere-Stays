from django.test import TestCase
from unittest import skipIf
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User
from django.conf import settings
from profiles.models import Profile
from analytics.models import UnifiedReservations, DailyPerformance
from test_utils import create_test_user, create_test_property


class AnalyticsAPITests(APITestCase):
    """Test cases for Analytics API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
        self.property = create_test_property(user=self.user)
    
    @skipIf(not settings.DEBUG, "Analytics API uses external schema models - skip in production")
    def test_analytics_summary(self):
        """Test analytics summary endpoint."""
        url = reverse('analytics:summary')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('charts', response.data)
        self.assertIn('adr', response.data['charts'])
        self.assertIn('revpar', response.data['charts'])
        self.assertIn('revenue', response.data['charts'])
    
    @skipIf(not settings.DEBUG, "Analytics API uses external schema models - skip in production")
    def test_analytics_pickup(self):
        """Test analytics pickup endpoint."""
        url = reverse('analytics:pickup')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('series', response.data)
        self.assertIn('totals', response.data)
        self.assertIn('days', response.data)
    
    @skipIf(not settings.DEBUG, "Analytics API uses external schema models - skip in production")
    def test_analytics_occupancy(self):
        """Test analytics occupancy endpoint."""
        url = reverse('analytics:occupancy')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('occupancy', response.data)
        self.assertIn('range', response.data)
        self.assertIn('left', response.data['occupancy'])
        self.assertIn('right', response.data['occupancy'])
    
    def test_analytics_unauthorized_access(self):
        """Test analytics endpoints without authentication."""
        from rest_framework.test import APIClient
        unauthenticated_client = APIClient()
        
        url = reverse('analytics:summary')
        response = unauthenticated_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AnalyticsModelTests(TestCase):
    """Test cases for Analytics models."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.property = create_test_property(user=self.user)
    
    @skipIf(not settings.DEBUG, "UnifiedReservations model uses external schema - skip in production")
    def test_unified_reservations_creation(self):
        """Test UnifiedReservations model creation."""
        reservation = UnifiedReservations.objects.create(
            reservation_id='test_res_001',
            property=self.property,
            pms_source='test_pms',
            pms_hotel_id='test_hotel_001',
            booking_id='booking_001',
            checkin_date='2024-01-15',
            checkout_date='2024-01-17',
            total_guests=2,
            price=150.00,
            status='confirmed'
        )
        
        self.assertEqual(str(reservation), 'test_res_001')
        self.assertEqual(reservation.property, self.property)
        self.assertEqual(reservation.status, 'confirmed')
    
    @skipIf(not settings.DEBUG, "DailyPerformance model uses external schema - skip in production")
    def test_daily_performance_creation(self):
        """Test DailyPerformance model creation."""
        performance = DailyPerformance.objects.create(
            property=self.property,
            pms_source='test_pms',
            kpi_date='2024-01-15',
            metric_type='daily',
            occupancy_rate=75.5,
            revpar=112.50,
            adr=150.00
        )
        
        self.assertEqual(performance.property, self.property)
        self.assertEqual(performance.occupancy_rate, 75.5)
        self.assertEqual(performance.revpar, 112.50)
