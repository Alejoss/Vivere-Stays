from django.contrib import admin
from .models import UnifiedReservations, DailyPerformance


@admin.register(UnifiedReservations)
class UnifiedReservationsAdmin(admin.ModelAdmin):
    list_display = ('reservation_id', 'property', 'pms_source', 'checkin_date', 'checkout_date', 'price', 'status')
    list_filter = ('pms_source', 'status', 'checkin_date', 'checkout_date')
    search_fields = ('reservation_id', 'booking_id', 'pms_hotel_id', 'property__name')
    date_hierarchy = 'checkin_date'
    readonly_fields = ('last_updated',)
    ordering = ('-checkin_date',)


@admin.register(DailyPerformance)
class DailyPerformanceAdmin(admin.ModelAdmin):
    list_display = ('property', 'pms_source', 'kpi_date', 'metric_type', 'occupancy_rate', 'daily_revenue', 'total_bookings')
    list_filter = ('pms_source', 'metric_type', 'kpi_date')
    search_fields = ('property__name', 'pms_source', 'metric_type')
    date_hierarchy = 'kpi_date'
    readonly_fields = ('last_updated',)
    ordering = ('-kpi_date',)
