from django.core.management.base import BaseCommand
from django.db import connections
from django.conf import settings
import sys

class Command(BaseCommand):
    help = 'Test database connection and display configuration'

    def handle(self, *args, **options):
        db_config = settings.DATABASES['default']
        
        self.stdout.write(self.style.SUCCESS('=== Database Configuration ==='))
        self.stdout.write(f"Environment: {getattr(settings, 'ENVIRONMENT', 'Not set')}")
        self.stdout.write(f"Use Remote DB: {getattr(settings, 'USE_REMOTE_DB', 'Not set')}")
        self.stdout.write(f"Host: {db_config['HOST']}")
        self.stdout.write(f"Port: {db_config['PORT']}")
        self.stdout.write(f"Database: {db_config['NAME']}")
        self.stdout.write(f"User: {db_config['USER']}")
        
        # Check if SSL is configured
        ssl_mode = db_config.get('OPTIONS', {}).get('sslmode', 'Not set')
        self.stdout.write(f"SSL Mode: {ssl_mode}")
        
        try:
            conn = connections['default']
            conn.ensure_connection()
            self.stdout.write(self.style.SUCCESS('✓ Database connection successful!'))
            
            with conn.cursor() as cursor:
                # Test basic query
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                self.stdout.write(f"PostgreSQL Version: {version}")
                
                # Check available schemas
                cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')")
                schemas = [row[0] for row in cursor.fetchall()]
                self.stdout.write(f"Available schemas: {', '.join(schemas)}")
                
                # Check if required schemas exist
                required_schemas = ['webapp_backend', 'booking', 'core', 'public']
                missing_schemas = [schema for schema in required_schemas if schema not in schemas]
                if missing_schemas:
                    self.stdout.write(self.style.WARNING(f"Missing schemas: {', '.join(missing_schemas)}"))
                else:
                    self.stdout.write(self.style.SUCCESS("✓ All required schemas present"))
                
                # Test table access in each schema
                for schema in required_schemas:
                    if schema in schemas:
                        try:
                            cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}' LIMIT 1")
                            tables = cursor.fetchall()
                            if tables:
                                self.stdout.write(f"✓ Schema '{schema}' has tables")
                            else:
                                self.stdout.write(f"⚠ Schema '{schema}' exists but has no tables")
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f"✗ Error accessing schema '{schema}': {str(e)}"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Database connection failed: {str(e)}'))
            self.stdout.write(self.style.ERROR('Please check your database configuration and credentials.'))
            sys.exit(1)
