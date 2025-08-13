from django.contrib import admin
from .models import Competitor, PriceHistory

# Register your models here.

@admin.register(Competitor)
class CompetitorAdmin(admin.ModelAdmin):
    list_display = ['competitor_id', 'competitor_name', 'booking_link', 'valid_from', 'valid_to', 'is_currently_valid']
    list_filter = ['valid_from', 'valid_to', 'region']
    search_fields = ['competitor_id', 'competitor_name', 'booking_link']
    readonly_fields = ['competitor_id', 'valid_from', 'is_currently_valid']
    ordering = ['-valid_from']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('competitor_id', 'competitor_name', 'booking_link')
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_to', 'is_currently_valid')
        }),
        ('Configuration', {
            'fields': ('daily_num_days', 'weekly_num_days', 'bimonthly_num_days', 'quarterly_num_days')
        }),
        ('Timing', {
            'fields': ('first_cutoff_hour_cet', 'second_cutoff_hour_cet')
        }),
        ('Additional', {
            'fields': ('region',)
        }),
    )

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['hotel_name', 'checkin_date', 'checkout_date', 'b_name', 'b_blocks_b_price', 'as_of']
    list_filter = ['checkin_date', 'checkout_date', 'as_of', 'region']
    search_fields = ['hotel_name', 'hotel_id', 'b_name']
    readonly_fields = ['as_of']
    ordering = ['-as_of']
    
    fieldsets = (
        ('Hotel Information', {
            'fields': ('hotel_id', 'hotel_name', 'region')
        }),
        ('Booking Details', {
            'fields': ('checkin_date', 'checkout_date', 'b_id', 'b_roomtype_id', 'b_name')
        }),
        ('Price Information', {
            'fields': ('b_blocks_b_price', 'b_blocks_b_raw_price', 'b_blocks_b_headline_price_amount')
        }),
        ('Timing', {
            'fields': ('as_of',)
        }),
    )
