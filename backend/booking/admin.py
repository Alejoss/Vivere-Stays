from django.contrib import admin
from .models import PriceHistory

# Register your models here.
# Competitor admin has been moved to dynamic_pricing app

# Note: PriceHistory is unmanaged (external schema) - only for read operations
# @admin.register(PriceHistory)
# class PriceHistoryAdmin(admin.ModelAdmin):
#     list_display = ['hotel_name', 'checkin_date', 'checkout_date', 'b_name', 'b_blocks_b_price', 'as_of']
#     list_filter = ['checkin_date', 'checkout_date', 'as_of', 'region']
#     search_fields = ['hotel_name', 'hotel_id', 'b_name']
#     readonly_fields = ['as_of']
#     ordering = ['-as_of']
#     
#     fieldsets = (
#         ('Hotel Information', {
#             'fields': ('hotel_id', 'hotel_name', 'region')
#         }),
#         ('Booking Details', {
#             'fields': ('checkin_date', 'checkout_date', 'b_id', 'b_roomtype_id', 'b_name')
#         }),
#         ('Price Information', {
#             'fields': ('b_blocks_b_price', 'b_blocks_b_raw_price', 'b_blocks_b_headline_price_amount')
#         }),
#         ('Timing', {
#             'fields': ('as_of',)
#         }),
#     )
