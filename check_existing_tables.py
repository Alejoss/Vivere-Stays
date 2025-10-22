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

def check_existing_tables():
    print("=== Checking Existing Tables ===")
    
    try:
        conn = connections['default']
        with conn.cursor() as cursor:
            # Check existing tables in all schemas
            cursor.execute("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema IN ('public', 'webapp_backend', 'booking', 'core')
                ORDER BY table_schema, table_name
            """)
            
            tables = cursor.fetchall()
            if tables:
                print("Existing tables:")
                current_schema = None
                for schema, table in tables:
                    if schema != current_schema:
                        print(f"\n--- {schema.upper()} SCHEMA ---")
                        current_schema = schema
                    print(f"  - {table}")
            else:
                print("No tables found in any schema")
                
            # Check specifically for Django tables
            cursor.execute("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name LIKE 'django_%' OR table_name LIKE 'auth_%'
                ORDER BY table_schema, table_name
            """)
            
            django_tables = cursor.fetchall()
            if django_tables:
                print(f"\n=== DJANGO TABLES FOUND ===")
                for schema, table in django_tables:
                    print(f"  {schema}.{table}")
            else:
                print("\n=== NO DJANGO TABLES FOUND ===")
                
    except Exception as e:
        print(f"✗ Error: {str(e)}")

if __name__ == "__main__":
    check_existing_tables()
