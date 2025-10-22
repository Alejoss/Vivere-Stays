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

def test_permissions():
    print("=== Testing Database Permissions ===")
    
    try:
        conn = connections['default']
        with conn.cursor() as cursor:
            # Test 1: Check current user
            cursor.execute("SELECT current_user, current_database()")
            user, db = cursor.fetchone()
            print(f"Current user: {user}")
            print(f"Current database: {db}")
            
            # Test 2: Check schema permissions
            cursor.execute("""
                SELECT 
                    schema_name,
                    has_schema_privilege(current_user, schema_name, 'USAGE') as can_use,
                    has_schema_privilege(current_user, schema_name, 'CREATE') as can_create
                FROM information_schema.schemata 
                WHERE schema_name IN ('webapp_backend', 'booking', 'core', 'public')
                ORDER BY schema_name
            """)
            
            print("\n=== Schema Permissions ===")
            for row in cursor.fetchall():
                schema, can_use, can_create = row
                print(f"Schema '{schema}': USAGE={can_use}, CREATE={can_create}")
            
            # Test 3: Try to create a test table in webapp_backend schema
            print("\n=== Testing Table Creation ===")
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS webapp_backend.test_permissions (
                        id SERIAL PRIMARY KEY,
                        test_field VARCHAR(50)
                    )
                """)
                print("✓ Can create tables in webapp_backend schema")
                
                # Clean up
                cursor.execute("DROP TABLE IF EXISTS webapp_backend.test_permissions")
                print("✓ Test table cleaned up")
                
            except Exception as e:
                print(f"✗ Cannot create tables in webapp_backend schema: {str(e)}")
            
            # Test 4: Check if we can create tables in public schema
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS public.test_permissions (
                        id SERIAL PRIMARY KEY,
                        test_field VARCHAR(50)
                    )
                """)
                print("✓ Can create tables in public schema")
                
                # Clean up
                cursor.execute("DROP TABLE IF EXISTS public.test_permissions")
                print("✓ Test table cleaned up")
                
            except Exception as e:
                print(f"✗ Cannot create tables in public schema: {str(e)}")
                
    except Exception as e:
        print(f"✗ Database connection failed: {str(e)}")

if __name__ == "__main__":
    test_permissions()
