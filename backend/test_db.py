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
            
            # Check for price_change_history table specifically
            print("\n=== Checking price_change_history table ===")
            try:
                # Check if table exists in any schema
                cursor.execute("""
                    SELECT table_schema, table_name 
                    FROM information_schema.tables 
                    WHERE table_name = 'price_change_history'
                """)
                price_history_tables = cursor.fetchall()
                
                if price_history_tables:
                    for schema_name, table_name in price_history_tables:
                        print(f"✓ Found table '{table_name}' in schema '{schema_name}'")
                        
                        # Get table structure
                        cursor.execute(f"""
                            SELECT column_name, data_type, is_nullable, column_default
                            FROM information_schema.columns 
                            WHERE table_schema = '{schema_name}' 
                            AND table_name = '{table_name}'
                            ORDER BY ordinal_position
                        """)
                        columns = cursor.fetchall()
                        
                        print(f"  Table structure for {schema_name}.{table_name}:")
                        for col_name, data_type, nullable, default in columns:
                            null_str = "NULL" if nullable == "YES" else "NOT NULL"
                            default_str = f" DEFAULT {default}" if default else ""
                            print(f"    - {col_name}: {data_type} {null_str}{default_str}")
                        
                        # Check if it has any data
                        cursor.execute(f"SELECT COUNT(*) FROM {schema_name}.{table_name}")
                        row_count = cursor.fetchone()[0]
                        print(f"  Row count: {row_count}")
                        
                else:
                    print("✗ Table 'price_change_history' not found in any schema")
                    
                    # List all tables that might be similar
                    cursor.execute("""
                        SELECT table_schema, table_name 
                        FROM information_schema.tables 
                        WHERE table_name LIKE '%price%' OR table_name LIKE '%history%'
                        ORDER BY table_schema, table_name
                    """)
                    similar_tables = cursor.fetchall()
                    if similar_tables:
                        print("  Similar tables found:")
                        for schema_name, table_name in similar_tables:
                            print(f"    - {schema_name}.{table_name}")
                            
            except Exception as e:
                print(f"✗ Error checking price_change_history table: {str(e)}")
                        
    except Exception as e:
        print(f"✗ Database connection failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    test_database_connection()
