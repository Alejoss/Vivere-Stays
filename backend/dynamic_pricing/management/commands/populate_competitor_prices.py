from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random
from dynamic_pricing.models import Property, DpPropertyCompetitor, DpHistoricalCompetitorPrice
from booking.models import Competitor

class Command(BaseCommand):
    help = 'Populate DpHistoricalCompetitorPrice with dummy data for each Property and 3 competitors (100 years before and after today)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records'
        )
        parser.add_argument(
            '--delete-existing',
            action='store_true',
            help='Delete all existing DpHistoricalCompetitorPrice and DpPropertyCompetitor records before populating new data'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_existing = options.get('delete_existing', False)

        if delete_existing:
            if not dry_run:
                self.stdout.write(self.style.WARNING('Deleting all existing DpHistoricalCompetitorPrice and DpPropertyCompetitor records...'))
                DpHistoricalCompetitorPrice.objects.all().delete()
                DpPropertyCompetitor.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('All DpHistoricalCompetitorPrice and DpPropertyCompetitor records deleted.'))
            else:
                self.stdout.write(self.style.WARNING('DRY RUN: Would delete all DpHistoricalCompetitorPrice and DpPropertyCompetitor records.'))

        today = timezone.now().date()
        properties = Property.objects.all()
        self.stdout.write(f"Found {properties.count()} properties")

        total_competitors_created = 0
        total_prices_created = 0
        for property_obj in properties:
            self.stdout.write(f"\nProcessing property: {property_obj.name}")
            competitors = []
            for i in range(3):
                comp_name = f"Competitor {i+1} for {property_obj.name}"
                comp, created = Competitor.objects.get_or_create(
                    competitor_id=f"{property_obj.id}_comp_{i+1}",
                    defaults={
                        'competitor_name': comp_name,
                        'booking_link': '',
                        'valid_from': timezone.now(),
                        'valid_to': None,
                    }
                )
                competitors.append(comp)
                if created:
                    total_competitors_created += 1
                # Link property and competitor
                if not dry_run:
                    DpPropertyCompetitor.objects.get_or_create(
                        property_id=property_obj,
                        competitor_id=comp
                    )
            # For each competitor, create price history
            for comp in competitors:
                records_to_create = []
                # 100 days before today
                for i in range(100, 0, -1):
                    checkin_date = today - timedelta(days=i)
                    price = random.randint(50, 300)
                    record = DpHistoricalCompetitorPrice(
                        competitor=comp,
                        hotel_name=comp.competitor_name,
                        room_name="Standard Room",
                        checkin_date=checkin_date,
                        checkout_date=checkin_date + timedelta(days=1),
                        raw_price=price,
                        currency="USD",
                        cancellation_type="Free",
                        max_persons=2,
                        min_los=1,
                        sold_out_message=None,
                        taking_reservations=True,
                        scrape_date=checkin_date,
                        is_available=1,
                        num_days=1,
                        price=price,
                        update_tz=timezone.now(),
                    )
                    records_to_create.append(record)
                # 100 days after today
                for i in range(0, 100):
                    checkin_date = today + timedelta(days=i)
                    price = random.randint(50, 300)
                    record = DpHistoricalCompetitorPrice(
                        competitor=comp,
                        hotel_name=comp.competitor_name,
                        room_name="Standard Room",
                        checkin_date=checkin_date,
                        checkout_date=checkin_date + timedelta(days=1),
                        raw_price=price,
                        currency="USD",
                        cancellation_type="Free",
                        max_persons=2,
                        min_los=1,
                        sold_out_message=None,
                        taking_reservations=True,
                        scrape_date=checkin_date,
                        is_available=1,
                        num_days=1,
                        price=price,
                        update_tz=timezone.now(),
                    )
                    records_to_create.append(record)
                if not dry_run:
                    DpHistoricalCompetitorPrice.objects.bulk_create(records_to_create, batch_size=1000)
                    total_prices_created += len(records_to_create)
                else:
                    total_prices_created += len(records_to_create)
                self.stdout.write(f"  {'Would create' if dry_run else 'Created'} {len(records_to_create)} price records for competitor {comp.competitor_name}")
        self.stdout.write("\n" + "="*50)
        self.stdout.write("SUMMARY:")
        self.stdout.write(f"  Competitors created: {total_competitors_created}")
        self.stdout.write(f"  Price records {'would be created' if dry_run else 'created'}: {total_prices_created}")
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to actually create the records.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nSuccessfully populated competitor price data!'))
