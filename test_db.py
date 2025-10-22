#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/app')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vivere_stays.settings')
django.setup()

from django.db import connections
from django.conf import settings

def test_database_connection():
    print("=== Database Configuration ===")
    print(f"Environment: {getattr(settings, 'ENVIRONMENT', 'Not set')}")
    print(f"Use Remote DB: {getattr(settings, 'USE_REMOTE_DB', 'Not set')}")
    
    db_config = settings.DATABASES['default']
    print(f"Host: {db_config['HOST']}")
    print(f"Port: {db_config['PORT']}")
    print(f"Database: {db_config['NAME']}")
    print(f"User: {db_config['USER']}")
    
    ssl_mode = db_config.get('OPTIONS', {}).get('sslmode', 'Not set')
    print(f"SSL Mode: {ssl_mode}")
    
    try:
        conn = connections['default']
        conn.ensure_connection()
        print("✓ Database connection successful!")
        
        with conn.cursor() as cursor:
            # Test basic query
            cursor.execute("SELECT version()")
            version = cursor.fetchone()[0]
            print(f"PostgreSQL Version: {version}")
            
            # Check available schemas
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            """)
            schemas = [row[0] for row in cursor.fetchall()]
            print(f"Available schemas: {', '.join(schemas)}")
            
            # Check if required schemas exist
            required_schemas = ['webapp_backend', 'booking', 'core', 'public']
            missing_schemas = [schema for schema in required_schemas if schema not in schemas]
            if missing_schemas:
                print(f"⚠ Missing schemas: {', '.join(missing_schemas)}")
            else:
                print("✓ All required schemas present")
            
            # Test permissions on each schema
            for schema in required_schemas:
                if schema in schemas:
                    try:
                        # Test if we can query tables in this schema
                        cursor.execute(f"""
                            SELECT table_name 
                            FROM information_schema.tables 
                            WHERE table_schema = '{schema}' 
                            LIMIT 1
                        """)
                        tables = cursor.fetchall()
                        if tables:
                            print(f"✓ Schema '{schema}' has tables and is accessible")
                        else:
                            print(f"⚠ Schema '{schema}' exists but has no tables")
                    except Exception as e:
                        print(f"✗ Error accessing schema '{schema}': {str(e)}")
                        
    except Exception as e:
        print(f"✗ Database connection failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    test_database_connection()
