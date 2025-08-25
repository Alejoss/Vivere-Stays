import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

from analytics.models import DailyPerformance
from dynamic_pricing.models import Property


class Command(BaseCommand):
    help = "Seed DailyPerformance records for a property over a date range."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--property-id",
            dest="property_id",
            default=None,
            help="If provided, only seed this Property ID (dynamic_pricing.Property.id). Otherwise, seed all properties.",
        )
        parser.add_argument(
            "--property-name",
            dest="property_name",
            default="Demo Property",
            help="Property name (used only if the property needs to be created)",
        )
        parser.add_argument(
            "--rooms",
            dest="rooms",
            type=int,
            default=100,
            help="Total rooms (used only if the property needs to be created)",
        )
        parser.add_argument(
            "--pms-source",
            dest="pms_source",
            default="demo_pms",
            help="PMS source string",
        )
        # Deprecated: we now generate all metric types (actual, prev_year_actual, bob, prev_year_bob)
        parser.add_argument(
            "--metric-type",
            dest="metric_type",
            default=None,
            help="Deprecated; ignored. Command now seeds all metric types.",
        )
        parser.add_argument(
            "--start",
            dest="start",
            default=date(2025, 8, 1).isoformat(),
            help="Start date (YYYY-MM-DD). Default: 2025-08-01",
        )
        parser.add_argument(
            "--days",
            dest="days",
            type=int,
            default=None,
            help="Number of sequential days to seed. Default: computed to today from --start",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing DailyPerformance rows that would conflict",
        )
        parser.add_argument(
            "--delete-existing",
            action="store_true",
            help="Alias for --overwrite: delete existing rows in the range before seeding",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Compute but do not write any database rows",
        )

    def handle(self, *args, **options):
        property_id: str | None = options.get("property_id")
        property_name: str = options["property_name"]
        rooms: int = options["rooms"]
        pms_source: str = options["pms_source"]
        metric_type: str | None = options["metric_type"]
        start_str: str = options["start"]
        days: int = options["days"]
        overwrite: bool = options.get("overwrite", False) or options.get("delete_existing", False)
        dry_run: bool = options["dry_run"]

        start_date = date.fromisoformat(start_str)
        if days is None:
            days = (date.today() - start_date).days + 1
        dates = [start_date + timedelta(days=i) for i in range(days) if start_date + timedelta(days=i) <= date.today()]

        # Determine properties to process
        if property_id:
            props_qs = Property.objects.filter(id=property_id)
            if not props_qs.exists():
                # Optionally create if single target not found
                prop, created_prop = Property.objects.get_or_create(
                    id=property_id,
                    defaults={
                        "name": property_name,
                        "number_of_rooms": rooms,
                    },
                )
                props_qs = Property.objects.filter(id=prop.id)
                if created_prop:
                    self.stdout.write(self.style.WARNING(f"Created Property {prop.id} - {prop.name} (rooms={prop.number_of_rooms})"))
        else:
            props_qs = Property.objects.all()

        total_created = 0
        total_skipped = 0
        total_deleted = 0
        properties_processed = 0

        for prop in props_qs.iterator():
            properties_processed += 1
            total_units = prop.number_of_rooms or rooms

            to_create: list[DailyPerformance] = []
            created = 0
            skipped = 0
            deleted = 0

            with transaction.atomic():
                if overwrite:
                    delete_qs = DailyPerformance.objects.filter(
                        property=prop,
                        pms_source=pms_source,
                        kpi_date__in=dates,
                    )
                    deleted = delete_qs.count()
                    if not dry_run:
                        delete_qs.delete()
                    else:
                        self.stdout.write(self.style.WARNING(f"DRY RUN: Would delete {deleted} rows for property={prop.id}"))

                # Track existing rows per metric type to avoid duplicates if not overwriting
                existing_map: dict[str, set[date]] = {}
                if not overwrite:
                    for mt in ("actual", "prev_year_actual", "bob", "prev_year_bob"):
                        existing = DailyPerformance.objects.filter(
                            property=prop,
                            pms_source=pms_source,
                            metric_type=mt,
                            kpi_date__in=dates,
                        ).values_list("kpi_date", flat=True)
                        existing_map[mt] = set(existing)

                # Generate for all required metric types with controlled differences
                metric_types = ("actual", "prev_year_actual", "bob", "prev_year_bob")
                for d in dates:
                    # Base plausible metrics for the day
                    base_occ = random.uniform(0.50, 0.88)
                    base_adr = Decimal(str(round(random.uniform(85, 160), 2)))
                    for mt in metric_types:
                        if not overwrite and mt in existing_map and d in existing_map[mt]:
                            skipped += 1
                            continue

                        # Adjust occupancy/ADR slightly per metric to produce realistic deltas
                        if mt == "actual":
                            occ = base_occ
                            adr = base_adr
                        elif mt == "prev_year_actual":
                            occ = max(0.30, min(0.98, base_occ * random.uniform(0.9, 0.98)))
                            adr = (base_adr * Decimal(str(random.uniform(0.9, 0.98)))).quantize(Decimal("0.01"))
                        elif mt == "bob":
                            occ = max(0.30, min(0.98, base_occ * random.uniform(1.00, 1.08)))
                            adr = (base_adr * Decimal(str(random.uniform(0.98, 1.06)))).quantize(Decimal("0.01"))
                        else:  # prev_year_bob
                            occ = max(0.30, min(0.98, base_occ * random.uniform(0.88, 0.96)))
                            adr = (base_adr * Decimal(str(random.uniform(0.88, 0.98)))).quantize(Decimal("0.01"))

                        units_reserved = int(round(total_units * occ))
                        available_units = total_units
                        total_room_nights = units_reserved
                        avg_guests = random.uniform(1.3, 2.2)
                        guests_reserved = int(round(units_reserved * avg_guests))
                        total_guests = guests_reserved
                        daily_revenue = (adr * Decimal(total_room_nights)).quantize(Decimal("0.01"))
                        revpar = (daily_revenue / Decimal(total_units)).quantize(Decimal("0.01")) if total_units else Decimal("0.00")
                        occupancy_rate = Decimal(str(round((units_reserved / available_units) * 100, 2))) if available_units else Decimal("0.00")

                        row = DailyPerformance(
                            property=prop,
                            pms_source=pms_source,
                            kpi_date=d,
                            metric_type=mt,
                            total_units=total_units,
                            available_units=available_units,
                            units_reserved=units_reserved,
                            total_guests=total_guests,
                            guests_reserved=guests_reserved,
                            daily_revenue=daily_revenue,
                            total_bookings=random.randint(5, 50),
                            total_room_nights=total_room_nights,
                            occupancy_rate=occupancy_rate,
                            revpar=revpar,
                            adr=adr,
                        )
                        to_create.append(row)

                created = len(to_create)
                if not dry_run and to_create:
                    DailyPerformance.objects.bulk_create(to_create, batch_size=500)

            total_created += created
            total_skipped += skipped
            total_deleted += deleted
            if created or skipped or deleted:
                self.stdout.write(f"Processed property {prop.id} - created={created}, skipped={skipped}, deleted={deleted}")

        # Summary output aligned with populate_price_history style
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("SUMMARY:")
        self.stdout.write(f"  Properties processed: {properties_processed}")
        self.stdout.write(f"  PMS source: {pms_source}")
        self.stdout.write("  Metric types: actual, prev_year_actual, bob, prev_year_bob")
        self.stdout.write(f"  Date range: {start_date} .. {dates[-1] if dates else start_date}")
        self.stdout.write(f"  Deleted existing: {total_deleted}")
        self.stdout.write(f"  Skipped existing: {total_skipped}")
        self.stdout.write(f"  Total rows {'would be created' if dry_run else 'created'}: {total_created}")
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to actually create the records.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nSuccessfully seeded DailyPerformance data!'))
