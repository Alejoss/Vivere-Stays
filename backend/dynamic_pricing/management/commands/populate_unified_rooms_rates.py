from django.core.management.base import BaseCommand
from django.utils import timezone
import random
from profiles.models import Profile
from dynamic_pricing.models import Property, UnifiedRoomsAndRates


class Command(BaseCommand):
    help = 'Populate UnifiedRoomsAndRates table with dummy data similar to frontend example'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records'
        )
        parser.add_argument(
            '--delete-existing',
            action='store_true',
            help='Delete all existing UnifiedRoomsAndRates records before populating new data'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_existing = options.get('delete_existing', False)

        if delete_existing:
            if not dry_run:
                self.stdout.write(self.style.WARNING('Deleting all existing UnifiedRoomsAndRates records...'))
                UnifiedRoomsAndRates.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('All UnifiedRoomsAndRates records deleted.'))
            else:
                self.stdout.write(self.style.WARNING('DRY RUN: Would delete all UnifiedRoomsAndRates records.'))

        # Sample room and rate data similar to frontend example
        room_templates = [
            {
                'room_id': 'ROOM001',
                'room_name': 'Standard Double',
                'room_description': 'Comfortable double room with modern amenities',
                'rates': [
                    {
                        'rate_id': 'RATE001',
                        'rate_name': 'Flexible Rate',
                        'rate_category': 'Flexible',
                        'rate_description': 'Fully flexible booking with free cancellation',
                        'is_base_rate': True
                    }
                ]
            },
            {
                'room_id': 'ROOM002',
                'room_name': 'Deluxe Room',
                'room_description': 'Spacious deluxe room with premium features',
                'rates': [
                    {
                        'rate_id': 'RATE002',
                        'rate_name': 'Premium Rate',
                        'rate_category': 'Non-refundable',
                        'rate_description': 'Non-refundable rate with better pricing',
                        'is_base_rate': False
                    },
                    {
                        'rate_id': 'RATE002B',
                        'rate_name': 'Premium Flexible',
                        'rate_category': 'Flexible',
                        'rate_description': 'Flexible premium rate option',
                        'is_base_rate': False
                    }
                ]
            },
            {
                'room_id': 'ROOM003',
                'room_name': 'Suite',
                'room_description': 'Luxurious suite with separate living area',
                'rates': [
                    {
                        'rate_id': 'RATE003',
                        'rate_name': 'Luxury Rate',
                        'rate_category': 'Advance Purchase',
                        'rate_description': 'Advance purchase rate for luxury suite',
                        'is_base_rate': False
                    },
                    {
                        'rate_id': 'RATE003B',
                        'rate_name': 'Suite Flexible',
                        'rate_category': 'Flexible',
                        'rate_description': 'Flexible booking for suite accommodation',
                        'is_base_rate': False
                    }
                ]
            },
            {
                'room_id': 'ROOM004',
                'room_name': 'Family Room',
                'room_description': 'Spacious family room accommodating up to 4 guests',
                'rates': [
                    {
                        'rate_id': 'RATE004',
                        'rate_name': 'Family Rate',
                        'rate_category': 'Advance Purchase',
                        'rate_description': 'Special rate for family bookings',
                        'is_base_rate': False
                    }
                ]
            },
            {
                'room_id': 'ROOM005',
                'room_name': 'Executive Room',
                'room_description': 'Executive room with business amenities',
                'rates': [
                    {
                        'rate_id': 'RATE005',
                        'rate_name': 'Executive Rate',
                        'rate_category': 'Flexible',
                        'rate_description': 'Flexible rate for business travelers',
                        'is_base_rate': False
                    }
                ]
            }
        ]

        # Additional room variations for variety
        additional_rooms = [
            {
                'room_id': 'ROOM006',
                'room_name': 'Twin Room',
                'room_description': 'Twin beds room perfect for friends traveling together',
                'rates': [
                    {
                        'rate_id': 'RATE006',
                        'rate_name': 'Twin Rate',
                        'rate_category': 'Non-refundable',
                        'rate_description': 'Non-refundable twin room rate',
                        'is_base_rate': False
                    }
                ]
            },
            {
                'room_id': 'ROOM007',
                'room_name': 'Single Room',
                'room_description': 'Compact single room for solo travelers',
                'rates': [
                    {
                        'rate_id': 'RATE007',
                        'rate_name': 'Single Rate',
                        'rate_category': 'Advance Purchase',
                        'rate_description': 'Advance purchase single room rate',
                        'is_base_rate': False
                    }
                ]
            }
        ]

        # Get all profiles
        profiles = Profile.objects.all()
        self.stdout.write(f"Found {profiles.count()} profiles")

        total_properties_processed = 0
        total_records_created = 0

        for profile in profiles:
            self.stdout.write(f"\nProcessing profile: {profile.user.email}")
            # Get properties for this profile
            properties = profile.properties.all()
            self.stdout.write(f"  Found {properties.count()} properties")
            
            for property_obj in properties:
                self.stdout.write(f"    Processing property: {property_obj.name}")
                total_properties_processed += 1
                records_to_create = []

                # Determine PMS source based on property's PMS
                pms_source = 'mrplan'  # Default
                if property_obj.pms:
                    pms_name = property_obj.pms.name.lower()
                    if 'apaleo' in pms_name:
                        pms_source = 'apaleo'
                    elif 'avirato' in pms_name:
                        pms_source = 'avirato'
                    elif 'mrplan' in pms_name:
                        pms_source = 'mrplan'

                # Use base room templates plus some additional rooms
                all_rooms = room_templates.copy()
                if random.random() < 0.7:  # 70% chance to add additional rooms
                    num_additional = random.randint(1, min(3, len(additional_rooms)))
                    all_rooms.extend(random.sample(additional_rooms, num_additional))

                # Ensure only one rate per property is marked as base
                base_rate_assigned = False

                for room_template in all_rooms:
                    for rate_template in room_template['rates']:
                        # Only assign one base rate per property
                        if rate_template['is_base_rate'] and not base_rate_assigned:
                            is_base_rate = True
                            base_rate_assigned = True
                        else:
                            is_base_rate = False

                        if not dry_run:
                            record = UnifiedRoomsAndRates(
                                property_id=property_obj,
                                user=profile.user,
                                pms_source=pms_source,
                                pms_hotel_id=property_obj.pms_hotel_id or f"PMS_{property_obj.id}",
                                room_id=room_template['room_id'],
                                rate_id=rate_template['rate_id'],
                                room_name=room_template['room_name'],
                                room_description=room_template['room_description'],
                                rate_name=rate_template['rate_name'],
                                rate_description=rate_template['rate_description'],
                                rate_category=rate_template['rate_category'],
                                last_updated=timezone.now()
                            )
                            records_to_create.append(record)
                        else:
                            total_records_created += 1

                if not dry_run and records_to_create:
                    UnifiedRoomsAndRates.objects.bulk_create(records_to_create)
                    total_records_created += len(records_to_create)
                    self.stdout.write(f"      Created {len(records_to_create)} unified room/rate records")
                elif dry_run and records_to_create:
                    self.stdout.write(f"      Would create {len(records_to_create)} unified room/rate records")

        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("SUMMARY:")
        self.stdout.write(f"  Properties processed: {total_properties_processed}")
        self.stdout.write(f"  Total records {'would be created' if dry_run else 'created'}: {total_records_created}")
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to actually create the records.'))
        else:
            self.stdout.write(self.style.SUCCESS('\nSuccessfully populated unified rooms and rates data!'))
