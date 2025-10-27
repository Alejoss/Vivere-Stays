from django.test import TestCase
from unittest import skipIf
from django.contrib.auth.models import User
from django.conf import settings
from booking.models import PriceHistory
from test_utils import create_test_user, create_test_property


class BookingModelTests(TestCase):
    """Test cases for Booking models."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_test_user()
        self.property = create_test_property()
    
    @skipIf(not settings.DEBUG, "PriceHistory model uses external schema - skip in production")
    def test_price_history_creation(self):
        """Test PriceHistory model creation."""
        price_history = PriceHistory.objects.create(
            hotel_id=self.property.id,
            hotel_name=self.property.name,
            checkin_date='2024-01-15',
            checkout_date='2024-01-17',
            b_id=12345,
            b_roomtype_id=67890,
            b_name='Standard Room',
            b_has_room_inventory=True,
            b_blocks_b_block_id='block_001',
            b_blocks_b_raw_price=150.00,
            b_blocks_b_cancellation_type='free',
            b_blocks_b_max_persons=2,
            b_blocks_b_price='€150.00',
            b_blocks_b_rate_is_genius=False,
            b_blocks_b_nr_stays=1,
            b_blocks_b_price_breakdown_simplified_b_headline_price_amount=150.00,
            b_blocks_b_stay_prices_b_price='€150.00',
            b_blocks_b_stay_prices_b_local_price=150.00,
            b_blocks_b_stay_prices_b_stays=1,
            b_blocks_b_stay_prices_b_price_per_night='€150.00',
            as_of='2024-01-01T10:00:00Z',
            region='Europe'
        )
        
        self.assertEqual(str(price_history), f"{self.property.name} - 2024-01-15 to 2024-01-17 - 2024-01-01T10:00:00Z")
        self.assertEqual(price_history.hotel_id, self.property.id)
        self.assertEqual(price_history.b_has_room_inventory, True)
        self.assertEqual(price_history.b_blocks_b_raw_price, 150.00)
    
    @skipIf(not settings.DEBUG, "PriceHistory model uses external schema - skip in production")
    def test_price_history_string_representation(self):
        """Test PriceHistory string representation."""
        price_history = PriceHistory.objects.create(
            hotel_id='test_hotel_001',
            hotel_name='Test Hotel',
            checkin_date='2024-01-15',
            checkout_date='2024-01-17',
            b_id=12345,
            b_roomtype_id=67890,
            b_name='Standard Room',
            b_has_room_inventory=True,
            b_blocks_b_block_id='block_001',
            b_blocks_b_raw_price=150.00,
            b_blocks_b_cancellation_type='free',
            b_blocks_b_max_persons=2,
            b_blocks_b_price='€150.00',
            b_blocks_b_rate_is_genius=False,
            b_blocks_b_nr_stays=1,
            b_blocks_b_price_breakdown_simplified_b_headline_price_amount=150.00,
            b_blocks_b_stay_prices_b_price='€150.00',
            b_blocks_b_stay_prices_b_local_price=150.00,
            b_blocks_b_stay_prices_b_stays=1,
            b_blocks_b_stay_prices_b_price_per_night='€150.00',
            as_of='2024-01-01T10:00:00Z',
            region='Europe'
        )
        
        expected_string = "Test Hotel - 2024-01-15 to 2024-01-17 - 2024-01-01T10:00:00Z"
        self.assertEqual(str(price_history), expected_string)
    
    @skipIf(not settings.DEBUG, "PriceHistory model uses external schema - skip in production")
    def test_price_history_optional_fields(self):
        """Test PriceHistory with optional fields."""
        price_history = PriceHistory.objects.create(
            hotel_id='test_hotel_002',
            hotel_name='Test Hotel 2',
            checkin_date='2024-01-20',
            checkout_date='2024-01-22',
            los_message='Minimum 2 nights stay required',
            min_los=2,
            sold_out_message='No rooms available',
            b_id=54321,
            b_roomtype_id=98765,
            b_name='Deluxe Room',
            b_has_room_inventory=False,
            b_blocks_b_block_id='block_002',
            b_blocks_b_raw_price=200.00,
            b_blocks_b_mealplan_included_name='Breakfast included',
            b_blocks_b_cancellation_type='non_refundable',
            b_blocks_b_max_persons=4,
            b_blocks_b_price='€200.00',
            b_blocks_b_rate_is_genius=True,
            b_blocks_b_nr_stays=2,
            b_blocks_b_price_breakdown_simplified_b_excluded_charges_amount=25.00,
            b_blocks_b_price_breakdown_simplified_b_tax_exception=0.00,
            b_blocks_b_price_breakdown_simplified_b_strikethrough_price_amount=250.00,
            b_blocks_b_book_now_pay_later=True,
            b_blocks_b_price_breakdown_simplified_b_headline_price_amount=200.00,
            b_blocks_b_price_breakdown_simplified_b_vm_products=[],
            b_blocks_b_price_breakdown_simplified_b_reward_credit_amount=10.00,
            b_blocks_b_stay_prices_b_price='€200.00',
            b_blocks_b_stay_prices_b_local_price=200.00,
            b_blocks_b_stay_prices_b_raw_price=200.00,
            b_blocks_b_stay_prices_b_stays=2,
            b_blocks_b_stay_prices_b_price_per_night='€100.00',
            as_of='2024-01-02T14:30:00Z',
            region='North America'
        )
        
        self.assertEqual(price_history.los_message, 'Minimum 2 nights stay required')
        self.assertEqual(price_history.min_los, 2)
        self.assertEqual(price_history.sold_out_message, 'No rooms available')
        self.assertEqual(price_history.b_has_room_inventory, False)
        self.assertEqual(price_history.b_blocks_b_mealplan_included_name, 'Breakfast included')
        self.assertEqual(price_history.b_blocks_b_rate_is_genius, True)
        self.assertEqual(price_history.b_blocks_b_book_now_pay_later, True)
