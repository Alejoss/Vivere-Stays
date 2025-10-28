from django.db import models
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class PriceHistory(models.Model):
    """
    Model representing price history data for hotel bookings.
    
    NOTE: This model represents a table managed by an external schema/system.
    Django will NOT create/modify this table structure (managed=False).
    Only for read operations and foreign key relationships.
    """
    hotel_id = models.CharField(max_length=255)
    hotel_name = models.CharField(max_length=255)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    los_message = models.CharField(max_length=500, null=True, blank=True)
    min_los = models.IntegerField(null=True, blank=True)
    sold_out_message = models.CharField(max_length=500, null=True, blank=True)
    b_id = models.IntegerField()
    b_roomtype_id = models.IntegerField()
    b_name = models.CharField(max_length=255)
    b_has_room_inventory = models.BooleanField()
    b_blocks_b_block_id = models.CharField(max_length=255)
    b_blocks_b_raw_price = models.FloatField()
    b_blocks_b_mealplan_included_name = models.CharField(max_length=255, null=True, blank=True)
    b_blocks_b_cancellation_type = models.CharField(max_length=255)
    b_blocks_b_max_persons = models.IntegerField()
    b_blocks_b_price = models.CharField(max_length=255)
    b_blocks_b_rate_is_genius = models.BooleanField()
    b_blocks_b_nr_stays = models.IntegerField()
    b_blocks_b_price_breakdown_simplified_b_excluded_charges_amount = models.FloatField(null=True, blank=True)
    b_blocks_b_price_breakdown_simplified_b_tax_exception = models.FloatField(null=True, blank=True)
    b_blocks_b_price_breakdown_simplified_b_strikethrough_price_amount = models.FloatField(null=True, blank=True, db_column='b_strike_price_amt')
    b_blocks_b_book_now_pay_later = models.BooleanField(null=True, blank=True)
    b_blocks_b_price_breakdown_simplified_b_headline_price_amount = models.FloatField(db_column='b_headline_price_amt')
    b_blocks_b_price_breakdown_simplified_b_vm_products = models.JSONField(default=list, blank=True, db_column='b_vm_products')
    b_blocks_b_price_breakdown_simplified_b_reward_credit_amount = models.FloatField(null=True, blank=True, db_column='b_reward_credit_amt')
    b_blocks_b_stay_prices_b_price = models.CharField(max_length=255)
    b_blocks_b_stay_prices_b_local_price = models.FloatField()
    b_blocks_b_stay_prices_b_raw_price = models.FloatField(null=True, blank=True)
    b_blocks_b_stay_prices_b_stays = models.IntegerField()
    b_blocks_b_stay_prices_b_price_per_night = models.CharField(max_length=255)
    as_of = models.DateTimeField()
    region = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = settings.MANAGE_EXTERNAL_SCHEMA_TABLES  # Use dedicated setting for external schema tables
        db_table = 'booking.price_history'
        unique_together = [
            'hotel_id', 'checkin_date', 'checkout_date', 'b_id', 
            'b_roomtype_id', 'b_blocks_b_block_id', 'b_blocks_b_cancellation_type', 
            'b_blocks_b_stay_prices_b_stays', 'as_of'
        ]

    def __str__(self):
        return f"{self.hotel_name} - {self.checkin_date} to {self.checkout_date} - {self.as_of}"

    def save(self, *args, **kwargs):
        logger.info(f"Saving price history for hotel {self.hotel_id} from {self.checkin_date} to {self.checkout_date}")
        super().save(*args, **kwargs)

