from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random
from profiles.models import Profile
from dynamic_pricing.models import DpPriceChangeHistory, Property
from django.db.models import Q


class Command(BaseCommand):
    help = 'Populate DpPriceChangeHistory table with dummy data for the past 100 days'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records'
        )
        parser.add_argument(
            '--delete-existing',
            action='store_true',
            help='Delete all existing DpPriceChangeHistory records before populating new data'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_existing = options.get('delete_existing', False)

        if delete_existing:
            if not dry_run:
                self.stdout.write(self.style.WARNING('Deleting all existing DpPriceChangeHistory records...'))
                DpPriceChangeHistory.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('All DpPriceChangeHistory records deleted.'))
            else:
                self.stdout.write(self.style.WARNING('DRY RUN: Would delete all DpPriceChangeHistory records.'))

        # Use the same as_of for all records in this run
        as_of_now = timezone.now()

        # Get all profiles
        profiles = Profile.objects.all()
        self.stdout.write(f"Found {profiles.count()} profiles")

        total_properties_processed = 0
        total_properties_skipped = 0
        total_records_created = 0

        for profile in profiles:
            self.stdout.write(f"\nProcessing profile: {profile.user.email}")
            # Get properties for this profile
            properties = profile.properties.all()
            self.stdout.write(f"  Found {properties.count()} properties")
            for property_obj in properties:
                # Remove old logic for skipping if already has records
                self.stdout.write(f"    Processing property: {property_obj.name}")
                total_properties_processed += 1
                records_to_create = []

                today = timezone.now().date()
                # 100 days in the past (ending yesterday)
                for i in range(100, 0, -1):
                    checkin_date = today - timedelta(days=i)
                    occupancy = random.uniform(0, 100)
                    msp = random.randint(150, 250)
                    recom_price = int(msp * 1.5)
                    overwrite_price = None
                    if random.random() < 0.1:
                        overwrite_price = random.randint(msp, msp * 2)
                    recom_los = msp
                    overwrite_los = None
                    base_price = msp
                    base_price_choice = random.choice(['competitor', 'manual'])
                    if not dry_run:
                        record = DpPriceChangeHistory(
                            property_id=property_obj,
                            user=profile.user,
                            pms_hotel_id=property_obj.pms_hotel_id or f"PMS_{property_obj.id}",
                            checkin_date=checkin_date,
                            as_of=as_of_now,
                            occupancy=occupancy,
                            msp=msp,
                            recom_price=recom_price,
                            overwrite_price=overwrite_price,
                            recom_los=recom_los,
                            overwrite_los=overwrite_los,
                            base_price=base_price,
                            base_price_choice=base_price_choice
                        )
                        records_to_create.append(record)
                    else:
                        total_records_created += 1
                # 100 days in the future (starting today)
                for i in range(0, 100):
                    checkin_date = today + timedelta(days=i)
                    occupancy = random.uniform(0, 100)
                    msp = random.randint(150, 250)
                    recom_price = int(msp * 1.5)
                    overwrite_price = None
                    if random.random() < 0.1:
                        overwrite_price = random.randint(msp, msp * 2)
                    recom_los = msp
                    overwrite_los = None
                    base_price = msp
                    base_price_choice = random.choice(['competitor', 'manual'])
                    if not dry_run:
                        record = DpPriceChangeHistory(
                            property_id=property_obj,
                            user=profile.user,
                            pms_hotel_id=property_obj.pms_hotel_id or f"PMS_{property_obj.id}",
                            checkin_date=checkin_date,
                            as_of=as_of_now,
                            occupancy=occupancy,
                            msp=msp,
                            recom_price=recom_price,
                            overwrite_price=overwrite_price,
                            recom_los=recom_los,
                            overwrite_los=overwrite_los,
                            base_price=base_price,
                            base_price_choice=base_price_choice
                        )
                        records_to_create.append(record)
                    else:
                        total_records_created += 1
                if not dry_run and records_to_create:
                    DpPriceChangeHistory.objects.bulk_create(records_to_create)
                    total_records_created += len(records_to_create)
                    self.stdout.write(f"      Created {len(records_to_create)} price history records")
                elif dry_run and records_to_create:
                    self.stdout.write(f"      Would create {len(records_to_create)} price history records")
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("SUMMARY:")
        self.stdout.write(f"  Properties processed: {total_properties_processed}")
        self.stdout.write(f"  Total records {'would be created' if dry_run else 'created'}: {total_records_created}")
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to actually create the records.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nSuccessfully populated price history data!'))
