from django.db import models
from django.utils import timezone
from django.conf import settings


class UnifiedReservations(models.Model):
    """
    Mirrors SQLAlchemy model core.unified_reservations

    Notes:
    - Django does not support composite primary keys; using a surrogate PK and
      enforcing uniqueness via unique_together on (reservation_id, property).
    - Original schema uses PostgreSQL schema "core"; Django does not natively
      handle schemas in db_table. If you need the core schema, configure
      DATABASES/OPTIONS["options"] search_path or a DB router/migration.
    """

    # Primary identifiers (unique together)
    reservation_id = models.CharField(max_length=255)
    property = models.ForeignKey(
        'dynamic_pricing.Property',
        on_delete=models.CASCADE,
        db_column='property_id',
        related_name='reservations',
    )

    # Other fields
    pms_source = models.CharField(max_length=255)
    pms_hotel_id = models.CharField(max_length=255)
    booking_id = models.CharField(max_length=255)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    total_guests = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=255)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        managed = settings.MANAGE_EXTERNAL_SCHEMA_TABLES  # Use dedicated setting for external schema tables
        db_table = 'unified_reservations'
        unique_together = (
            ('reservation_id', 'property'),
        )
        indexes = [
            models.Index(fields=['reservation_id']),
            models.Index(fields=['property']),
            models.Index(fields=['pms_source']),
            models.Index(fields=['checkin_date']),
            models.Index(fields=['checkout_date']),
        ]

    def __str__(self) -> str:
        return f"Reservation {self.reservation_id} / Property {self.property_id}"


class DailyPerformance(models.Model):
    """
    Mirrors SQLAlchemy model core.daily_performance

    Composite key equivalent via unique_together on
    (property, pms_source, kpi_date, metric_type).
    """

    property = models.ForeignKey(
        'dynamic_pricing.Property',
        on_delete=models.CASCADE,
        db_column='property_id',
        related_name='daily_performance',
    )
    pms_source = models.CharField(max_length=255)
    kpi_date = models.DateField()
    metric_type = models.CharField(max_length=255)

    total_units = models.IntegerField(default=0)
    available_units = models.IntegerField(default=0)
    units_reserved = models.IntegerField(default=0)
    total_guests = models.IntegerField(default=0)
    guests_reserved = models.IntegerField(default=0)
    daily_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_bookings = models.IntegerField(default=0)
    total_room_nights = models.IntegerField(default=0)
    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    revpar = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    adr = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        managed = settings.MANAGE_EXTERNAL_SCHEMA_TABLES  # Use dedicated setting for external schema tables
        db_table = 'daily_performance'
        unique_together = (
            ('property', 'pms_source', 'kpi_date', 'metric_type'),
        )
        indexes = [
            models.Index(fields=['property', 'kpi_date']),
            models.Index(fields=['pms_source']),
            models.Index(fields=['metric_type']),
        ]

    def __str__(self) -> str:
        return f"Perf {self.property_id} {self.kpi_date} {self.metric_type}"

# Create your models here.
