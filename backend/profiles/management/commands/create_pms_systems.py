from django.core.management.base import BaseCommand
from dynamic_pricing.models import PropertyManagementSystem


class Command(BaseCommand):
    help = 'Create the 4 Property Management Systems: MrPlan, Apaleo, RoomRaccoon, Avirato'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records'
        )
        parser.add_argument(
            '--delete-existing',
            action='store_true',
            help='Delete all existing PMSIntegrationRequirement records before creating new ones'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_existing = options.get('delete_existing', False)

        # Define the PMS systems to create
        pms_systems = [
            {
                'name': 'MrPlan'
            },
            {
                'name': 'Apaleo'
            },
            {
                'name': 'RoomRaccoon'
            },
            {
                'name': 'Avirato'
            }
        ]

        if delete_existing:
            if not dry_run:
                self.stdout.write(self.style.WARNING('Deleting all existing PropertyManagementSystem records...'))
                PropertyManagementSystem.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('All PropertyManagementSystem records deleted.'))
            else:
                self.stdout.write(self.style.WARNING('DRY RUN: Would delete all PropertyManagementSystem records.'))

        created_count = 0
        skipped_count = 0

        for pms_data in pms_systems:
            name = pms_data['name']
            
            # Check if PMS already exists
            if PropertyManagementSystem.objects.filter(name=name).exists():
                self.stdout.write(f'PMS "{name}" already exists, skipping...')
                skipped_count += 1
                continue

            if not dry_run:
                PropertyManagementSystem.objects.create(**pms_data)
                self.stdout.write(self.style.SUCCESS(f'Created PMS: {name}'))
                created_count += 1
            else:
                self.stdout.write(f'DRY RUN: Would create PMS: {name}')
                created_count += 1

        if dry_run:
            self.stdout.write(f'\nDRY RUN SUMMARY:')
            self.stdout.write(f'- Would create: {created_count} PMS systems')
            self.stdout.write(f'- Would skip: {skipped_count} existing PMS systems')
        else:
            self.stdout.write(f'\nSUMMARY:')
            self.stdout.write(f'- Created: {created_count} PMS systems')
            self.stdout.write(f'- Skipped: {skipped_count} existing PMS systems')
            self.stdout.write(self.style.SUCCESS('PMS systems setup completed successfully!'))
