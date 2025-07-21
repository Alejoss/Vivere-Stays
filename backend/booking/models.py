from django.db import models
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class PriceHistory(models.Model):
    """
    Model representing price history data for hotel bookings.
    Maps to booking.price_history table.
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
    b_blocks_b_price_breakdown_simplified_b_strikethrough_price_amount = models.FloatField(null=True, blank=True)
    b_blocks_b_book_now_pay_later = models.BooleanField(null=True, blank=True)
    b_blocks_b_price_breakdown_simplified_b_headline_price_amount = models.FloatField()
    b_blocks_b_price_breakdown_simplified_b_vm_products = models.JSONField(default=list, blank=True)
    b_blocks_b_price_breakdown_simplified_b_reward_credit_amount = models.FloatField(null=True, blank=True)
    b_blocks_b_stay_prices_b_price = models.CharField(max_length=255)
    b_blocks_b_stay_prices_b_local_price = models.FloatField()
    b_blocks_b_stay_prices_b_raw_price = models.FloatField(null=True, blank=True)
    b_blocks_b_stay_prices_b_stays = models.IntegerField()
    b_blocks_b_stay_prices_b_price_per_night = models.CharField(max_length=255)
    as_of = models.DateTimeField()
    region = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'booking.price_history'
        unique_together = [
            'hotel_id', 'checkin_date', 'checkout_date', 'b_id', 
            'b_roomtype_id', 'b_blocks_b_block_id', 'b_blocks_b_cancellation_type', 
            'b_blocks_b_stay_prices_b_stays', 'as_of'
        ]
        managed = False  # Since this is an existing table

    def __str__(self):
        return f"{self.hotel_name} - {self.checkin_date} to {self.checkout_date} - {self.as_of}"

    def save(self, *args, **kwargs):
        logger.info(f"Saving price history for hotel {self.hotel_id} from {self.checkin_date} to {self.checkout_date}")
        super().save(*args, **kwargs)


class Competitor(models.Model):
    """
    Model representing competitor hotels for price monitoring.
    Maps to booking.competitors table.
    """
    competitor_id = models.CharField(max_length=255)
    competitor_name = models.CharField(max_length=255)
    booking_link = models.URLField()
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    daily_num_days = models.IntegerField(default=15)
    weekly_num_days = models.IntegerField(default=90)
    bimonthly_num_days = models.IntegerField(default=180)
    quarterly_num_days = models.IntegerField(default=365)
    first_cutoff_hour_cet = models.IntegerField(default=11)
    second_cutoff_hour_cet = models.IntegerField(default=17)
    region = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'booking.competitors'
        unique_together = ['competitor_id', 'valid_from']
        managed = False  # Since this is an existing table

    def __str__(self):
        return f"{self.competitor_name} ({self.competitor_id}) - Valid from {self.valid_from}"

    def save(self, *args, **kwargs):
        logger.info(f"Saving competitor {self.competitor_id} with validity from {self.valid_from}")
        super().save(*args, **kwargs)

    @property
    def is_currently_valid(self):
        """Check if this competitor configuration is currently valid."""
        from django.utils import timezone
        now = timezone.now()
        return self.valid_from <= now and (self.valid_to is None or self.valid_to > now)
