from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create a superuser if it does not exist'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            default='admin',
            help='Username for the superuser (default: admin)'
        )
        parser.add_argument(
            '--email',
            default='admin@viverestays.com',
            help='Email for the superuser (default: admin@viverestays.com)'
        )
        parser.add_argument(
            '--password',
            default='admin123',
            help='Password for the superuser (default: admin123)'
        )

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username, email, password)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Superuser "{username}" created successfully!'
                )
            )
            self.stdout.write(
                f'Email: {email}\nPassword: {password}'
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Superuser "{username}" already exists.'
                )
            ) 