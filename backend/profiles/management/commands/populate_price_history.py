from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random
from profiles.models import Profile
from dynamic_pricing.models import DpPriceChangeHistory, Property


class Command(BaseCommand):
    help = 'Populate DpPriceChangeHistory table with dummy data for the past 100 days'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No records will be created'))
        
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
                # Check if property already has price history data
                existing_records = DpPriceChangeHistory.objects.filter(property_id=property_obj.id)
                
                if existing_records.exists():
                    self.stdout.write(f"    Skipping property '{property_obj.name}' - already has {existing_records.count()} price history records")
                    total_properties_skipped += 1
                    continue
                
                self.stdout.write(f"    Processing property: {property_obj.name}")
                total_properties_processed += 1
                
                # Generate data for the past 100 days
                end_date = timezone.now().date()
                start_date = end_date - timedelta(days=99)  # 100 days total
                
                records_to_create = []
                
                for i in range(100):
                    checkin_date = start_date + timedelta(days=i)
                    
                    # Generate random occupancy (0-100)
                    occupancy = random.uniform(0, 100)
                    
                    # Base MSP around $200 (150-250 range)
                    msp = random.randint(150, 250)
                    
                    # Recommended price is 1.5x MSP
                    recom_price = int(msp * 1.5)
                    
                    # Overwrite price is null most of the time, occasionally 2x MSP
                    overwrite_price = None
                    if random.random() < 0.1:  # 10% chance of having overwrite price
                        overwrite_price = msp * 2
                    
                    # For now, set other fields equal to MSP
                    recom_los = msp
                    overwrite_los = None
                    base_price = msp
                    base_price_choice = random.choice(['competitor', 'manual'])
                    
                    # Create timestamp for as_of (spread across the day)
                    hour = random.randint(0, 23)
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    as_of = datetime.combine(checkin_date, datetime.min.time()) + timedelta(
                        hours=hour, minutes=minute, seconds=second
                    )
                    as_of = timezone.make_aware(as_of)
                    
                    if not dry_run:
                        record = DpPriceChangeHistory(
                            property_id=property_obj,
                            pms_hotel_id=property_obj.pms_hotel_id or f"PMS_{property_obj.id}",
                            checkin_date=checkin_date,
                            as_of=as_of,
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
                
                if not dry_run:
                    # Bulk create all records for this property
                    DpPriceChangeHistory.objects.bulk_create(records_to_create)
                    total_records_created += len(records_to_create)
                    self.stdout.write(f"      Created {len(records_to_create)} price history records")
                else:
                    self.stdout.write(f"      Would create {100} price history records")
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("SUMMARY:")
        self.stdout.write(f"  Properties processed: {total_properties_processed}")
        self.stdout.write(f"  Properties skipped (already had data): {total_properties_skipped}")
        self.stdout.write(f"  Total records {'would be created' if dry_run else 'created'}: {total_records_created}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to actually create the records.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nSuccessfully populated price history data!'))
